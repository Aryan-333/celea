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
      <main className="relative pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8">
            <span className="w-2 h-2 rounded-full bg-[rgb(238,133,125)] animate-pulse" />
            <span className="text-sm text-white/70">
              AI-Native Automation for Hollywood
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.1]">
            <span className="text-white">Create Cinematic</span>
            <br />
            <span className="bg-gradient-to-r from-[rgb(238,133,125)] via-[rgb(193,202,241)] to-[rgb(124,199,212)] bg-clip-text text-transparent">
              Videos with AI
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-12 leading-relaxed">
            Stop iterating manually. Celea&apos;s intelligent pipeline uses Gemini 2.5 Pro
            and Veo 3.1 to automatically refine and perfect your videos
            until they match your vision.
          </p>

          {/* CTA Button */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
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
              <Link href="#how-it-works">See How It Works</Link>
            </Button>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto" id="how-it-works">
            <FeatureCard
              icon={
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
                  />
                </svg>
              }
              title="Prompt Enhancement"
              description="Gemini 2.5 Pro transforms your ideas into cinema-grade prompts with precise camera work, lighting, and composition."
              color="rgb(238,133,125)"
            />
            <FeatureCard
              icon={
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M19.125 12h1.5m0 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h1.5m14.25 0h1.5"
                  />
                </svg>
              }
              title="Video Generation"
              description="Veo 3.1 brings your vision to life with state-of-the-art video synthesis and reference image integration."
              color="rgb(193,202,241)"
            />
            <FeatureCard
              icon={
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
                  />
                </svg>
              }
              title="Quality Analysis"
              description="Gemini 2.5 Pro evaluates each output against your goals, triggering automatic refinements until perfect."
              color="rgb(124,199,212)"
            />
          </div>
        </div>

        {/* Pipeline Visualization */}
        <div className="max-w-4xl mx-auto mt-24">
          <h2 className="text-2xl font-semibold text-center mb-12 text-white/80">
            Intelligent Refinement Pipeline
          </h2>
          <div className="relative">
            {/* Connection line */}
            <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-y-1/2" />

            <div className="grid grid-cols-5 gap-4 relative">
              <PipelineStep number={1} label="Your Prompt" active />
              <PipelineStep number={2} label="Enhance" />
              <PipelineStep number={3} label="Generate" />
              <PipelineStep number={4} label="Analyze" />
              <PipelineStep number={5} label="Perfect Video" final />
            </div>

            {/* Refinement loop indicator */}
            <div className="flex justify-center mt-8">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                <svg
                  className="w-4 h-4 text-[rgb(238,133,125)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span className="text-sm text-white/60">
                  Auto-refines up to 5 times until quality passes
                </span>
              </div>
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
              © 2024 Celea. AI-Native Video Automation.
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

function FeatureCard({
  icon,
  title,
  description,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <div className="group relative p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all hover:bg-white/[0.05]">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
        style={{ backgroundColor: `${color}20`, color }}
      >
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-white/50 leading-relaxed">{description}</p>
    </div>
  );
}

function PipelineStep({
  number,
  label,
  active,
  final,
}: {
  number: number;
  label: string;
  active?: boolean;
  final?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
          final
            ? "bg-[rgb(238,133,125)] text-white shadow-lg shadow-[rgb(238,133,125)]/30"
            : active
            ? "bg-white/10 text-white border-2 border-[rgb(238,133,125)]"
            : "bg-white/5 text-white/60 border border-white/10"
        }`}
      >
        {final ? "✓" : number}
      </div>
      <span
        className={`text-xs ${final ? "text-[rgb(238,133,125)]" : "text-white/50"}`}
      >
        {label}
      </span>
    </div>
  );
}
