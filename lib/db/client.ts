import { PrismaClient } from "@prisma/client";

// Standard Next.js dev-mode singleton pattern to avoid exhausting
// connections on hot reload.
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
