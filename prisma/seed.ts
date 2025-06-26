import { CategoryType, PeriodType, PrismaClient, Role, StrategyType, CardType } from '@prisma/client';

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
      id: "2",
      name: 'Startup Inc',
    },
  });

  // Create demo users
  const users = [
    {
      id: "1",
      name: 'Renzo Caina',
      firstName: 'Renzo',
      lastName: 'Caina',
      email: 'renzocainaedge@gmail.com',
      password: '$2b$10$cw37Jw26QNhLEgWU5ai./urzX82WmFwu4Lp4qI5apPH7YqDyzKmh6', // In production, use proper password hashing
      role: Role.ADMIN,
      phone: '+1234567890',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
    },
    {
      id: "2",
      name: 'Jane Smith',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@demo.com',
      password: '$2b$10$cw37Jw26QNhLEgWU5ai./urzX82WmFwu4Lp4qI5apPH7YqDyzKmh6',
      role: Role.MEMBER,
      phone: '+1987654321',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jane',
    },
    {
      id: "3",
      name: 'Bob Wilson',
      firstName: 'Bob',
      lastName: 'Wilson',
      email: 'bob@startup.com',
      password: '$2b$10$cw37Jw26QNhLEgWU5ai./urzX82WmFwu4Lp4qI5apPH7YqDyzKmh6',
      role: Role.ADMIN,
      phone: '+1122334455',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
    },
  ];

  // Create users first
  for (const user of users) {
    await prisma.user.create({
      data: user,
    });
  }

  // Create AccountUser relationships
  const accountUsers = [
    {
      accountId: demoAccount.id,
      userId: "1", // Renzo Caina
    },
    {
      accountId: demoAccount.id,
      userId: "2", // Jane Smith
    },
    {
      accountId: startupAccount.id,
      userId: "3", // Bob Wilson
    },
  ];

  for (const accountUser of accountUsers) {
    await prisma.accountUser.create({
      data: accountUser,
    });
  }

  // Create budgets
  const budgets = [
    {
      id: "1",
      name: 'Demo Budget',
      createdAt: new Date(),
      accountId: demoAccount.id,
      strategy: StrategyType.ZERO_SUM,
      startAt: new Date('2024-01-01'),
      endAt: new Date('2024-12-31'),
      period: PeriodType.MONTHLY,
    },
    {
      id: "2",
      name: 'Startup Budget',
      createdAt: new Date(),
      accountId: startupAccount.id,
      strategy: StrategyType.PERCENTAGE,
      startAt: new Date('2024-01-01'),
      endAt: new Date('2024-12-31'),
      period: PeriodType.MONTHLY,
    },
  ];

  for (const budget of budgets) {
    await prisma.budget.create({ 
      data: budget,
    });
  }

  // Create categories
  const categories = [
    {
      id: "1",
      name: 'Housing',
      createdAt: new Date(),  
      group: CategoryType.NEEDS,
    },
    {
      id: "2",
      name: 'Food & Groceries',
      createdAt: new Date(),
      group: CategoryType.NEEDS,
    },
    {
      id: "3",
      name: 'Transportation',
      createdAt: new Date(),
      group: CategoryType.NEEDS,
    },
    {
      id: "4",
      name: 'Entertainment',
      createdAt: new Date(),
      group: CategoryType.WANTS,
    },
    {
      id: "5",
      name: 'Shopping',
      createdAt: new Date(),
      group: CategoryType.WANTS,
    },
    {
      id: "6",
      name: 'Investments',
      createdAt: new Date(),
      group: CategoryType.INVESTMENT,
    },
    {
      id: "7",
      name: 'Emergency Fund',
      createdAt: new Date(),
      group: CategoryType.INVESTMENT,
    },
  ];

  for (const category of categories) {
    await prisma.category.create({
      data: category,
    });
  }

  // Create BudgetCategory relationships
  const budgetCategories = [
    // Demo Budget Categories
    {
      id: "bc1",
      budgetId: "1",
      categoryId: "1",
      allocatedAmount: 1500,
    },
    {
      id: "bc2",
      budgetId: "1",
      categoryId: "2",
      allocatedAmount: 600,
    },
    {
      id: "bc3",
      budgetId: "1",
      categoryId: "3",
      allocatedAmount: 400,
    },
    {
      id: "bc4",
      budgetId: "1",
      categoryId: "4",
      allocatedAmount: 300,
    },
    {
      id: "bc5",
      budgetId: "1",
      categoryId: "5",
      allocatedAmount: 200,
    },
    {
      id: "bc6",
      budgetId: "1",
      categoryId: "6",
      allocatedAmount: 1000,
    },
    {
      id: "bc7",
      budgetId: "1",
      categoryId: "7",
      allocatedAmount: 500,
    },
    // Startup Budget Categories
    {
      id: "bc8",
      budgetId: "2",
      categoryId: "1",
      allocatedAmount: 2000,
    },
    {
      id: "bc9",
      budgetId: "2",
      categoryId: "2",
      allocatedAmount: 800,
    },
    {
      id: "bc10",
      budgetId: "2",
      categoryId: "3",
      allocatedAmount: 600,
    },
    {
      id: "bc11",
      budgetId: "2",
      categoryId: "4",
      allocatedAmount: 500,
    },
    {
      id: "bc12",
      budgetId: "2",
      categoryId: "5",
      allocatedAmount: 400,
    },
    {
      id: "bc13",
      budgetId: "2",
      categoryId: "6",
      allocatedAmount: 2000,
    },
    {
      id: "bc14",
      budgetId: "2",
      categoryId: "7",
      allocatedAmount: 700,
    },
  ];

  for (const budgetCategory of budgetCategories) {
    await prisma.budgetCategory.create({
      data: budgetCategory,
    });
  }

  // Create incomes
  const incomes = [
    {
      accountId: demoAccount.id,
      userId: "1",
      budgetId: "1",
      amount: 5000,
      source: 'Salary',
      description: 'Monthly salary',
      receivedAt: new Date(),
      isPlanned: true,
      frequency: PeriodType.MONTHLY,
    },
    {
      accountId: startupAccount.id,
      userId: "3",
      budgetId: "2",
      amount: 8000,
      source: 'Business Revenue',
      description: 'Monthly business income',
      receivedAt: new Date(),
      isPlanned: true,
      frequency: PeriodType.MONTHLY,
    },
  ];

  for (const income of incomes) {
    await prisma.income.create({
      data: income,
    });
  }

  // Create cards
  const cards = [
    {
      name: 'Main Credit Card',
      userId: "1",
      cardType: CardType.CREDIT,
      amountSpent: 1200,
      spendingLimit: 5000,
    },
    {
      name: 'Debit Card',
      userId: "1",
      cardType: CardType.DEBIT,
      amountSpent: 800,
      spendingLimit: null,
    },
    {
      name: 'Business Credit Card',
      userId: "3",
      cardType: CardType.BUSINESS_CREDIT,
      amountSpent: 2500,
      spendingLimit: 10000,
    },
  ];

  for (const card of cards) {
    await prisma.card.create({
      data: card,
    });
  }

  // Create transactions
  const transactions = [
    {
      name: 'Rent Payment',
      description: 'Monthly rent for apartment',
      amount: 1500,
      createdAt: new Date(),
      budgetId: "1",
      categoryId: "bc1",
      accountId: demoAccount.id,
      userId: "1",
    },
    {
      name: 'Grocery Shopping',
      description: 'Weekly groceries at Walmart',
      amount: 120,
      createdAt: new Date(),
      budgetId: "1",
      categoryId: "bc2",
      accountId: demoAccount.id,
      userId: "1",
    },
    {
      name: 'Gas Station',
      description: 'Fuel for car',
      amount: 45,
      createdAt: new Date(),
      budgetId: "1",
      categoryId: "bc3",
      accountId: demoAccount.id,
      userId: "1",
    },
    {
      name: 'Movie Tickets',
      description: 'Weekend movie with friends',
      amount: 35,
      createdAt: new Date(),
      budgetId: "1",
      categoryId: "bc4",
      accountId: demoAccount.id,
      userId: "1",
    },
    {
      name: 'Online Shopping',
      description: 'New clothes from Amazon',
      amount: 85,
      createdAt: new Date(),
      budgetId: "1",
      categoryId: "bc5",
      accountId: demoAccount.id,
      userId: "1",
    },
    {
      name: 'Stock Investment',
      description: 'Monthly stock purchase',
      amount: 500,
      createdAt: new Date(),
      budgetId: "1",
      categoryId: "bc6",
      accountId: demoAccount.id,
      userId: "1",
    },
    {
      name: 'Business Office Rent',
      description: 'Monthly office space rental',
      amount: 2000,
      createdAt: new Date(),
      budgetId: "2",
      categoryId: "bc8",
      accountId: startupAccount.id,
      userId: "3",
    },
    {
      name: 'Business Lunch',
      description: 'Client meeting lunch',
      amount: 75,
      createdAt: new Date(),
      budgetId: "2",
      categoryId: "bc9",
      accountId: startupAccount.id,
      userId: "3",
    },
  ];

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