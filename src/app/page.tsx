import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10">
        {/* Gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-[rgb(238,133,125)] opacity-20 blur-[120px] animate-float" />
        <div
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-[rgb(193,202,241)] opacity-15 blur-[100px] animate-float"
          style={{ animationDelay: "-2s" }}
        />
        <div
          className="absolute top-1/2 right-1/3 w-[400px] h-[400px] rounded-full bg-[rgb(124,199,212)] opacity-10 blur-[80px] animate-float"
          style={{ animationDelay: "-4s" }}
        />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "100px 100px",
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 py-4">
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center">
            <Image
              src="/celea-logo.png"
              alt="Celea"
              width={78}
              height={78}
              className="rounded-xl"
            />
          </div>
          <div className="flex items-center gap-4 pr-4">
            <Button
              asChild
              className="bg-[rgb(238,133,125)] hover:bg-[rgb(228,113,105)] text-white border-0"
            >
              <Link href="/invite">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative pt-32 pb-20 px-6 flex flex-col items-center justify-center min-h-screen">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8">
            <span className="w-2 h-2 rounded-full bg-[rgb(238,133,125)] animate-pulse" />
            <span className="text-sm text-white/70">
            Build Inserts, Establishing shots, and Background VFX assets
            </span>
          </div>

          {/* Main Logo */}
          <div className="mb-8 flex justify-center">
            <Image
              src="/celea-logo.png"
              alt="Celea"
              width={280}
              height={280}
              className="rounded-3xl"
            />
          </div>

          {/* Tagline */}
          <p className="text-xl md:text-2xl text-white/70 mb-12">
            Celea self-iterates AI videos with customizable visual nodes for Hollywood
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="bg-[rgb(238,133,125)] hover:bg-[rgb(228,113,105)] text-white text-lg px-8 py-6 rounded-xl shadow-lg shadow-[rgb(238,133,125)]/25 transition-all hover:shadow-xl hover:shadow-[rgb(238,133,125)]/30 hover:scale-105"
            >
              <Link href="/invite">Start Creating</Link>
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-center">
          <div className="flex items-center gap-4">
            <Image
              src="/celea-logo.png"
              alt="Celea"
              width={48}
              height={48}
              className="rounded-lg"
            />
            <span className="text-white/60 text-base">
              © 2025 Celea. Self-iterating AI for Hollywood.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
