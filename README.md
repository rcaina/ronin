# Ronin - Personal Finance Management App

A modern personal finance management application built with the T3 Stack, featuring budget tracking, transaction management, and financial insights.

## Features

- **Budget Management**: Create and track budgets with customizable categories
- **Transaction Tracking**: Log and categorize your income and expenses
- **Card Management**: Keep track of your credit and debit cards
- **User Authentication**: Secure sign-in and sign-up with email restrictions
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Tech Stack

This project is built with the [T3 Stack](https://create.t3.gg/):

- [Next.js](https://nextjs.org) - React framework
- [NextAuth.js](https://next-auth.js.org) - Authentication
- [Prisma](https://prisma.io) - Database ORM
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [TypeScript](https://www.typescriptlang.org/) - Type safety

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- PostgreSQL database

### Installation

1. Clone the repository
2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Set up your environment variables (see Environment Variables section below)

4. Set up the database:

   ```bash
   pnpm db:push
   ```

5. Start the development server:
   ```bash
   pnpm dev
   ```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

### Required

- `DATABASE_URL`: PostgreSQL connection string
- `AUTH_SECRET`: Secret key for NextAuth.js (generate a secure random string)

### Optional

- `AUTH_ALLOWED_EMAILS`: Comma-separated list of email addresses allowed to sign up and sign in
  - If not set, all emails are allowed
  - Example: `user1@example.com,user2@example.com`

### Security Notes

- Never commit your `.env` file to version control
- Use strong, unique values for `AUTH_SECRET`
- Consider using a secrets manager in production
- The `AUTH_ALLOWED_EMAILS` feature is useful for private betas or restricted access

## Development

### Database

- **Push schema changes**: `pnpm db:push`
- **Generate Prisma client**: `pnpm db:generate`
- **Reset database**: `pnpm db:reset`

### Code Quality

- **Lint**: `pnpm lint`
- **Type check**: `pnpm type-check`
- **Format**: `pnpm format`

## Deployment

This app is deployed to:

- **Vercel**: Recommended for Next.js apps

Follow the [T3 Stack deployment guides](https://create.t3.gg/en/deployment) for detailed instructions.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License.
