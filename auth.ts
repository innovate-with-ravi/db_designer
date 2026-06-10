// This is a single configuration file that this entire Next.js app will use to verify users

import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

export const { handlers, signIn, signOut, auth } = NextAuth({
    adapter: PrismaAdapter(prisma),
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
        GitHub({
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
        }),
    ],
    session: {
        strategy: "jwt",
    },

    callbacks: {
        async session({ session, token, user }: any) {
            // If using JWT strategy, the ID is in the token.sub
            if (token && token.sub) {
                session.user.id = token.sub;
            }
            // If using Database strategy, the ID is in the user object
            else if (user && user.id) {
                session.user.id = user.id;
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