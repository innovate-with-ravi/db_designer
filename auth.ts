import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

export const { handlers, signIn, signOut, auth } = NextAuth({
    adapter: PrismaAdapter(prisma) as any,
    providers: [
        Google({
            // The OR (||) operator guarantees it finds the key no matter what it's named in Vercel
            clientId: (process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID) as string,
            clientSecret: (process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET) as string,
        }),
        GitHub({
            clientId: (process.env.AUTH_GITHUB_ID || process.env.GITHUB_CLIENT_ID) as string,
            clientSecret: (process.env.AUTH_GITHUB_SECRET || process.env.GITHUB_CLIENT_SECRET) as string,
        })
    ],
    session: {
        strategy: "jwt",
    },
    trustHost: true,
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,

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