import { type PrismaClient} from "@prisma/client"

export async function getCategories(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>
) {
  return await tx.category.findMany({
    where: {
      deleted: null,
    },
    orderBy: {
      name: 'asc',
    },
  })
} 