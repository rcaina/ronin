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
      strategy: StrategyType.FIFTY_THIRTY_TWENTY,
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

  // Create default/template categories (no budgetId)
  for (const category of categories) {
    await prisma.category.create({
      data: {
        ...category,
        budgetId: null, // Template categories have no budgetId
        allocatedAmount: null, // Template categories have no allocated amount
      },
    });
  }

  // Create budget-specific categories (with budgetId) and store their IDs
  const budgetCategories = [
    // Demo Budget Categories  
    { budgetId: "1", name: 'Housing', group: CategoryType.NEEDS, allocatedAmount: 1500, txCategoryId: "bc1" },
    { budgetId: "1", name: 'Food & Groceries', group: CategoryType.NEEDS, allocatedAmount: 600, txCategoryId: "bc2" },
    { budgetId: "1", name: 'Transportation', group: CategoryType.NEEDS, allocatedAmount: 400, txCategoryId: "bc3" },
    { budgetId: "1", name: 'Entertainment', group: CategoryType.WANTS, allocatedAmount: 300, txCategoryId: "bc4" },
    { budgetId: "1", name: 'Shopping', group: CategoryType.WANTS, allocatedAmount: 200, txCategoryId: "bc5" },
    { budgetId: "1", name: 'Investments', group: CategoryType.INVESTMENT, allocatedAmount: 1000, txCategoryId: "bc6" },
    { budgetId: "1", name: 'Emergency Fund', group: CategoryType.INVESTMENT, allocatedAmount: 500, txCategoryId: "bc7" },
    // Startup Budget Categories
    { budgetId: "2", name: 'Housing', group: CategoryType.NEEDS, allocatedAmount: 2000, txCategoryId: "bc8" },
    { budgetId: "2", name: 'Food & Groceries', group: CategoryType.NEEDS, allocatedAmount: 800, txCategoryId: "bc9" },
    { budgetId: "2", name: 'Transportation', group: CategoryType.NEEDS, allocatedAmount: 600, txCategoryId: "bc10" },
    { budgetId: "2", name: 'Entertainment', group: CategoryType.WANTS, allocatedAmount: 500, txCategoryId: "bc11" },
    { budgetId: "2", name: 'Shopping', group: CategoryType.WANTS, allocatedAmount: 400, txCategoryId: "bc12" },
    { budgetId: "2", name: 'Investments', group: CategoryType.INVESTMENT, allocatedAmount: 2000, txCategoryId: "bc13" },
    { budgetId: "2", name: 'Emergency Fund', group: CategoryType.INVESTMENT, allocatedAmount: 700, txCategoryId: "bc14" },
  ];

  const categoryIdMap = new Map<string, string>();
  for (const budgetCategory of budgetCategories) {
    const { txCategoryId, ...categoryData } = budgetCategory;
    const created = await prisma.category.create({
      data: categoryData,
    });
    categoryIdMap.set(txCategoryId, created.id);
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

  // Create savings accounts with pockets
  const personalSavings = await prisma.savings.create({
    data: {
      name: 'Personal Savings',
      accountId: demoAccount.id,
      userId: '1',
      budgetId: '1',
    },
  });

  const personalEmergencyPocket = await prisma.pocket.create({
    data: {
      savingsId: personalSavings.id,
      name: 'Emergency Fund',
      goalAmount: 5000,
      goalNote: '3-6 months of expenses',
    },
  });
  const personalVacationPocket = await prisma.pocket.create({
    data: {
      savingsId: personalSavings.id,
      name: 'Vacation',
      goalAmount: 2000,
      goalNote: 'Trip to the beach',
    },
  });

  const businessSavings = await prisma.savings.create({
    data: {
      name: 'Business Savings',
      accountId: startupAccount.id,
      userId: '3',
      budgetId: '2',
    },
  });

  const businessTaxReservePocket = await prisma.pocket.create({
    data: {
      savingsId: businessSavings.id,
      name: 'Tax Reserve',
      goalAmount: 10000,
      goalNote: 'Quarterly estimated taxes',
    },
  });
  const businessEquipmentPocket = await prisma.pocket.create({
    data: {
      savingsId: businessSavings.id,
      name: 'Equipment Fund',
      goalAmount: 8000,
      goalNote: 'New laptops and peripherals',
    },
  });

  // Create transactions
  const transactions = [
    {
      name: 'Rent Payment',
      description: 'Monthly rent for apartment',
      amount: 1500,
      createdAt: new Date(),
      budgetId: "1",
      categoryId: categoryIdMap.get("bc1")!,
      accountId: demoAccount.id,
      userId: "1",
    },
    {
      name: 'Grocery Shopping',
      description: 'Weekly groceries at Walmart',
      amount: 120,
      createdAt: new Date(),
      budgetId: "1",
      categoryId: categoryIdMap.get("bc2")!,
      accountId: demoAccount.id,
      userId: "1",
    },
    {
      name: 'Gas Station',
      description: 'Fuel for car',
      amount: 45,
      createdAt: new Date(),
      budgetId: "1",
      categoryId: categoryIdMap.get("bc3")!,
      accountId: demoAccount.id,
      userId: "1",
    },
    {
      name: 'Movie Tickets',
      description: 'Weekend movie with friends',
      amount: 35,
      createdAt: new Date(),
      budgetId: "1",
      categoryId: categoryIdMap.get("bc4")!,
      accountId: demoAccount.id,
      userId: "1",
    },
    {
      name: 'Online Shopping',
      description: 'New clothes from Amazon',
      amount: 85,
      createdAt: new Date(),
      budgetId: "1",
      categoryId: categoryIdMap.get("bc5")!,
      accountId: demoAccount.id,
      userId: "1",
    },
    {
      name: 'Stock Investment',
      description: 'Monthly stock purchase',
      amount: 500,
      createdAt: new Date(),
      budgetId: "1",
      categoryId: categoryIdMap.get("bc6")!,
      accountId: demoAccount.id,
      userId: "1",
    },
    {
      name: 'Business Office Rent',
      description: 'Monthly office space rental',
      amount: 2000,
      createdAt: new Date(),
      budgetId: "2",
      categoryId: categoryIdMap.get("bc8")!,
      accountId: startupAccount.id,
      userId: "3",
    },
    {
      name: 'Business Lunch',
      description: 'Client meeting lunch',
      amount: 75,
      createdAt: new Date(),
      budgetId: "2",
      categoryId: categoryIdMap.get("bc9")!,
      accountId: startupAccount.id,
      userId: "3",
    },
    // Personal savings deposits
    {
      name: 'Savings Deposit',
      description: 'Transfer to savings',
      amount: 300,
      createdAt: new Date(),
      budgetId: "1",
      categoryId: null,
      accountId: demoAccount.id,
      userId: "1",
    },
    {
      name: 'Savings Deposit',
      description: 'Transfer to savings',
      amount: 200,
      createdAt: new Date(),
      budgetId: "1",
      categoryId: null,
      accountId: demoAccount.id,
      userId: "1",
    },
    // Business savings deposit
    {
      name: 'Business Savings Deposit',
      description: 'Transfer to business savings',
      amount: 1500,
      createdAt: new Date(),
      budgetId: "2",
      categoryId: null,
      accountId: startupAccount.id,
      userId: "3",
    },
  ];

  const createdTransactions = [] as { id: string; amount: number; accountId: string; userId: string; budgetId: string }[];
  for (const transaction of transactions) {
    const created = await prisma.transaction.create({
      data: transaction,
    });
    createdTransactions.push({ id: created.id, amount: created.amount, accountId: created.accountId, userId: created.userId, budgetId: created.budgetId });
  }

  // Allocate savings deposits to pockets
  const personalDepositTxns = createdTransactions.filter(
    (t) => t.accountId === demoAccount.id && t.userId === '1' && t.budgetId === '1' && (t.amount === 300 || t.amount === 200),
  );
  if (personalDepositTxns.length >= 2) {
    const [pTxn1, pTxn2] = personalDepositTxns;
    if (pTxn1 && pTxn2) {
      // First deposit: split between Emergency 200 and Vacation 100
      await prisma.allocation.create({
        data: { transactionId: pTxn1.id, pocketId: personalEmergencyPocket.id, amount: 200 },
      });
      await prisma.allocation.create({
        data: { transactionId: pTxn1.id, pocketId: personalVacationPocket.id, amount: 100 },
      });
      // Second deposit: all to Emergency
      await prisma.allocation.create({
        data: { transactionId: pTxn2.id, pocketId: personalEmergencyPocket.id, amount: 200 },
      });
    }
  }

  const businessDepositTxn = createdTransactions.find(
    (t) => t.accountId === startupAccount.id && t.userId === '3' && t.budgetId === '2' && t.amount === 1500,
  );
  if (businessDepositTxn) {
    await prisma.allocation.create({
      data: { transactionId: businessDepositTxn.id, pocketId: businessTaxReservePocket.id, amount: 1000 },
    });
    await prisma.allocation.create({
      data: { transactionId: businessDepositTxn.id, pocketId: businessEquipmentPocket.id, amount: 500 },
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