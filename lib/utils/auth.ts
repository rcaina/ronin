import { HttpError } from "../errors";
import prisma from "../prisma";

/**
 * Checks if an email is allowed based on the AUTH_ALLOWED_EMAILS environment variable.
 * 
 * @param email - The email address to check
 * @returns true if the email is allowed, false otherwise
 */
export const isEmailAllowed = (email: string): boolean => {
  const allowedEmails = process.env.AUTH_ALLOWED_EMAILS;
  
  // If no allowed emails are configured, allow all emails
  if (!allowedEmails) {
    return true;
  }
  
  // Parse the comma-separated list of allowed emails
  const allowedEmailList = allowedEmails
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
  
  // Check if the provided email is in the allowed list
  return allowedEmailList.includes(email.toLowerCase());
}

export const ensureBudgetOwnership = async (id: string, accountId: string): Promise<void> => {
  const budget = await prisma.budget.findUnique({
    where: {
      id,
      accountId,
      deleted: null,
    },
  });

  if (!budget) {
    throw new HttpError("Budget does not exist or is not in user's account", 404);
  }
};

export const ensureCardAccountOwnership = async (id: string, accountId: string): Promise<void> => {  
  const card = await prisma.card.findUnique({
    where: {
      id,
      user:{
        accountUsers: {
          some: {
            accountId: accountId,
          },
        },
        deleted: null,
      },
      deleted: null,
    },
  });

  if (!card) {
    throw new HttpError("Card does not exist or is not in user's account", 404);
  } 
};

export const validateBudgetId = (id: unknown): string => {
  const idString = id as string;
  if (!idString) {
    throw new HttpError("Budget ID is required", 400);
  }

  return idString;
};

export const validateCategoryId = (id: unknown): string => {
  const idString = id as string;
  if (!idString) {
    throw new HttpError("Category ID is required", 400);
  }

  return idString;
};

export const validateIncomeId = (id: unknown): string => {
  const idString = id as string;
  if (!idString) {
    throw new HttpError("Income ID is required", 400);
  }

  return idString;
};  

export const validateCardId = (id: unknown): string => {
  const idString = id as string;
  if (!idString) {
    throw new HttpError("Card ID is required", 400);
  }

  return idString;
};

export const ensureCardUserOwnership = async (id: string, userId: string): Promise<void> => {
  // ensure card exists and belongs to the specified user not just the account
  const card = await prisma.card.findUnique({
    where: {
      id,
      user: {
        id: userId,
        deleted: null,
      },
      deleted: null,
    },
  });

  if (!card) {
    throw new HttpError("Card does not exist or is not in user's account", 404);
  }
};

export const ensureTransactionOwnership = async (id: string, userId: string): Promise<void> => {
  const transaction = await prisma.transaction.findUnique({
    where: {
      id,
      userId,
    },
  });

  if (!transaction) {
    throw new HttpError("Transaction does not exist or is not in user's account", 404);
  }
};

export const validateTransactionId = (id: unknown): string => {
  const idString = id as string;
  if (!idString) {
    throw new HttpError("Transaction ID is required", 400);
  }

  return idString;
};