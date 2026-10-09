const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function cleanAndInitializeDatabase() {
  console.log("=================================================");
  console.log("  EC HYBRID - Database Wipe & Fresh Initialization");
  console.log("=================================================\n");

  try {
    console.log("1. Wiping all dummy and seeded data...");

    // Delete in reverse foreign-key order
    const auditLogs = await prisma.auditLog.deleteMany({});
    console.log(`   - Deleted ${auditLogs.count} audit logs`);

    const notifications = await prisma.notification.deleteMany({});
    console.log(`   - Deleted ${notifications.count} notifications`);

    const socialPosts = await prisma.socialPost.deleteMany({});
    console.log(`   - Deleted ${socialPosts.count} social posts`);

    const invoices = await prisma.invoice.deleteMany({});
    console.log(`   - Deleted ${invoices.count} invoices`);

    const orders = await prisma.order.deleteMany({});
    console.log(`   - Deleted ${orders.count} orders`);

    const products = await prisma.product.deleteMany({});
    console.log(`   - Deleted ${products.count} products`);

    const payslips = await prisma.payslip.deleteMany({});
    console.log(`   - Deleted ${payslips.count} payslips`);

    const salaries = await prisma.salary.deleteMany({});
    console.log(`   - Deleted ${salaries.count} salaries`);

    const leaves = await prisma.leaveRequest.deleteMany({});
    console.log(`   - Deleted ${leaves.count} leave requests`);

    const calendarEvents = await prisma.calendarEvent.deleteMany({});
    console.log(`   - Deleted ${calendarEvents.count} calendar events`);

    const tasks = await prisma.task.deleteMany({});
    console.log(`   - Deleted ${tasks.count} tasks`);

    const projects = await prisma.project.deleteMany({});
    console.log(`   - Deleted ${projects.count} projects`);

    const clients = await prisma.client.deleteMany({});
    console.log(`   - Deleted ${clients.count} clients`);

    const users = await prisma.user.deleteMany({});
    console.log(`   - Deleted ${users.count} old users`);

    console.log("\n2. Initializing clean Organization Settings for Exocross...");
    const org = await prisma.organizationSettings.upsert({
      where: { id: "default" },
      update: {
        companyName: "Exocross",
        legalEntityName: "Exocross Tech",
        tagline: "IT Services & Solutions | Custom Future Products",
        logoUrl: "/logo.png",
        addressLine1: "Chennai, Tamil Nadu, India",
        city: "Chennai",
        state: "Tamil Nadu",
        country: "India",
        officialEmail: "exocross.tech@gmail.com",
        financeEmail: "exocross.tech@gmail.com",
        phone: "7604830742 / 8124473373",
        website: "https://exocross.com",
        defaultGSTRate: 18.0,
        taxRegime: "NEW",
        bankName: "HDFC Bank Ltd.",
        accountName: "EXOCROSS TECH",
      },
      create: {
        id: "default",
        companyName: "Exocross",
        legalEntityName: "Exocross Tech",
        tagline: "IT Services & Solutions | Custom Future Products",
        logoUrl: "/logo.png",
        addressLine1: "Chennai, Tamil Nadu, India",
        city: "Chennai",
        state: "Tamil Nadu",
        country: "India",
        officialEmail: "exocross.tech@gmail.com",
        financeEmail: "exocross.tech@gmail.com",
        phone: "7604830742 / 8124473373",
        website: "https://exocross.com",
        defaultGSTRate: 18.0,
        taxRegime: "NEW",
        bankName: "HDFC Bank Ltd.",
        accountName: "EXOCROSS TECH",
      },
    });
    console.log(`   - Organization profile set for: ${org.companyName} (${org.legalEntityName})`);

    console.log("\n3. Creating your fresh primary Admin (CEO) account...");
    const saltRounds = 10;
    const adminPasswordHash = await bcrypt.hash("Exocross@2026", saltRounds);

    const admin = await prisma.user.create({
      data: {
        name: "Exocross CEO",
        email: "admin@exocross.com",
        passwordHash: adminPasswordHash,
        designation: "Founder & CEO",
        department: "Executive",
        role: "ADMIN",
        status: "ACTIVE",
        phone: "7604830742",
      },
    });
    console.log(`   - Primary Admin user created: ${admin.name} (${admin.email})`);

    // Log the clean initialization in AuditLog
    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: "DATABASE_INITIALIZED",
        details: "Clean database initialization for production operations",
      },
    });

    console.log("\n=================================================");
    console.log("  Database Successfully Wiped & Initialized!     ");
    console.log("=================================================");
    console.log("\nYour Fresh Production Credentials:");
    console.log("  - Email:    admin@exocross.com");
    console.log("  - Password: Exocross@2026");
    console.log("  - Role:     ADMIN (CEO)\n");
  } catch (error) {
    console.error("Database wipe error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanAndInitializeDatabase();
