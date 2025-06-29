/**
 * Checks if an email is allowed based on the AUTH_ALLOWED_EMAILS environment variable.
 * 
 * @param email - The email address to check
 * @returns true if the email is allowed, false otherwise
 */
export function isEmailAllowed(email: string): boolean {
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