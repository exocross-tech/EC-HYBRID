import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// GET /api/products
export async function GET() {
  const { error, status } = await requireAuth();
  if (error) {
    return NextResponse.json({ error }, { status });
  }

  const products = await prisma.product.findMany({
    include: {
      _count: { select: { orders: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ products });
}

// POST /api/products - Admin & Manager
export async function POST(req: NextRequest) {
  const { error, status, user } = await requireAuth(["ADMIN", "MANAGER"]);
  if (error || !user) {
    return NextResponse.json({ error: error || "Unauthorized" }, { status: status || 403 });
  }

  try {
    const body = await req.json();
    const { name, description, price, type, stockQuantity, status: prodStatus } = body;

    if (!name || price === undefined) {
      return NextResponse.json({ error: "Product name and price are required" }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        name,
        description: description || null,
        price: parseFloat(price) || 0,
        type: type || "SUBSCRIPTION",
        stockQuantity: parseInt(stockQuantity) || 0, // single quantity field per Section 8 clarification
        status: prodStatus || "ACTIVE",
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "PRODUCT_CREATED",
        details: `Created product "${product.name}" priced at ₹${product.price}`,
      },
    });

    return NextResponse.json({ success: true, product }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
