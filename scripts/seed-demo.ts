/**
 * Seed a single, realistic demo account for marketing screenshots and demo
 * videos.
 *
 * Unlike `prisma/seed.ts` (which wipes/recreates the whole DB with fixed IDs),
 * this script is **idempotent and self-scoped**: it tears down only the demo
 * account and its two demo users (matched by a known email) and rebuilds them,
 * leaving the rest of the dev database untouched. Safe to re-run.
 *
 * What it creates:
 *   - One PREMIUM household account ("The Rivera Household") with two members.
 *   - 6 monthly FIFTY_THIRTY_TWENTY budgets: the current month (ACTIVE) plus
 *     the previous 5 (COMPLETED), each with a full Needs/Wants/Investment
 *     category set, per-budget card copies, income, and ~40 dated transactions.
 *   - Realistic merchants, amounts, and dates anchored to *now*, so the active
 *     budget is the current period and every page/chart looks live. The current
 *     month is intentionally mid-progress (only spending up to today).
 *   - Split transactions, refunds, card payments, recurring templates, a
 *     savings account with pockets + allocations, and in-app notifications.
 *
 * Log in with:  demo@ronin.app  /  demo1234
 *
 * Usage:  pnpm db:seed:demo
 */
import {
  PrismaClient,
  CategoryType,
  PeriodType,
  StrategyType,
  CardType,
  TransactionType,
  BudgetStatus,
  Role,
  Plan,
  SubscriptionStatus,
  NotificationType,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { roundToCents } from "@/lib/utils";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@ronin.app";
const DEMO_PASSWORD = "demo1234";
const MEMBER_EMAIL = "sam@ronin.app";
const ACCOUNT_NAME = "The Rivera Household";
const MONTHS_OF_HISTORY = 6; // current month + previous 5

// --- deterministic RNG so screenshots are stable run to run ------------------
let rngState = 0x2f6e2b1;
function rand(): number {
  // mulberry32
  rngState |= 0;
  rngState = (rngState + 0x6d2b79f5) | 0;
  let t = Math.imul(rngState ^ (rngState >>> 15), 1 | rngState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const randInt = (min: number, max: number) =>
  Math.floor(rand() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]!;

// --- date helpers, anchored to real "now" ------------------------------------
const now = new Date();
const startOfMonth = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0);
const endOfMonth = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
const addMonths = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth() + n, 1);
const daysInMonth = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** A date on a given day of `monthAnchor`, at a plausible hour. */
function dayInMonth(monthAnchor: Date, day: number): Date {
  const dim = daysInMonth(monthAnchor);
  const clamped = Math.min(Math.max(day, 1), dim);
  return new Date(
    monthAnchor.getFullYear(),
    monthAnchor.getMonth(),
    clamped,
    randInt(7, 21),
    randInt(0, 59),
  );
}

// -----------------------------------------------------------------------------
// Category catalog. `allocated` is the monthly budget line; `merchants` and the
// per-transaction size range drive realistic transaction generation. `card`
// picks which card most purchases land on.
// -----------------------------------------------------------------------------
type CardKey = "sapphire" | "amex" | "checking" | "cash";
interface CatConfig {
  name: string;
  group: CategoryType;
  allocated: number;
  merchants: string[];
  min: number; // typical single-transaction size
  max: number;
  card: CardKey;
  txPerMonth: [number, number]; // range of transactions per month
  fixed?: boolean; // single fixed charge early in the month (rent, subs)
}

const CATEGORIES: CatConfig[] = [
  // NEEDS
  {
    name: "Rent",
    group: CategoryType.NEEDS,
    allocated: 2200,
    merchants: ["Greystar Property Mgmt"],
    min: 2200,
    max: 2200,
    card: "checking",
    txPerMonth: [1, 1],
    fixed: true,
  },
  {
    name: "Groceries",
    group: CategoryType.NEEDS,
    allocated: 700,
    merchants: [
      "Whole Foods Market",
      "Trader Joe's",
      "Safeway",
      "Costco Wholesale",
      "Kroger",
    ],
    min: 38,
    max: 165,
    card: "amex",
    txPerMonth: [6, 9],
  },
  {
    name: "Utilities",
    group: CategoryType.NEEDS,
    allocated: 300,
    merchants: ["PG&E", "City Water & Sewer", "Republic Waste Services"],
    min: 45,
    max: 160,
    card: "checking",
    txPerMonth: [2, 3],
  },
  {
    name: "Transportation",
    group: CategoryType.NEEDS,
    allocated: 250,
    merchants: [
      "Shell",
      "Chevron",
      "Uber",
      "Clipper Transit",
      "SpotHero Parking",
    ],
    min: 12,
    max: 70,
    card: "sapphire",
    txPerMonth: [4, 7],
  },
  {
    name: "Insurance",
    group: CategoryType.NEEDS,
    allocated: 200,
    merchants: ["Geico Auto", "Lemonade Renters"],
    min: 28,
    max: 172,
    card: "checking",
    txPerMonth: [2, 2],
    fixed: true,
  },
  {
    name: "Phone & Internet",
    group: CategoryType.NEEDS,
    allocated: 150,
    merchants: ["Verizon Wireless", "Xfinity"],
    min: 55,
    max: 95,
    card: "checking",
    txPerMonth: [2, 2],
    fixed: true,
  },
  {
    name: "Healthcare",
    group: CategoryType.NEEDS,
    allocated: 150,
    merchants: ["CVS Pharmacy", "Kaiser Permanente", "Warby Parker"],
    min: 18,
    max: 95,
    card: "sapphire",
    txPerMonth: [1, 3],
  },
  // WANTS
  {
    name: "Dining Out",
    group: CategoryType.WANTS,
    allocated: 400,
    merchants: [
      "Chipotle",
      "Sweetgreen",
      "Blue Bottle Coffee",
      "Starbucks",
      "DoorDash",
      "Tartine Bakery",
      "Shake Shack",
    ],
    min: 9,
    max: 85,
    card: "amex",
    txPerMonth: [8, 13],
  },
  {
    name: "Entertainment",
    group: CategoryType.WANTS,
    allocated: 200,
    merchants: ["AMC Theatres", "Steam", "Ticketmaster", "Regal Cinemas"],
    min: 15,
    max: 95,
    card: "sapphire",
    txPerMonth: [2, 4],
  },
  {
    name: "Shopping",
    group: CategoryType.WANTS,
    allocated: 300,
    merchants: ["Amazon", "Target", "Nike", "Uniqlo", "Best Buy", "IKEA"],
    min: 22,
    max: 140,
    card: "sapphire",
    txPerMonth: [3, 6],
  },
  {
    name: "Subscriptions",
    group: CategoryType.WANTS,
    allocated: 80,
    merchants: [
      "Netflix",
      "Spotify",
      "Disney+",
      "iCloud+",
      "The New York Times",
    ],
    min: 5,
    max: 23,
    card: "sapphire",
    txPerMonth: [4, 5],
    fixed: true,
  },
  {
    name: "Travel",
    group: CategoryType.WANTS,
    allocated: 250,
    merchants: [
      "United Airlines",
      "Airbnb",
      "Marriott Bonvoy",
      "Delta Air Lines",
    ],
    min: 90,
    max: 320,
    card: "sapphire",
    txPerMonth: [0, 2],
  },
  // INVESTMENT
  {
    name: "Retirement",
    group: CategoryType.INVESTMENT,
    allocated: 800,
    merchants: ["Vanguard 401(k)", "Fidelity Roth IRA"],
    min: 400,
    max: 400,
    card: "checking",
    txPerMonth: [2, 2],
    fixed: true,
  },
  {
    name: "Emergency Fund",
    group: CategoryType.INVESTMENT,
    allocated: 400,
    merchants: ["Ally Savings Transfer"],
    min: 400,
    max: 400,
    card: "checking",
    txPerMonth: [1, 1],
    fixed: true,
  },
  {
    name: "Brokerage",
    group: CategoryType.INVESTMENT,
    allocated: 300,
    merchants: ["Charles Schwab", "Robinhood"],
    min: 150,
    max: 300,
    card: "checking",
    txPerMonth: [1, 2],
  },
];

interface CardConfig {
  key: CardKey;
  name: string;
  lastFourDigits: string | null;
  cardType: CardType;
  spendingLimit: number | null;
}
const CARDS: CardConfig[] = [
  {
    key: "sapphire",
    name: "Chase Sapphire Reserve",
    lastFourDigits: "4821",
    cardType: CardType.CREDIT,
    spendingLimit: 12000,
  },
  {
    key: "amex",
    name: "Amex Gold",
    lastFourDigits: "1007",
    cardType: CardType.CREDIT,
    spendingLimit: 15000,
  },
  {
    key: "checking",
    name: "Everyday Checking",
    lastFourDigits: "3345",
    cardType: CardType.DEBIT,
    spendingLimit: null,
  },
  {
    key: "cash",
    name: "Cash",
    lastFourDigits: null,
    cardType: CardType.CASH,
    spendingLimit: null,
  },
];

// -----------------------------------------------------------------------------
async function teardown(): Promise<void> {
  const existingUsers = await prisma.user.findMany({
    where: { email: { in: [DEMO_EMAIL, MEMBER_EMAIL] } },
    select: { id: true },
  });
  const userIds = existingUsers.map((u) => u.id);

  const existingAccount = await prisma.account.findFirst({
    where: { name: ACCOUNT_NAME },
    select: { id: true },
  });
  const accountId = existingAccount?.id;

  if (!userIds.length && !accountId) return;

  console.log("Tearing down previous demo data…");

  if (accountId) {
    const budgets = await prisma.budget.findMany({
      where: { accountId },
      select: { id: true },
    });
    const budgetIds = budgets.map((b) => b.id);

    await prisma.transactionSplit.deleteMany({
      where: { transaction: { accountId } },
    });
    // Allocations -> pockets -> savings for this account.
    await prisma.allocation.deleteMany({
      where: { pocket: { savings: { accountId } } },
    });
    await prisma.pocket.deleteMany({
      where: { savings: { accountId } },
    });
    await prisma.savings.deleteMany({ where: { accountId } });

    await prisma.transaction.deleteMany({ where: { accountId } });
    await prisma.recurringTransaction.deleteMany({ where: { accountId } });

    // Per-budget card copies first (they FK to template cards via defaultCardId),
    // then template cards.
    if (budgetIds.length) {
      await prisma.card.deleteMany({ where: { budgetId: { in: budgetIds } } });
    }
    await prisma.category.deleteMany({
      where: { budgetId: { in: budgetIds } },
    });
    await prisma.budget.deleteMany({ where: { accountId } });
  }

  if (userIds.length) {
    await prisma.notification.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.pushSubscription.deleteMany({
      where: { userId: { in: userIds } },
    });
    // Any remaining cards owned by demo users (template cards + strays),
    // copies before templates.
    await prisma.card.deleteMany({
      where: { userId: { in: userIds }, defaultCardId: { not: null } },
    });
    await prisma.card.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.accountUser.deleteMany({ where: { userId: { in: userIds } } });
  }

  if (accountId) {
    await prisma.accountUser.deleteMany({ where: { accountId } });
    await prisma.account.delete({ where: { id: accountId } });
  }
  if (userIds.length) {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
}

// Find-or-create a global template category (budgetId null). Templates are
// shared across all accounts and shown on /categories, so we never delete them.
async function ensureTemplateCategory(
  name: string,
  group: CategoryType,
): Promise<string> {
  const existing = await prisma.category.findFirst({
    where: { name, budgetId: null, defaultCategoryId: null, deleted: null },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await prisma.category.create({
    data: { name, group, budgetId: null, allocatedAmount: null },
  });
  return created.id;
}

async function main(): Promise<void> {
  await teardown();
  console.log("Seeding demo account…");

  // --- account + users -------------------------------------------------------
  const account = await prisma.account.create({
    data: {
      name: ACCOUNT_NAME,
      plan: Plan.PREMIUM,
      complimentaryAccess: true, // guarantees premium regardless of Stripe sync
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: new Date(now.getFullYear() + 1, now.getMonth(), 1),
    },
  });

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const alex = await prisma.user.create({
    data: {
      name: "Alex Rivera",
      firstName: "Alex",
      lastName: "Rivera",
      email: DEMO_EMAIL,
      password: passwordHash,
      role: Role.ADMIN,
      phone: "+14155550142",
      emailVerified: now,
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=AlexRivera",
    },
  });
  const sam = await prisma.user.create({
    data: {
      name: "Sam Rivera",
      firstName: "Sam",
      lastName: "Rivera",
      email: MEMBER_EMAIL,
      password: passwordHash,
      role: Role.MEMBER,
      phone: "+14155550188",
      emailVerified: now,
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=SamRivera",
    },
  });

  await prisma.accountUser.createMany({
    data: [
      { accountId: account.id, userId: alex.id },
      { accountId: account.id, userId: sam.id },
    ],
  });

  // --- template (general) cards, owned by Alex -------------------------------
  const templateCardIdByKey = new Map<CardKey, string>();
  for (const c of CARDS) {
    const created = await prisma.card.create({
      data: {
        name: c.name,
        lastFourDigits: c.lastFourDigits,
        cardType: c.cardType,
        spendingLimit: c.spendingLimit,
        userId: alex.id,
        budgetId: null,
      },
    });
    templateCardIdByKey.set(c.key, created.id);
  }
  // Sam has their own checking (used for their paychecks).
  const samCheckingTemplate = await prisma.card.create({
    data: {
      name: "Sam's Checking",
      lastFourDigits: "8890",
      cardType: CardType.DEBIT,
      spendingLimit: null,
      userId: sam.id,
      budgetId: null,
    },
  });

  // --- template categories (global, shared) ----------------------------------
  const templateCategoryIdByName = new Map<string, string>();
  for (const cat of CATEGORIES) {
    templateCategoryIdByName.set(
      cat.name,
      await ensureTemplateCategory(cat.name, cat.group),
    );
  }

  // Track most-recent active-budget category/card ids so recurring templates can
  // point at real rows.
  let activeBudgetCategoryByName = new Map<string, string>();
  let activeBudgetCardByKey = new Map<CardKey, string>();
  let activeSamChecking = "";

  // --- budgets, month by month (oldest -> newest) ----------------------------
  for (let i = MONTHS_OF_HISTORY - 1; i >= 0; i--) {
    const anchor = startOfMonth(addMonths(now, -i));
    const isCurrent = i === 0;
    const monthLabel = `${MONTH_NAMES[anchor.getMonth()]} ${anchor.getFullYear()}`;
    // For the current month, only generate spending through today.
    const dim = daysInMonth(anchor);
    const lastDay = isCurrent ? now.getDate() : dim;
    const monthProgress = lastDay / dim;

    const budget = await prisma.budget.create({
      data: {
        name: monthLabel,
        strategy: StrategyType.FIFTY_THIRTY_TWENTY,
        period: PeriodType.MONTHLY,
        status: isCurrent ? BudgetStatus.ACTIVE : BudgetStatus.COMPLETED,
        startAt: anchor,
        endAt: endOfMonth(anchor),
        accountId: account.id,
      },
    });

    // Per-budget category copies.
    const budgetCategoryByName = new Map<string, string>();
    for (const cat of CATEGORIES) {
      const created = await prisma.category.create({
        data: {
          name: cat.name,
          group: cat.group,
          allocatedAmount: cat.allocated,
          budgetId: budget.id,
          defaultCategoryId: templateCategoryIdByName.get(cat.name)!,
        },
      });
      budgetCategoryByName.set(cat.name, created.id);
    }

    // Per-budget card copies (both Alex's cards and Sam's checking).
    const budgetCardByKey = new Map<CardKey, string>();
    const cardSpend = new Map<CardKey, number>();
    for (const c of CARDS) {
      const created = await prisma.card.create({
        data: {
          name: c.name,
          lastFourDigits: c.lastFourDigits,
          cardType: c.cardType,
          spendingLimit: c.spendingLimit,
          userId: alex.id,
          budgetId: budget.id,
          defaultCardId: templateCardIdByKey.get(c.key)!,
          amountSpent: 0,
        },
      });
      budgetCardByKey.set(c.key, created.id);
      cardSpend.set(c.key, 0);
    }
    const samBudgetChecking = await prisma.card.create({
      data: {
        name: "Sam's Checking",
        lastFourDigits: "8890",
        cardType: CardType.DEBIT,
        spendingLimit: null,
        userId: sam.id,
        budgetId: budget.id,
        defaultCardId: samCheckingTemplate.id,
        amountSpent: 0,
      },
    });

    // --- income: two paychecks each for Alex and Sam (1st & 15th) ------------
    const payDays = [1, 15];
    for (const day of payDays) {
      if (day > lastDay) continue;
      // Alex — Acme Corp, ~$2,600 net per paycheck.
      await prisma.transaction.create({
        data: {
          name: "Acme Corp Payroll",
          description: "Direct deposit",
          amount: roundToCents(2600 + randInt(-40, 60)),
          transactionType: TransactionType.INCOME,
          occurredAt: dayInMonth(anchor, day),
          budgetId: budget.id,
          categoryId: null,
          cardId: budgetCardByKey.get("checking")!,
          accountId: account.id,
          userId: alex.id,
        },
      });
      // Sam — Northwind Studio, ~$1,550 net per paycheck.
      await prisma.transaction.create({
        data: {
          name: "Northwind Studio",
          description: "Direct deposit",
          amount: roundToCents(1550 + randInt(-30, 45)),
          transactionType: TransactionType.INCOME,
          occurredAt: dayInMonth(anchor, day),
          budgetId: budget.id,
          categoryId: null,
          cardId: samBudgetChecking.id,
          accountId: account.id,
          userId: sam.id,
        },
      });
    }

    // --- expenses per category ----------------------------------------------
    for (const cat of CATEGORIES) {
      const target = cat.fixed
        ? cat.allocated
        : cat.allocated * (isCurrent ? monthProgress : 0.82 + rand() * 0.26); // 0.82–1.08 past
      const catCardKey = cat.card;
      const catCategoryId = budgetCategoryByName.get(cat.name)!;

      if (cat.fixed) {
        // One (or few) fixed charges early in the month.
        const nTx = randInt(cat.txPerMonth[0], cat.txPerMonth[1]);
        const each = roundToCents(cat.allocated / nTx);
        for (let k = 0; k < nTx; k++) {
          const day = 1 + k * 2 + randInt(0, 2);
          if (day > lastDay) continue;
          const amt =
            cat.min === cat.max
              ? each
              : roundToCents(cat.min + rand() * (cat.max - cat.min));
          await prisma.transaction.create({
            data: {
              name: cat.merchants[k % cat.merchants.length]!,
              amount: amt,
              transactionType: TransactionType.REGULAR,
              occurredAt: dayInMonth(anchor, day),
              budgetId: budget.id,
              categoryId: catCategoryId,
              cardId: budgetCardByKey.get(catCardKey)!,
              accountId: account.id,
              userId: pick([alex.id, sam.id]),
            },
          });
          cardSpend.set(catCardKey, (cardSpend.get(catCardKey) ?? 0) + amt);
        }
        continue;
      }

      // Variable category: emit transactions until we're near target.
      const maxTx = randInt(cat.txPerMonth[0], cat.txPerMonth[1]);
      let spent = 0;
      for (let k = 0; k < maxTx && spent < target; k++) {
        let amt = roundToCents(cat.min + rand() * (cat.max - cat.min));
        if (spent + amt > target * 1.12)
          amt = roundToCents(Math.max(cat.min, target - spent));
        if (amt <= 0) break;
        const day = randInt(1, lastDay);
        await prisma.transaction.create({
          data: {
            name: pick(cat.merchants),
            amount: amt,
            transactionType: TransactionType.REGULAR,
            occurredAt: dayInMonth(anchor, day),
            budgetId: budget.id,
            categoryId: catCategoryId,
            cardId: budgetCardByKey.get(catCardKey)!,
            accountId: account.id,
            userId: pick([alex.id, sam.id]),
          },
        });
        cardSpend.set(catCardKey, (cardSpend.get(catCardKey) ?? 0) + amt);
        spent += amt;
      }
    }

    // --- one refund (RETURN) per completed month ----------------------------
    if (!isCurrent && rand() < 0.7) {
      const refund = roundToCents(18 + rand() * 60);
      await prisma.transaction.create({
        data: {
          name: "Amazon",
          description: "Returned item refund",
          amount: refund,
          transactionType: TransactionType.RETURN,
          occurredAt: dayInMonth(anchor, randInt(10, 24)),
          budgetId: budget.id,
          categoryId: budgetCategoryByName.get("Shopping")!,
          cardId: budgetCardByKey.get("sapphire")!,
          accountId: account.id,
          userId: alex.id,
        },
      });
      cardSpend.set("sapphire", (cardSpend.get("sapphire") ?? 0) - refund);
    }

    // --- one split transaction per month (Costco run: Groceries + Shopping) --
    if (lastDay >= 12) {
      const groceriesPart = roundToCents(70 + rand() * 60);
      const shoppingPart = roundToCents(30 + rand() * 50);
      const split = await prisma.transaction.create({
        data: {
          name: "Costco Wholesale",
          description: "Split: groceries + household",
          amount: roundToCents(groceriesPart + shoppingPart),
          transactionType: TransactionType.REGULAR,
          occurredAt: dayInMonth(anchor, randInt(8, Math.min(lastDay, 20))),
          budgetId: budget.id,
          categoryId: null, // split parent carries no category
          cardId: budgetCardByKey.get("amex")!,
          accountId: account.id,
          userId: alex.id,
        },
      });
      await prisma.transactionSplit.createMany({
        data: [
          {
            transactionId: split.id,
            categoryId: budgetCategoryByName.get("Groceries")!,
            amount: groceriesPart,
            note: "Groceries",
          },
          {
            transactionId: split.id,
            categoryId: budgetCategoryByName.get("Shopping")!,
            amount: shoppingPart,
            note: "Household goods",
          },
        ],
      });
      cardSpend.set(
        "amex",
        (cardSpend.get("amex") ?? 0) + groceriesPart + shoppingPart,
      );
    }

    // --- credit-card payment (CARD_PAYMENT, not spending) --------------------
    if (!isCurrent) {
      const payAmt = roundToCents(cardSpend.get("sapphire") ?? 0);
      if (payAmt > 0) {
        await prisma.transaction.create({
          data: {
            name: "Payment - Chase Sapphire",
            description: "Autopay statement balance",
            amount: payAmt,
            transactionType: TransactionType.CARD_PAYMENT,
            occurredAt: dayInMonth(anchor, Math.min(lastDay, 26)),
            budgetId: budget.id,
            categoryId: null,
            cardId: budgetCardByKey.get("checking")!,
            accountId: account.id,
            userId: alex.id,
          },
        });
      }
    }

    // --- persist per-card amountSpent for this budget's cards ----------------
    for (const c of CARDS) {
      await prisma.card.update({
        where: { id: budgetCardByKey.get(c.key)! },
        data: { amountSpent: roundToCents(Math.max(0, cardSpend.get(c.key) ?? 0)) },
      });
    }

    if (isCurrent) {
      activeBudgetCategoryByName = budgetCategoryByName;
      activeBudgetCardByKey = budgetCardByKey;
      activeSamChecking = samBudgetChecking.id;
    }
  }

  // --- recurring transaction templates (premium) -----------------------------
  const nextMonth = addMonths(now, 1);
  const recurrings = [
    {
      name: "Rent",
      amount: 2200,
      category: "Rent",
      card: "checking" as CardKey,
      type: TransactionType.REGULAR,
      day: 1,
    },
    {
      name: "Netflix",
      amount: 22.99,
      category: "Subscriptions",
      card: "sapphire" as CardKey,
      type: TransactionType.REGULAR,
      day: 4,
    },
    {
      name: "Spotify",
      amount: 11.99,
      category: "Subscriptions",
      card: "sapphire" as CardKey,
      type: TransactionType.REGULAR,
      day: 6,
    },
    {
      name: "Equinox Gym",
      amount: 260,
      category: "Healthcare",
      card: "sapphire" as CardKey,
      type: TransactionType.REGULAR,
      day: 3,
    },
    {
      name: "Verizon Wireless",
      amount: 95,
      category: "Phone & Internet",
      card: "checking" as CardKey,
      type: TransactionType.REGULAR,
      day: 12,
    },
  ];
  for (const r of recurrings) {
    await prisma.recurringTransaction.create({
      data: {
        name: r.name,
        amount: r.amount,
        transactionType: r.type,
        frequency: PeriodType.MONTHLY,
        nextRunAt: new Date(
          nextMonth.getFullYear(),
          nextMonth.getMonth(),
          r.day,
        ),
        categoryId: activeBudgetCategoryByName.get(r.category) ?? null,
        cardId: activeBudgetCardByKey.get(r.card) ?? null,
        accountId: account.id,
        userId: alex.id,
      },
    });
  }
  // Recurring income templates.
  await prisma.recurringTransaction.create({
    data: {
      name: "Acme Corp Payroll",
      amount: 2600,
      transactionType: TransactionType.INCOME,
      frequency: PeriodType.MONTHLY,
      nextRunAt: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1),
      cardId: activeBudgetCardByKey.get("checking") ?? null,
      accountId: account.id,
      userId: alex.id,
    },
  });
  await prisma.recurringTransaction.create({
    data: {
      name: "Northwind Studio",
      amount: 1550,
      transactionType: TransactionType.INCOME,
      frequency: PeriodType.MONTHLY,
      nextRunAt: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1),
      cardId: activeSamChecking || null,
      accountId: account.id,
      userId: sam.id,
    },
  });

  // --- savings, pockets, allocations -----------------------------------------
  const savings = await prisma.savings.create({
    data: { name: "Rivera Savings", accountId: account.id, userId: alex.id },
  });
  const pockets = [
    {
      name: "Emergency Fund",
      goalAmount: 15000,
      goalNote: "6 months of expenses",
      monthly: 400,
      start: 8200,
    },
    {
      name: "Japan 2026",
      goalAmount: 6000,
      goalNote: "Two weeks in spring",
      monthly: 350,
      start: 2400,
    },
    {
      name: "New Car",
      goalAmount: 20000,
      goalNote: "Replace the Civic",
      monthly: 300,
      start: 5600,
    },
    {
      name: "Home Down Payment",
      goalAmount: 60000,
      goalNote: "20% down",
      monthly: 600,
      start: 18000,
    },
  ];
  for (const p of pockets) {
    const pocket = await prisma.pocket.create({
      data: {
        savingsId: savings.id,
        name: p.name,
        goalAmount: p.goalAmount,
        goalNote: p.goalNote,
        goalDate: new Date(now.getFullYear() + 1, now.getMonth(), 1),
      },
    });
    // Opening balance.
    await prisma.allocation.create({
      data: {
        pocketId: pocket.id,
        userId: alex.id,
        amount: p.start,
        withdrawal: false,
        note: "Opening balance",
        occurredAt: startOfMonth(addMonths(now, -(MONTHS_OF_HISTORY - 1))),
      },
    });
    // Monthly deposits across the history window.
    for (let i = MONTHS_OF_HISTORY - 1; i >= 0; i--) {
      const anchor = startOfMonth(addMonths(now, -i));
      if (i === 0 && now.getDate() < 5) continue; // current month not funded yet
      await prisma.allocation.create({
        data: {
          pocketId: pocket.id,
          userId: pick([alex.id, sam.id]),
          amount: p.monthly,
          withdrawal: false,
          note: "Monthly contribution",
          occurredAt: dayInMonth(anchor, 3),
        },
      });
    }
  }
  // One realistic withdrawal from the Japan pocket.
  const japanPocket = await prisma.pocket.findFirst({
    where: { savingsId: savings.id, name: "Japan 2026" },
    select: { id: true },
  });
  if (japanPocket) {
    await prisma.allocation.create({
      data: {
        pocketId: japanPocket.id,
        userId: alex.id,
        amount: 800,
        withdrawal: true,
        note: "Flight deposit",
        occurredAt: dayInMonth(addMonths(now, -2), 14),
      },
    });
  }

  // --- notifications for Alex ------------------------------------------------
  const monthTag = `${now.getFullYear()}-${now.getMonth() + 1}`;
  await prisma.notification.createMany({
    data: [
      {
        userId: alex.id,
        type: NotificationType.CATEGORY_OVER_THRESHOLD,
        title: "Dining Out is at 85%",
        body: "You've used 85% of your Dining Out budget for this period.",
        dedupeKey: `CATEGORY_OVER_THRESHOLD:dining:${monthTag}`,
        data: { category: "Dining Out", percent: 85 },
        readAt: null,
      },
      {
        userId: alex.id,
        type: NotificationType.RECURRING_POSTED,
        title: "Rent posted",
        body: "Your recurring Rent of $2,200.00 was added to this month's budget.",
        dedupeKey: `RECURRING_POSTED:rent:${monthTag}`,
        data: { name: "Rent", amount: 2200 },
        readAt: null,
      },
      {
        userId: alex.id,
        type: NotificationType.BUDGET_PERIOD_ENDING,
        title: "Budget period ending soon",
        body: `Your ${MONTH_NAMES[now.getMonth()]} budget ends in a few days. Review your spending.`,
        dedupeKey: `BUDGET_PERIOD_ENDING:${monthTag}`,
        data: { month: MONTH_NAMES[now.getMonth()] },
        readAt: now,
      },
    ],
  });

  // --- summary ---------------------------------------------------------------
  const txCount = await prisma.transaction.count({
    where: { accountId: account.id },
  });
  console.log("Demo account seeded. 🌱");
  console.log(`  Account:      ${ACCOUNT_NAME} (PREMIUM)`);
  console.log(`  Login:        ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(
    `  Budgets:      ${MONTHS_OF_HISTORY} monthly (current = ACTIVE)`,
  );
  console.log(`  Transactions: ${txCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
