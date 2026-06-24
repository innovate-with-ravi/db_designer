// import "dotenv/config";
// import { PrismaMariaDb } from "@prisma/adapter-mariadb";
// import { PrismaClient } from "@/generated/prisma/client";

// const adapter = new PrismaMariaDb({
//     host: process.env.DATABASE_HOST,
//     user: process.env.DATABASE_USER,
//     password: process.env.DATABASE_PASSWORD,
//     database: process.env.DATABASE_NAME,
//     connectionLimit: 5,
//     allowPublicKeyRetrieval: true,
// });
// const prisma = new PrismaClient({ adapter });

// export { prisma };

import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma