import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
    globalForPrisma.prisma ||
    // @ts-ignore
    new PrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma