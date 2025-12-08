"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function InvitePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Waitlist modal state
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  
  const modalRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showWaitlistModal) {
        closeModal();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showWaitlistModal]);

  // Focus email input when modal opens
  useEffect(() => {
    if (showWaitlistModal && emailInputRef.current) {
      setTimeout(() => emailInputRef.current?.focus(), 100);
    }
  }, [showWaitlistModal]);

  const closeModal = () => {
    setShowWaitlistModal(false);
    setEmail("");
    setEmailError("");
    setWaitlistSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/verify-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        router.push("/projects");
      } else {
        setError(data.error || "Invalid invite code");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    setIsSubmittingEmail(true);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setWaitlistSuccess(true);
        setSuccessMessage(data.message);
      } else {
        setEmailError(data.error || "Something went wrong");
      }
    } catch {
      setEmailError("Something went wrong. Please try again.");
    } finally {
      setIsSubmittingEmail(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden flex flex-col">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-[rgb(238,133,125)] opacity-20 blur-[120px] animate-float" />
        <div
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-[rgb(193,202,241)] opacity-15 blur-[100px] animate-float"
          style={{ animationDelay: "-2s" }}
        />
        <div
          className="absolute top-1/2 right-1/3 w-[400px] h-[400px] rounded-full bg-[rgb(124,199,212)] opacity-10 blur-[80px] animate-float"
          style={{ animationDelay: "-4s" }}
        />
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
      <nav className="py-4">
        <div className="flex items-center px-4">
          <Link href="/">
            <Image
              src="/celea-logo.png"
              alt="Celea"
              width={78}
              height={78}
              className="rounded-xl cursor-pointer hover:opacity-80 transition-opacity"
            />
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 backdrop-blur-xl">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <Image
                src="/celea-logo.png"
                alt="Celea"
                width={80}
                height={80}
                className="rounded-xl"
              />
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-center mb-2">
              Enter Invite Code
            </h1>
            <p className="text-white/50 text-center text-sm mb-8">
              Celea is currently in private beta. Enter your invite code to access the platform.
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  type="text"
                  value={code}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
                    setCode(value);
                    setError("");
                  }}
                  placeholder="XXXXXX"
                  className="w-full h-14 text-center text-2xl font-mono tracking-[0.5em] bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-[rgb(238,133,125)] focus:ring-[rgb(238,133,125)]"
                  maxLength={6}
                  autoComplete="off"
                  autoFocus
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div className="text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20 rounded-lg py-2 px-3">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={code.length !== 6 || isLoading}
                className="w-full h-12 bg-[rgb(238,133,125)] hover:bg-[rgb(228,113,105)] text-white text-lg font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Verifying...
                  </span>
                ) : (
                  "Access Celea"
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 mt-6">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-white/30 text-xs uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Waitlist Button */}
            <Button
              type="button"
              onClick={() => setShowWaitlistModal(true)}
              className="w-full h-12 mt-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white text-base font-medium rounded-xl transition-all"
            >
              Join the Waitlist
            </Button>
          </div>

          {/* Back link */}
          <div className="text-center mt-6">
            <Link
              href="/"
              className="text-white/40 text-sm hover:text-white/60 transition-colors"
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </main>

      {/* Waitlist Modal */}
      {showWaitlistModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          {/* Backdrop with blur */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          
          {/* Modal */}
          <div 
            ref={modalRef}
            className="relative w-full max-w-sm mx-4 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="bg-[#12121a] border border-white/10 rounded-2xl p-6 shadow-2xl">
              {/* Close button */}
              <button
                onClick={closeModal}
                className="absolute top-4 right-4 text-white/40 hover:text-white/70 transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>

              {!waitlistSuccess ? (
                <>
                  {/* Header */}
                  <div className="text-center mb-6">
                    <div className="w-12 h-12 rounded-full bg-[rgb(238,133,125)]/10 flex items-center justify-center mx-auto mb-4">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgb(238,133,125)" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Join the Waitlist</h2>
                    <p className="text-white/50 text-sm">
                      Be the first to know when we open up more spots.
                    </p>
                  </div>

                  {/* Email Form */}
                  <form onSubmit={handleWaitlistSubmit} className="space-y-4">
                    <div>
                      <Input
                        ref={emailInputRef}
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setEmailError("");
                        }}
                        placeholder="you@email.com"
                        className="w-full h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[rgb(238,133,125)] focus:ring-[rgb(238,133,125)] rounded-xl"
                        disabled={isSubmittingEmail}
                      />
                    </div>

                    {emailError && (
                      <div className="text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20 rounded-lg py-2 px-3">
                        {emailError}
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={!email || isSubmittingEmail}
                      className="w-full h-11 bg-[rgb(238,133,125)] hover:bg-[rgb(228,113,105)] text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {isSubmittingEmail ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          Joining...
                        </span>
                      ) : (
                        "Join Waitlist"
                      )}
                    </Button>
                  </form>

                  <p className="text-white/20 text-xs text-center mt-4">
                    No spam, just your invite code when it&apos;s ready.
                  </p>
                </>
              ) : (
                /* Success State */
                <div className="text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgb(34,197,94)" strokeWidth="2">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">You&apos;re on the list!</h2>
                  <p className="text-white/50 text-sm mb-6">
                    {successMessage}
                  </p>
                  <Button
                    onClick={closeModal}
                    className="w-full h-11 bg-white/10 hover:bg-white/15 text-white font-medium rounded-xl transition-all"
                  >
                    Got it
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
