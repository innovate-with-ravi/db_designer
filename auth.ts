import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

export const { handlers, signIn, signOut, auth } = NextAuth({
    // 🌟 UNCOMMENT THIS LINE:
    adapter: PrismaAdapter(prisma) as any,

    providers: [
        Google({
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



// // for mySql - locally
// import NextAuth from "next-auth"
// import Google from "next-auth/providers/google"
// import GitHub from "next-auth/providers/github"
// import { PrismaAdapter } from "@auth/prisma-adapter"
// import { prisma } from "@/lib/prisma"

// export const { handlers, signIn, signOut, auth } = NextAuth({
//     adapter: PrismaAdapter(prisma),
//     providers: [
//         Google({
//             clientId: process.env.GOOGLE_CLIENT_ID,
//             clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//         }),
//         GitHub({
//             clientId: process.env.GITHUB_CLIENT_ID,
//             clientSecret: process.env.GITHUB_CLIENT_SECRET,
//         }),
//     ],
//     session: {
//         strategy: "jwt",
//     },

//     callbacks: {
//         async session({ session, token, user }: any) {
//             // If using JWT strategy, the ID is in the token.sub
//             if (token && token.sub) {
//                 session.user.id = token.sub;
//             }
//             // If using Database strategy, the ID is in the user object
//             else if (user && user.id) {
//                 session.user.id = user.id;
//             }
//             return session;
//         },
//         async jwt({ token, user }: any) {
//             if (user) {
//                 token.sub = user.id;
//             }
//             return token;
//         }
//     },
// })