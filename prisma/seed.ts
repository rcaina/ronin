import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create demo accounts
  const demoAccount = await prisma.account.create({
    data: {
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

  for (const user of users) {
    await prisma.user.create({
      data: user,
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