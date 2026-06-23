import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

export const { handlers, signIn, signOut, auth } = NextAuth({
    // 🌟 THE FIX: Cast to 'any' to stop the Prisma type clashing
    adapter: PrismaAdapter(prisma) as any,

    providers: [
        // 🌟 THE FIX: Pass empty objects to satisfy TypeScript's strict arguments rule
        Google({}),
        GitHub({})
    ],
    session: {
        strategy: "jwt",
    },
    trustHost: true,

    callbacks: {
        async session({ session, token }: any) {
            if (token?.sub) {
                session.user.id = token.sub;
            }
            return session;
        },
        async jwt({ token, user }: any) {
            if (user) {
                token.sub = user.id;
            }
            return token;
        }
    },
})