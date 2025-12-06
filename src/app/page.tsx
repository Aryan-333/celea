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
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/celea-logo.png"
              alt="Celea"
              width={48}
              height={48}
              className="rounded-xl"
            />
            <span className="text-2xl font-semibold tracking-tight">Celea</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/projects"
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              Projects
            </Link>
            <Button
              asChild
              className="bg-[rgb(238,133,125)] hover:bg-[rgb(228,113,105)] text-white border-0"
            >
              <Link href="/projects">Get Started</Link>
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
              AI-Native Automation for Hollywood
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.1]">
            <span className="bg-gradient-to-r from-[rgb(238,133,125)] via-[rgb(193,202,241)] to-[rgb(124,199,212)] bg-clip-text text-transparent">
              Celea
            </span>
            <span className="text-white">, self-iterating AI</span>
            <br />
            <span className="text-white">for final takes in Hollywood</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-12 leading-relaxed">
            Stop iterating manually. Let AI reason about your videos and automatically
            refine them until they match your vision.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Button
              asChild
              size="lg"
              className="bg-[rgb(238,133,125)] hover:bg-[rgb(228,113,105)] text-white text-lg px-8 py-6 rounded-xl shadow-lg shadow-[rgb(238,133,125)]/25 transition-all hover:shadow-xl hover:shadow-[rgb(238,133,125)]/30 hover:scale-105"
            >
              <Link href="/projects">Start Creating</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-white/30 bg-white/10 text-white hover:bg-white/20 text-lg px-8 py-6 rounded-xl"
            >
              <Link href="#how-it-works">Learn More</Link>
            </Button>
          </div>

          {/* How It Works - Simple Card */}
          <div
            id="how-it-works"
            className="max-w-3xl mx-auto p-8 md:p-12 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-sm"
          >
            <h2 className="text-2xl md:text-3xl font-semibold mb-6 text-white">
              How Celea Works
            </h2>
            
            <p className="text-white/70 text-lg leading-relaxed mb-8">
              Celea gives video generation models a <span className="text-[rgb(238,133,125)] font-medium">reasoning capability</span>. 
              Instead of generating a single video and hoping it&apos;s right, Celea creates an 
              intelligent loop:
            </p>

            <div className="space-y-6 text-left">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[rgb(238,133,125)]/20 flex items-center justify-center text-[rgb(238,133,125)] font-semibold">
                  1
                </div>
                <div>
                  <h3 className="text-white font-medium mb-1">Enhance Your Prompt</h3>
                  <p className="text-white/50 text-sm">
                    Gemini 2.5 Pro transforms your rough idea into a cinema-grade prompt with 
                    precise camera work, lighting, and composition details.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[rgb(193,202,241)]/20 flex items-center justify-center text-[rgb(193,202,241)] font-semibold">
                  2
                </div>
                <div>
                  <h3 className="text-white font-medium mb-1">Generate Video</h3>
                  <p className="text-white/50 text-sm">
                    Veo 3.1 creates the video based on the enhanced prompt and any reference 
                    images you&apos;ve provided.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[rgb(124,199,212)]/20 flex items-center justify-center text-[rgb(124,199,212)] font-semibold">
                  3
                </div>
                <div>
                  <h3 className="text-white font-medium mb-1">Analyze & Reason</h3>
                  <p className="text-white/50 text-sm">
                    Gemini watches the generated video and compares it to your original goal. 
                    Does it match? If not, it figures out exactly what&apos;s wrong.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[rgb(248,214,134)]/20 flex items-center justify-center text-[rgb(248,214,134)] font-semibold">
                  ↺
                </div>
                <div>
                  <h3 className="text-white font-medium mb-1">Auto-Refine Until Perfect</h3>
                  <p className="text-white/50 text-sm">
                    If the video doesn&apos;t pass, Celea automatically refines the prompt based 
                    on the analysis and generates again. This loops up to 5 times until you 
                    get the perfect take.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10">
              <p className="text-white/40 text-sm">
                <span className="text-[rgb(238,133,125)]">No more manual iteration.</span>{" "}
                Celea thinks about what went wrong and fixes it automatically.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image
              src="/celea-logo.png"
              alt="Celea"
              width={32}
              height={32}
              className="rounded-lg"
            />
            <span className="text-white/60 text-sm">
              © 2024 Celea. Self-iterating AI for Hollywood.
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-white/40">
            <span>Built with Gemini 2.5 Pro & Veo 3.1</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
