// // TEST CODE FOR AUTH

// import { auth, signIn, signOut } from "@/auth"

// import type { Metadata } from 'next'

// export const metadata: Metadata = {
//   title: 'Home',
//   description: 'Hero section',
// }

// export default async function Dashboard() {
//   // 1. Fetch the active session directly on the server!
//   const session = await auth();
//   console.log("session:", session);


//   if (!session?.user) {
//     return (
//       <div className="flex items-center justify-center h-screen gap-5">

//         <button
//           type="submit"
//           className="bg-blue-600 text-white px-6 py-3 rounded-md font-bold hover:bg-blue-700"
//           onClick={async () => {
//             "use server";
//             await signIn("google");
//           }}
//         >
//           Sign In with Google
//         </button>
//         <button
//           type="submit"
//           className="bg-blue-600 text-white px-6 py-3 rounded-md font-bold hover:bg-blue-700"
//           onClick={async () => {
//             "use server";
//             await signIn("github");
//           }}
//         >
//           Sign In with GITHUB
//         </button>
//       </div>
//     );
//   }

//   return (
//     <div className="p-8">
//       <h1 className="text-2xl font-bold mb-4">Welcome back, {session.user.name}</h1>
//       <form action={async () => {
//         "use server";
//         await signOut();
//       }}>
//         <button type="submit" className="bg-red-600 text-white px-4 py-2 rounded font-semibold hover:bg-red-700">
//           Sign Out
//         </button>
//       </form>
//     </div>
//   );
// }

import { auth, signIn } from "@/auth";
import Link from "next/link";
import HeroSection from "@/app/components/landing/HeroSection";
import FeatureBento from "@/app/components/landing/FeatureBento";
import Footer from "./components/landing/Footer";
import ThemeToggle from "./components/ThemeToggle";

export default async function LandingPage() {
  // 1. Check auth state on the server (Zero latency!)
  const session = await auth();

  // 2. The Google Sign-In Action
  const handleGoogleLogin = async (provider: string = 'google') => {
    "use server";
    await signIn(provider, { redirectTo: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white selection:bg-blue-500/30">
      {/* --- TOP NAVBAR --- */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#0B0F19]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="font-bold text-xl tracking-tighter flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-tr from-blue-600 to-emerald-400" />
            DB Designer
          </div>

          <div className="flex items-center gap-6 text-sm font-medium text-slate-300">
            <Link href="/docs" className="hover:text-white transition-colors">Documentation</Link>
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>

            {session?.user ? (
              <Link href="/dashboard" className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full transition-all border border-white/10">
                Dashboard
              </Link>
            ) : (
              <form action={handleGoogleLogin}>
                <button type="submit" className="bg-white text-black hover:bg-slate-200 px-4 py-2 rounded-full transition-all font-bold">
                  Sign In
                </button>
              </form>
            )}

            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* --- MAIN CONTENT --- */}
      <main className="pt-32 pb-16 px-6">
        <HeroSection isAuthenticated={!!session?.user} loginAction={handleGoogleLogin} />
        <FeatureBento />
      </main>

      {/* FOOTER */}
      <Footer />
    </div>
  );
}