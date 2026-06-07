import { auth, signIn } from "@/auth";
import HeroSection from "@/app/components/landing/HeroSection";
import FeatureBento from "@/app/components/landing/FeatureBento";
import Footer from "./components/landing/Footer";
import Navbar from "./components/layout/Navbar";

export default async function LandingPage() {
  const session = await auth();

  const handleGoogleLogin = async (provider: string = 'google') => {
    "use server";
    await signIn(provider,
      // { redirectTo: "/dashboard" }
    );
  };

  return (
    <div className="min-h-screen selection:bg-blue-500/30 transition-colors duration-300">

      {/* 🌟 The Universal Navbar */}
      <Navbar isLandingPage={true} />

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