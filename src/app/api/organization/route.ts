import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// GET /api/organization - Authenticated staff can view organization settings
export async function GET(req: NextRequest) {
  const { error, status } = await requireAuth(["ADMIN", "MANAGER", "HR", "EMPLOYEE"]);
  if (error) {
    return NextResponse.json({ error }, { status: status || 403 });
  }

  try {
    const org = await prisma.organizationSettings.upsert({
      where: { id: "default" },
      update: {},
      create: {
        id: "default",
        companyName: "EC HYBRID",
        legalEntityName: "EC HYBRID Enterprise Solutions Pvt. Ltd.",
        tagline: "All-in-One Enterprise Operations & Management Platform",
        logoUrl: "/logo.png",
        gstin: "29AABCE1234F1Z5",
        pan: "AABCE1234F",
        cin: "U72200KA2024PTC189201",
        addressLine1: "742 Innovation Tech Corridor",
        addressLine2: "Electronic City Phase 1",
        city: "Bangalore",
        state: "Karnataka",
        postalCode: "560100",
        country: "India",
        officialEmail: "contact@echybrid.com",
        financeEmail: "finance@echybrid.com",
        phone: "+91 (80) 4129-8800",
        website: "https://echybrid.com",
        bankName: "HDFC Bank Ltd.",
        bankBranch: "Electronic City Branch",
        accountName: "EC HYBRID ENTERPRISE SOLUTIONS PVT LTD",
        accountNumber: "50200084920192",
        ifscCode: "HDFC0000128",
        upiId: "echybrid@hdfcbank",
        defaultGSTRate: 18.0,
        taxRegime: "NEW",
        epfRate: 12.0,
        standardDeduction: 75000.0,
      },
    });

    return NextResponse.json({ organization: org });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT /api/organization - Admin only can update organizational settings
export async function PUT(req: NextRequest) {
  const { error, status, user } = await requireAuth(["ADMIN"]);
  if (error || !user) {
    return NextResponse.json({ error: error || "Only Administrators can modify organization settings" }, { status: status || 403 });
  }

  try {
    const body = await req.json();

    const updated = await prisma.organizationSettings.upsert({
      where: { id: "default" },
      update: {
        companyName: body.companyName,
        legalEntityName: body.legalEntityName,
        tagline: body.tagline,
        logoUrl: body.logoUrl,
        gstin: body.gstin,
        pan: body.pan,
        cin: body.cin,
        addressLine1: body.addressLine1,
        addressLine2: body.addressLine2,
        city: body.city,
        state: body.state,
        postalCode: body.postalCode,
        country: body.country,
        officialEmail: body.officialEmail,
        financeEmail: body.financeEmail,
        phone: body.phone,
        website: body.website,
        bankName: body.bankName,
        bankBranch: body.bankBranch,
        accountName: body.accountName,
        accountNumber: body.accountNumber,
        ifscCode: body.ifscCode,
        upiId: body.upiId,
        defaultGSTRate: body.defaultGSTRate !== undefined ? parseFloat(body.defaultGSTRate) : undefined,
        taxRegime: body.taxRegime,
        epfRate: body.epfRate !== undefined ? parseFloat(body.epfRate) : undefined,
        standardDeduction: body.standardDeduction !== undefined ? parseFloat(body.standardDeduction) : undefined,
      },
      create: {
        id: "default",
        ...body,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "ORGANIZATION_SETTINGS_UPDATED",
        details: `Updated organization profile, legal tax details, and banking remittance parameters`,
      },
    });

    return NextResponse.json({ success: true, organization: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
