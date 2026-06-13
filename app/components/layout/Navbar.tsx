import Link from "next/link";
import { auth, signIn, signOut } from "@/auth";
import ThemeToggle from "@/app/components/ThemeToggle";

// Accept a prop so we know if we are on the Landing Page or Dashboard
export default async function Navbar({ isLandingPage = false }: { isLandingPage?: boolean }) {
    const session = await auth();

    const handleGoogleLogin = async () => {
        "use server";
        await signIn("google",
            // { redirectTo: "/dashboard" }
        );
    };

    const handleLogout = async () => {
        "use server";
        await signOut({ redirectTo: "/" });
    };

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

                {/* 1. Brand Logo */}
                <Link href="/" className="font-bold text-lg sm:text-xl tracking-tighter flex items-center gap-2 text-foreground hover:opacity-80 transition-opacity">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-gradient-to-tr from-brand-blue to-brand-emerald shrink-0" />
                    <span className="hidden sm:block">DB Designer</span>
                    <span className="sm:hidden">DBD</span>
                </Link>

                {/* 2. Navigation & Actions */}
                <div className="flex items-center gap-3 sm:gap-6 text-sm font-medium text-muted-foreground">

                    {/* Show Docs/Features only if they aren't deep in the app */}
                    <Link href="/docs" className="hidden md:block hover:text-foreground transition-colors">Documentation</Link>
                    {isLandingPage ? (
                        <>
                            <Link href="#features" className="hidden md:block hover:text-foreground transition-colors">Features</Link>
                        </>
                    ) :
                        (
                            <>
                                <Link href="/" className="hidden md:block hover:text-foreground transition-colors">Home</Link>
                            </>
                        )}

                    {session?.user ? (
                        <div className="flex items-center gap-3 sm:gap-4">
                            {/* Only show Dashboard button if they are on the landing page */}
                            {isLandingPage && (
                                <Link href="/dashboard" className="bg-foreground text-background hover:opacity-90 px-4 py-2 rounded-full transition-all font-bold whitespace-nowrap shadow-sm">
                                    Dashboard
                                </Link>
                            )}

                            {/* Sign Out (Specifically requested for the Landing Page!) */}
                            {isLandingPage && (
                                <form action={handleLogout}>
                                    <button type="submit" className="text-muted-foreground hover:text-destructive transition-colors font-medium whitespace-nowrap">
                                        Sign Out
                                    </button>
                                </form>
                            )}
                        </div>
                    ) : (
                        <form action={handleGoogleLogin}>
                            <button type="submit" className="bg-foreground text-background hover:opacity-90 px-4 py-2 rounded-full transition-all font-bold whitespace-nowrap shadow-sm">
                                Sign In
                            </button>
                        </form>
                    )}

                    <ThemeToggle />
                </div>
            </div>
        </nav>
    );
}