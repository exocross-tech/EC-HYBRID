const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding EC HYBRID database...");

  const saltRounds = 10;
  const adminPassword = await bcrypt.hash("Admin@123456", saltRounds);
  const managerPassword = await bcrypt.hash("Manager@123456", saltRounds);
  const employeePassword = await bcrypt.hash("Employee@123456", saltRounds);
  const hrPassword = await bcrypt.hash("HR@123456", saltRounds);

  // 1. Seed Core Users (Admin, Manager, Employee, HR)
  const admin = await prisma.user.upsert({
    where: { email: "admin@echybrid.com" },
    update: {},
    create: {
      name: "Alex Vance (Founder & Admin)",
      email: "admin@echybrid.com",
      passwordHash: adminPassword,
      phone: "+1 (555) 019-2831",
      designation: "Chief Executive Officer",
      department: "Executive",
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@echybrid.com" },
    update: {},
    create: {
      name: "Marcus Sterling",
      email: "manager@echybrid.com",
      passwordHash: managerPassword,
      phone: "+1 (555) 019-4822",
      designation: "IT & Project Delivery Director",
      department: "Engineering",
      role: "MANAGER",
      status: "ACTIVE",
    },
  });

  const employee = await prisma.user.upsert({
    where: { email: "employee@echybrid.com" },
    update: {},
    create: {
      name: "Sarah Chen",
      email: "employee@echybrid.com",
      passwordHash: employeePassword,
      phone: "+1 (555) 019-7319",
      designation: "Senior Cloud Engineer",
      department: "Engineering",
      role: "EMPLOYEE",
      status: "ACTIVE",
    },
  });

  const hr = await prisma.user.upsert({
    where: { email: "hr@echybrid.com" },
    update: {},
    create: {
      name: "Elena Rostova",
      email: "hr@echybrid.com",
      passwordHash: hrPassword,
      phone: "+1 (555) 019-9941",
      designation: "People Operations & HR Lead",
      department: "Human Resources",
      role: "HR",
      status: "ACTIVE",
    },
  });

  console.log("Users created successfully.");

  // 2. Seed Salaries (INR)
  await prisma.salary.upsert({
    where: { userId: admin.id },
    update: {
      basicPay: 180000,
      allowances: 40000,
      deductions: 20000,
      netSalary: 200000,
    },
    create: {
      userId: admin.id,
      basicPay: 180000,
      allowances: 40000,
      deductions: 20000,
      netSalary: 200000,
    },
  });

  const managerSalary = await prisma.salary.upsert({
    where: { userId: manager.id },
    update: {
      basicPay: 110000,
      allowances: 25000,
      deductions: 15000,
      netSalary: 120000,
    },
    create: {
      userId: manager.id,
      basicPay: 110000,
      allowances: 25000,
      deductions: 15000,
      netSalary: 120000,
    },
  });

  const employeeSalary = await prisma.salary.upsert({
    where: { userId: employee.id },
    update: {
      basicPay: 65000,
      allowances: 10000,
      deductions: 6000,
      netSalary: 69000,
    },
    create: {
      userId: employee.id,
      basicPay: 65000,
      allowances: 10000,
      deductions: 6000,
      netSalary: 69000,
    },
  });

  await prisma.salary.upsert({
    where: { userId: hr.id },
    update: {
      basicPay: 70000,
      allowances: 15000,
      deductions: 10000,
      netSalary: 75000,
    },
    create: {
      userId: hr.id,
      basicPay: 70000,
      allowances: 15000,
      deductions: 10000,
      netSalary: 75000,
    },
  });

  // 3. Seed Payslips for Sarah Chen (INR)
  await prisma.payslip.deleteMany({ where: { salaryId: employeeSalary.id } });
  await prisma.payslip.createMany({
    data: [
      {
        salaryId: employeeSalary.id,
        month: 8,
        year: 2026,
        basicPay: 65000,
        allowances: 10000,
        deductions: 6000,
        netSalary: 69000,
        paymentStatus: "PAID",
        generatedAt: new Date("2026-08-31"),
      },
      {
        salaryId: employeeSalary.id,
        month: 7,
        year: 2026,
        basicPay: 65000,
        allowances: 10000,
        deductions: 6000,
        netSalary: 69000,
        paymentStatus: "PAID",
        generatedAt: new Date("2026-07-31"),
      },
    ],
  });

  // 3b. Seed Payslips for Marcus Vance (Manager - INR)
  await prisma.payslip.deleteMany({ where: { salaryId: managerSalary.id } });
  await prisma.payslip.createMany({
    data: [
      {
        salaryId: managerSalary.id,
        month: 8,
        year: 2026,
        basicPay: 110000,
        allowances: 25000,
        deductions: 13000,
        netSalary: 122000,
        paymentStatus: "PAID",
        generatedAt: new Date("2026-08-31"),
      },
      {
        salaryId: managerSalary.id,
        month: 7,
        year: 2026,
        basicPay: 110000,
        allowances: 25000,
        deductions: 13000,
        netSalary: 122000,
        paymentStatus: "PAID",
        generatedAt: new Date("2026-07-31"),
      },
    ],
  });

  // 4. Seed Clients
  const client1 = await prisma.client.create({
    data: {
      name: "David K. Miller",
      company: "Apex Global FinTech",
      email: "dmiller@apexfintech.io",
      phone: "+1 (555) 329-8100",
      address: "742 Financial Way, Suite 400, New York, NY",
      clientType: "SERVICE",
      leadSource: "Referral",
      status: "ACTIVE",
      createdById: admin.id,
    },
  });

  const client2 = await prisma.client.create({
    data: {
      name: "Sophia Martinez",
      company: "Nexus Health Systems",
      email: "smartinez@nexushealth.org",
      phone: "+1 (555) 782-9311",
      address: "1200 Innovation Pkwy, Austin, TX",
      clientType: "PRODUCT",
      leadSource: "Website",
      status: "ACTIVE",
      createdById: manager.id,
    },
  });

  const client3 = await prisma.client.create({
    data: {
      name: "Jonathan Drake",
      company: "HyperScale Logistics",
      email: "jdrake@hyperscale.com",
      phone: "+1 (555) 441-2098",
      address: "500 Freight Hub Road, Chicago, IL",
      clientType: "BOTH",
      leadSource: "LinkedIn",
      status: "LEAD",
      createdById: admin.id,
    },
  });

  // 5. Seed Products (INR)
  const prod1 = await prisma.product.create({
    data: {
      name: "EC Enterprise Core License",
      description: "Annual multi-tenant hybrid deployment license with standard SLA support.",
      price: 145000,
      type: "SUBSCRIPTION",
      stockQuantity: 999,
      status: "ACTIVE",
    },
  });

  const prod2 = await prisma.product.create({
    data: {
      name: "EC Hybrid Security Hardware Key",
      description: "FIPS 140-3 Level 3 Hardware Security Key for biometric multi-factor authentication.",
      price: 4999,
      type: "ONE_TIME",
      stockQuantity: 45,
      status: "ACTIVE",
    },
  });

  // 6. Seed Orders (INR)
  await prisma.order.create({
    data: {
      clientId: client2.id,
      productId: prod1.id,
      quantity: 1,
      amount: 145000,
      status: "PAID",
      invoiceNumber: "INV-2026-001",
    },
  });

  // 7. Seed Projects (INR)
  const project1 = await prisma.project.create({
    data: {
      name: "Apex Cloud Migration & Zero-Trust Audit",
      description: "Migration of legacy on-premises databases to AWS & microservices architecture.",
      type: "SERVICE",
      status: "ACTIVE",
      budget: 4800000,
      billingType: "FIXED",
      startDate: new Date("2026-08-01"),
      endDate: new Date("2026-11-30"),
      clientId: client1.id,
    },
  });

  const project2 = await prisma.project.create({
    data: {
      name: "EC Hybrid v2.0 Mobile Integration",
      description: "Internal product development of offline-first synchronizer module.",
      type: "PRODUCT",
      status: "ACTIVE",
      budget: 3200000,
      billingType: "SUBSCRIPTION",
      startDate: new Date("2026-09-01"),
      endDate: new Date("2026-12-15"),
      clientId: null, // internal product per spec
    },
  });

  // 8. Seed Tasks
  await prisma.task.createMany({
    data: [
      {
        title: "Setup Terraform IAM & VPC Peering",
        description: "Configure secure production VPC peering with encrypted transit gateway.",
        status: "DONE",
        priority: "HIGH",
        projectId: project1.id,
        assignedToId: employee.id,
        dueDate: new Date("2026-09-15"),
      },
      {
        title: "Audit Apex Database Latency & Connection Pooling",
        description: "Profile read replicas and tune PgBouncer connection limits.",
        status: "IN_PROGRESS",
        priority: "URGENT",
        projectId: project1.id,
        assignedToId: employee.id,
        dueDate: new Date("2026-09-28"),
      },
      {
        title: "Develop Offline Sync Storage Engine",
        description: "Benchmark SQLite WASM synchronization protocols for low connectivity.",
        status: "TODO",
        priority: "HIGH",
        projectId: project2.id,
        assignedToId: employee.id,
        dueDate: new Date("2026-10-10"),
      },
    ],
  });

  // 9. Seed Calendar Events
  await prisma.calendarEvent.createMany({
    data: [
      {
        title: "Apex FinTech Sprint Sync",
        description: "Bi-weekly sprint review with Apex stakeholders.",
        startDate: new Date("2026-09-25T10:00:00Z"),
        endDate: new Date("2026-09-25T11:00:00Z"),
        eventType: "MEETING",
        projectId: project1.id,
        attendees: "alex@echybrid.com, marcus@echybrid.com, sarah@echybrid.com",
      },
      {
        title: "EC Hybrid v2.0 Architecture Review",
        description: "Technical design review of sync protocol.",
        startDate: new Date("2026-09-29T14:00:00Z"),
        endDate: new Date("2026-09-29T15:30:00Z"),
        eventType: "PROJECT_MILESTONE",
        projectId: project2.id,
        attendees: "marcus@echybrid.com, sarah@echybrid.com",
      },
    ],
  });

  // 10. Seed Leave Requests
  await prisma.leaveRequest.create({
    data: {
      userId: employee.id,
      leaveType: "CASUAL",
      startDate: new Date("2026-10-05"),
      endDate: new Date("2026-10-06"),
      reason: "Family gathering in Austin",
      status: "APPROVED",
      reviewerId: manager.id,
      reviewerComment: "Approved. Make sure Sprint tasks are handed off.",
    },
  });

  // 11. Seed Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: employee.id,
        title: "New Task Assigned",
        message: "You have been assigned to 'Audit Apex Database Latency & Connection Pooling'",
        type: "TASK_ASSIGNED",
        link: "/tasks",
        isRead: false,
      },
      {
        userId: employee.id,
        title: "Leave Request Approved",
        message: "Your Casual Leave for Oct 5-6 has been approved by Marcus Sterling.",
        type: "LEAVE_STATUS",
        link: "/leave",
        isRead: true,
      },
    ],
  });

  // 12. Seed Invoices (INR)
  await prisma.invoice.deleteMany();
  await prisma.invoice.createMany({
    data: [
      {
        invoiceNumber: "INV-2026-001",
        clientId: client1.id,
        projectId: project1.id,
        description: "Cloud Infrastructure Setup & DB Architecture Migration - Milestone 1",
        amount: 2400000,
        tax: 432000,
        totalAmount: 2832000,
        issueDate: new Date("2026-08-15"),
        dueDate: new Date("2026-08-30"),
        status: "PAID",
        paymentDate: new Date("2026-08-28"),
        items: JSON.stringify([
          { description: "Cloud Architecture Design & VPC Provisioning", quantity: 1, unitPrice: 1400000, amount: 1400000 },
          { description: "High-Availability DB Latency Optimization & Pooling", quantity: 1, unitPrice: 1000000, amount: 1000000 },
        ]),
      },
      {
        invoiceNumber: "INV-2026-002",
        clientId: client1.id,
        projectId: project1.id,
        description: "Backend Microservices & Security Hardening - Milestone 2",
        amount: 2400000,
        tax: 432000,
        totalAmount: 2832000,
        issueDate: new Date("2026-09-10"),
        dueDate: new Date("2026-10-10"),
        status: "SENT",
        items: JSON.stringify([
          { description: "Microservices Containerization & K8s Cluster Setup", quantity: 1, unitPrice: 1600000, amount: 1600000 },
          { description: "RBAC Security Audit & Penetration Testing", quantity: 1, unitPrice: 800000, amount: 800000 },
        ]),
      },
      {
        invoiceNumber: "INV-2026-003",
        clientId: client2.id,
        description: "EC Enterprise Core License - Annual Enterprise Subscription",
        amount: 1450000,
        tax: 261000,
        totalAmount: 1711000,
        issueDate: new Date("2026-09-01"),
        dueDate: new Date("2026-09-15"),
        status: "PAID",
        paymentDate: new Date("2026-09-05"),
        items: JSON.stringify([
          { description: "EC Enterprise Core Annual License (50 Seats)", quantity: 1, unitPrice: 1450000, amount: 1450000 },
        ]),
      },
    ],
  });

  // 13. Seed Social Posts with simulated analytics
  await prisma.socialPost.deleteMany();
  await prisma.socialPost.createMany({
    data: [
      {
        platform: "LINKEDIN",
        content: "Excited to announce the new EC Hybrid architecture milestone! Streamlining enterprise workflows across IT services and unified product operations. #EnterpriseTech #CloudTransformation",
        status: "PUBLISHED",
        publishedAt: new Date("2026-09-20T10:00:00Z"),
        likes: 142,
        shares: 28,
        clicks: 310,
      },
      {
        platform: "X",
        content: "Zero downtime migration completed for Apex FinTech! Modern cloud architecture delivering 4x faster query speeds with SQLite & Next.js 16! 🚀⚡ #DevOps #CloudScale",
        status: "PUBLISHED",
        publishedAt: new Date("2026-09-22T14:30:00Z"),
        likes: 89,
        shares: 14,
        clicks: 175,
      },
      {
        platform: "LINKEDIN",
        content: "Why unified CRM and Project Management reduces agency overhead by 35%. Full case study coming this Thursday on our blog. #Productivity #BusinessOps",
        scheduledFor: new Date("2026-09-30T15:00:00Z"),
        status: "SCHEDULED",
        likes: 0,
        shares: 0,
        clicks: 0,
      },
      {
        platform: "INSTAGRAM",
        content: "Behind the scenes with our engineering and design team at EC HYBRID HQ! 💻✨ Building the future of enterprise software. #WorkCulture #TechStartup #TeamSpirit",
        status: "DRAFT",
        likes: 0,
        shares: 0,
        clicks: 0,
      },
    ],
  });

  console.log("Database seeded successfully with all sample data!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
