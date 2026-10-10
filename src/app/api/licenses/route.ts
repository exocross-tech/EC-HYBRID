import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

function computeRenewalDate(start: Date, cycle: string): Date | null {
  if (cycle === "ONE_OFF" || cycle === "ONE_TIME") return null;
  const d = new Date(start);
  if (cycle === "MONTHLY") {
    d.setMonth(d.getMonth() + 1);
  } else if (cycle === "QUARTERLY") {
    d.setMonth(d.getMonth() + 3);
  } else if (cycle === "ANNUAL") {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    d.setFullYear(d.getFullYear() + 1);
  }
  return d;
}

function generateLicenseKey(productName: string): string {
  const slug = productName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .substring(0, 6) || "PROD";
  const year = new Date().getFullYear();
  const token = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `EC-${slug}-${year}-${token}`;
}

export async function GET(req: NextRequest) {
  const { error, status, user } = await requireAuth(["ADMIN", "MANAGER", "EMPLOYEE"]);
  if (error || !user) {
    return NextResponse.json({ error: error || "Unauthorized" }, { status: status || 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    const productId = searchParams.get("productId");
    const statusFilter = searchParams.get("status");
    const search = searchParams.get("search")?.trim().toLowerCase();

    let whereClause: any = {};
    if (clientId) whereClause.clientId = clientId;
    if (productId) whereClause.productId = productId;
    if (statusFilter && statusFilter !== "ALL") whereClause.status = statusFilter;

    const licenses = await prisma.productLicense.findMany({
      where: whereClause,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            company: true,
            email: true,
            phone: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();

    // Process live status and calculate daysRemaining
    const processedLicenses = licenses.map((lic) => {
      let liveStatus = lic.status;
      let daysRemaining: number | null = null;

      if (lic.billingModel === "SUBSCRIPTION" && lic.renewalDate) {
        const ren = new Date(lic.renewalDate);
        const diffMs = ren.getTime() - now.getTime();
        daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (lic.status !== "CANCELLED") {
          if (daysRemaining < 0) {
            liveStatus = "EXPIRED";
          } else if (daysRemaining <= 30) {
            liveStatus = "EXPIRING_SOON";
          } else {
            liveStatus = "ACTIVE";
          }
        }
      } else if (lic.billingModel === "ONE_TIME") {
        liveStatus = "ACTIVE";
      }

      return {
        ...lic,
        liveStatus,
        daysRemaining,
      };
    });

    // Apply search filter if provided
    const filtered = search
      ? processedLicenses.filter(
          (l) =>
            l.productName.toLowerCase().includes(search) ||
            l.licenseKey.toLowerCase().includes(search) ||
            l.client.company.toLowerCase().includes(search) ||
            l.client.name.toLowerCase().includes(search)
        )
      : processedLicenses;

    // Metrics calculation
    let totalDeployments = processedLicenses.length;
    let activeSubscriptions = 0;
    let mrr = 0;
    let renewalsDueSoon = 0;
    const expiringSoonList: any[] = [];

    for (const lic of processedLicenses) {
      if (lic.billingModel === "SUBSCRIPTION" && lic.liveStatus !== "EXPIRED" && lic.liveStatus !== "CANCELLED") {
        activeSubscriptions++;
        if (lic.billingCycle === "MONTHLY") mrr += lic.price;
        else if (lic.billingCycle === "QUARTERLY") mrr += lic.price / 3;
        else if (lic.billingCycle === "ANNUAL") mrr += lic.price / 12;
      }

      if (lic.billingModel === "SUBSCRIPTION" && lic.liveStatus === "EXPIRING_SOON") {
        renewalsDueSoon++;
        expiringSoonList.push(lic);
      }
    }

    const arr = Math.round(mrr * 12);
    mrr = Math.round(mrr);

    return NextResponse.json({
      licenses: filtered,
      metrics: {
        totalDeployments,
        activeSubscriptions,
        mrr,
        arr,
        renewalsDueSoon,
      },
      expiringSoonList,
    });
  } catch (err: any) {
    console.error("Fetch licenses error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch licenses" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { error, status, user } = await requireAuth(["ADMIN", "MANAGER"]);
  if (error || !user) {
    return NextResponse.json({ error: error || "Unauthorized" }, { status: status || 403 });
  }

  try {
    const body = await req.json();
    const {
      clientId,
      productId,
      productName,
      tier,
      deploymentUrl,
      billingModel,
      billingCycle,
      price,
      startDate,
      notes,
      autoInvoice,
    } = body;

    if (!clientId) {
      return NextResponse.json({ error: "Client is required" }, { status: 400 });
    }

    let finalProductName = productName ? productName.trim() : "";
    if (productId && !finalProductName) {
      const proj = await prisma.project.findUnique({ where: { id: productId } });
      if (proj) finalProductName = proj.name;
    }

    if (!finalProductName) {
      return NextResponse.json({ error: "Product name or linked product is required" }, { status: 400 });
    }

    const finalPrice = parseFloat(price);
    if (isNaN(finalPrice) || finalPrice < 0) {
      return NextResponse.json({ error: "Valid price is required" }, { status: 400 });
    }

    const start = startDate ? new Date(startDate) : new Date();
    const model = billingModel === "ONE_TIME" ? "ONE_TIME" : "SUBSCRIPTION";
    const cycle = model === "ONE_TIME" ? "ONE_OFF" : (billingCycle || "ANNUAL");
    const renewal = model === "SUBSCRIPTION" ? computeRenewalDate(start, cycle) : null;
    const licenseKey = generateLicenseKey(finalProductName);

    let createdInvoiceNum: string | null = null;

    // If autoInvoice requested, create standard invoice in system
    if (autoInvoice && finalPrice > 0) {
      const invoiceNumber = `INV-LIC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const taxRate = 0.18; // 18% standard GST
      const tax = Math.round(finalPrice * taxRate);
      const totalAmount = finalPrice + tax;
      const dueDate = renewal || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

      const inv = await prisma.invoice.create({
        data: {
          invoiceNumber,
          clientId,
          projectId: productId || null,
          description: `${model === "SUBSCRIPTION" ? `${cycle} Subscription License` : "One-Time Software License"}: ${finalProductName}`,
          amount: finalPrice,
          tax,
          totalAmount,
          dueDate,
          status: "SENT",
          items: JSON.stringify([
            {
              description: `${finalProductName} (${tier || "PRO"} Tier) - ${model === "SUBSCRIPTION" ? `${cycle} Subscription` : "Perpetual License"}`,
              quantity: 1,
              unitPrice: finalPrice,
              amount: finalPrice,
            },
          ]),
        },
      });
      createdInvoiceNum = inv.invoiceNumber;
    }

    const license = await prisma.productLicense.create({
      data: {
        clientId,
        productId: productId || null,
        productName: finalProductName,
        licenseKey,
        tier: tier || "PRO",
        deploymentUrl: deploymentUrl ? deploymentUrl.trim() : null,
        billingModel: model,
        billingCycle: cycle,
        price: finalPrice,
        startDate: start,
        renewalDate: renewal,
        status: "ACTIVE",
        notes: notes ? notes.trim() : null,
        invoiceNumber: createdInvoiceNum,
      },
      include: {
        client: true,
        project: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "PRODUCT_DEPLOYED",
        details: `Deployed product ${finalProductName} (${license.licenseKey}) to ${license.client.company} [${model} / ${cycle} @ ₹${finalPrice}]`,
      },
    });

    return NextResponse.json({ success: true, license }, { status: 201 });
  } catch (err: any) {
    console.error("Create license error:", err);
    return NextResponse.json({ error: err.message || "Failed to create license" }, { status: 500 });
  }
}
