import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// GET /api/products - In-House Products Development Hub
export async function GET(req: NextRequest) {
  const { error, status, user } = await requireAuth(["ADMIN", "MANAGER", "EMPLOYEE"]);
  if (error || !user) {
    return NextResponse.json(
      { error: error || "Forbidden: HR has no access to products" },
      { status: status || 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() || "";
  const statusFilter = searchParams.get("status");

  let whereClause: any = {
    type: "PRODUCT",
  };

  if (search) {
    whereClause.OR = [
      { name: { contains: search } },
      { description: { contains: search } },
      { requirements: { contains: search } },
    ];
  }

  if (statusFilter && statusFilter !== "ALL") {
    whereClause.status = statusFilter;
  }

  try {
    const products = await prisma.project.findMany({
      where: whereClause,
      include: {
        tasks: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            priority: true,
            dueDate: true,
            assignedTo: { select: { id: true, name: true, email: true, department: true } },
          },
          orderBy: [{ status: "asc" }, { dueDate: "asc" }],
        },
        _count: { select: { tasks: true, calendarEvents: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Also fetch active team members for assigning sprint tasks
    const teamMembers = await prisma.user.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, email: true, department: true, role: true },
      orderBy: { name: "asc" },
    });

    // Calculate aggregated metrics
    let totalTasks = 0;
    let completedTasks = 0;
    let activeSprintTasks = 0;
    let totalBudget = 0;
    let activeProducts = 0;
    let planningProducts = 0;
    let completedProducts = 0;
    let onHoldProducts = 0;

    for (const prod of products) {
      totalBudget += prod.budget || 0;
      if (prod.status === "ACTIVE") activeProducts++;
      else if (prod.status === "PLANNING") planningProducts++;
      else if (prod.status === "COMPLETED") completedProducts++;
      else if (prod.status === "ON_HOLD") onHoldProducts++;

      const prodTasks = prod.tasks || [];
      totalTasks += prodTasks.length;
      for (const t of prodTasks) {
        if (t.status === "DONE") {
          completedTasks++;
        } else {
          activeSprintTasks++;
        }
      }
    }

    const overallCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const metrics = {
      totalProducts: products.length,
      activeProducts,
      planningProducts,
      completedProducts,
      onHoldProducts,
      totalTasks,
      completedTasks,
      activeSprintTasks,
      overallCompletionRate,
      totalBudget,
    };

    return NextResponse.json({ products, metrics, teamMembers });
  } catch (err: any) {
    console.error("Fetch products error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch products" }, { status: 500 });
  }
}

// POST /api/products - Create In-House Product (Admin & Manager only)
export async function POST(req: NextRequest) {
  const { error, status, user } = await requireAuth(["ADMIN", "MANAGER"]);
  if (error || !user) {
    return NextResponse.json({ error: error || "Forbidden" }, { status: status || 403 });
  }

  try {
    const body = await req.json();
    const { name, description, requirements, status: productStatus, budget, billingType, startDate, endDate } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Product name is required" }, { status: 400 });
    }

    const newProduct = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description ? description.trim() : null,
        requirements: requirements ? requirements.trim() : null,
        type: "PRODUCT", // Always internal product
        status: productStatus || "PLANNING",
        budget: parseFloat(budget) || 0,
        billingType: billingType || "FIXED",
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        clientId: null, // Always internal
      },
      include: {
        tasks: true,
        _count: { select: { tasks: true, calendarEvents: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "PRODUCT_CREATED",
        details: `Created in-house product "${newProduct.name}" (Status: ${newProduct.status}) with allocated budget ₹${newProduct.budget}`,
      },
    });

    return NextResponse.json({ success: true, product: newProduct }, { status: 201 });
  } catch (err: any) {
    console.error("Create product error:", err);
    return NextResponse.json({ error: err.message || "Failed to create product" }, { status: 500 });
  }
}
