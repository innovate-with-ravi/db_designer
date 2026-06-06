import { auth, signIn } from "@/auth";
import Link from "next/link";
import HeroSection from "@/app/components/landing/HeroSection";
import FeatureBento from "@/app/components/landing/FeatureBento";
import Footer from "./components/landing/Footer";
import ThemeToggle from "./components/ThemeToggle";

export default async function LandingPage() {
  const session = await auth();

  const handleGoogleLogin = async (provider: string = 'google') => {
    "use server";
    await signIn(provider, { redirectTo: "/dashboard" });
  };

  return (
    <div className="min-h-screen selection:bg-blue-500/30 transition-colors duration-300">
      {/* --- TOP NAVBAR --- */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

          <div className="font-bold text-lg sm:text-xl tracking-tighter flex items-center gap-2 text-foreground">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-gradient-to-tr from-blue-600 to-emerald-400 shrink-0" />
            <span className="hidden sm:block">DB Designer</span>
            <span className="sm:hidden">DBD</span>
          </div>

          <div className="flex items-center gap-3 sm:gap-6 text-sm font-medium text-muted-foreground">
            {/* Hide text links on mobile to save space */}
            <Link href="/docs" className="hidden md:block hover:text-foreground transition-colors">Documentation</Link>
            <Link href="#features" className="hidden md:block hover:text-foreground transition-colors">Features</Link>

            {session?.user ? (
              <Link href="/dashboard" className="bg-foreground text-background hover:opacity-90 px-4 py-2 rounded-full transition-all font-bold whitespace-nowrap">
                Dashboard
              </Link>
            ) : (
              <form action={handleGoogleLogin}>
                <button type="submit" className="bg-foreground text-background hover:opacity-90 px-4 py-2 rounded-full transition-all font-bold whitespace-nowrap">
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