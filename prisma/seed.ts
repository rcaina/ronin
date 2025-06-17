import { BudgetType, PeriodType, PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create demo accounts
  const demoAccount = await prisma.account.create({
    data: {
      id: "1",
      name: 'Demo Company',
    },
  });

  const startupAccount = await prisma.account.create({
    data: {
      name: 'Startup Inc',
    },
  });

  // Create demo users
  const users = [
    {
      name: 'Renzo Caina',
      firstName: 'Renzo',
      lastName: 'Caina',
      email: 'renzocainaedge@gmail.com',
      password: '$2b$10$cw37Jw26QNhLEgWU5ai./urzX82WmFwu4Lp4qI5apPH7YqDyzKmh6', // In production, use proper password hashing
      role: Role.ADMIN,
      phone: '+1234567890',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
      accountId: demoAccount.id,
    },
    {
      name: 'Jane Smith',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@demo.com',
      password: '$2b$10$cw37Jw26QNhLEgWU5ai./urzX82WmFwu4Lp4qI5apPH7YqDyzKmh6',
      role: Role.MEMBER,
      phone: '+1987654321',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jane',
      accountId: demoAccount.id,
    },
    {
      name: 'Bob Wilson',
      firstName: 'Bob',
      lastName: 'Wilson',
      email: 'bob@startup.com',
      password: '$2b$10$cw37Jw26QNhLEgWU5ai./urzX82WmFwu4Lp4qI5apPH7YqDyzKmh6',
      role: Role.ADMIN,
      phone: '+1122334455',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
      accountId: startupAccount.id,
    },
  ];

  const budgets = [
    {
      id: "1",
      name: 'Demo Budget',
      createdAt: new Date(),
      accountId: "1",
      type: BudgetType.ZERO_SUM,
      period: PeriodType.MONTHLY,
      income: 1000,
    },
  ];

  const categories =  [
    {
      id: "1",
      name: 'Demo Category 1',
      createdAt: new Date(),  
      budgetId: "1",
      spendingLimit: 100,
    },
    {
      id: "2",
      name: 'Demo Category 2',
      createdAt: new Date(),
      budgetId: "1",
      spendingLimit: 100,
    },
    {
      name: 'Demo Category 3',
      createdAt: new Date(),
      budgetId: "1",
      spendingLimit: 100,
    },
  ];

  const transactions = [{
      name: 'Demo Transaction 1',
      amount: 100,
      createdAt: new Date(),
      categoryId: "1",
  },
  {
      name: 'Demo Transaction 2',
      amount: 200,
      createdAt: new Date(),
      categoryId: "2",
  }];

  for (const user of users) {
    await prisma.user.create({
      data: user,
    });
  }

  for (const budget of budgets) {
    await prisma.budget.create({ 
      data: budget,
    });
  }

  for (const category of categories) {
    await prisma.category.create({
      data: category,
    });
  }

  for (const transaction of transactions) {
    await prisma.transaction.create({
      data: transaction,
    });
  }
  
  

  console.log('Database has been seeded. 🌱');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  }); 