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
        // 1. Triggered whenever a JWT is created or updated
        async jwt({token, user}) {
            if (user) {
                token.id = user.id; // Inject database user ID into the token
            }
            return token;
        },
        // 2. Triggered whenever the session is checked in the browser or server
        async session({ session, token }) {
            // Send properties to the client, like an access_token and user id from a provider. -> see official docs
            if (session.user) {
                session.user.id = token.id as string; // Pass the ID from token to session object
            }
            return session;
        },
    },
})