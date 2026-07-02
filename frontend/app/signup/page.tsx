"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { Card, CardContent, TextField, InputGroup, Label, Button } from "@heroui/react";

export default function SignUpPage() {
  const { signup, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, isLoading, router]);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!name.trim()) {
      setError("Full name is required.");
      return;
    }
    if (!email.trim()) {
      setError("Email address is required.");
      return;
    }
    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!password.trim()) {
      setError("Password is required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    const result = await signup(email, password, name);

    if (result.success) {
      router.push("/");
    } else {
      setError(result.error || "Signup failed.");
      setIsSubmitting(false);
    }
  };

  // Show nothing while checking auth state
  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="w-10 h-10 rounded-full border-4 border-outline-variant border-t-primary animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) return null;

  return (
    <div className="h-screen w-full flex items-center justify-center bg-background p-4 md:p-6 overflow-y-auto font-sans">
      <Card 
        className={`w-full max-w-[450px] md:max-w-[850px] border border-outline-variant/40 shadow-xl overflow-hidden rounded-2xl transition-all duration-700 ease-out ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        }`}
      >
        <CardContent className="p-0 flex flex-col md:flex-row min-h-[550px]">
          {/* LEFT BRANDING PANEL - Shown on desktop only */}
          <div className="hidden md:flex md:w-[42%] bg-inverse-surface flex-col justify-between p-8 relative overflow-hidden text-white flex-shrink-0 border-r border-outline-variant/10">
            {/* Decorative background elements */}
            <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-secondary/15 blur-3xl" />
            <div className="absolute -bottom-32 -left-16 w-96 h-96 rounded-full bg-primary-fixed/5 blur-3xl" />

            {/* Logo & Branding */}
            <div className="relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center shadow-md">
                  <span
                    className="material-symbols-outlined text-primary text-[20px] font-bold"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    clinical_notes
                  </span>
                </div>
                <div className="flex flex-col">
                  <h1 className="font-bold text-primary-fixed text-[20px] leading-tight tracking-tight">
                    MedicoAgenticAI
                  </h1>
                  <span className="text-[8px] text-surface-variant/60 uppercase tracking-[0.2em] font-bold mt-0.5">
                    Clinical Intelligence System
                  </span>
                </div>
              </div>

              <div className="mt-10 space-y-3">
                <h2 className="text-inverse-on-surface text-[24px] font-bold leading-tight">
                  Join the Future of
                  <br />
                  Clinical Intelligence
                </h2>
                <p className="text-surface-variant/70 text-[13px] leading-relaxed max-w-[280px]">
                  Start analyzing medical reports with AI-powered precision, validated by human expertise.
                </p>
              </div>

              {/* Platform Features */}
              <div className="mt-8 space-y-4">
                {[
                  {
                    icon: "description",
                    title: "Layout-Aware OCR",
                    desc: "Extract text from complex medical reports with high fidelity",
                  },
                  {
                    icon: "hub",
                    title: "Multi-Agent RAG",
                    desc: "AI-powered retrieval-augmented generation for Q&A",
                  },
                  {
                    icon: "verified_user",
                    title: "HITL Validation",
                    desc: "Human-in-the-loop verification before submit",
                  },
                ].map((feature) => (
                  <div key={feature.icon} className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-primary-fixed-dim text-[15px]">
                        {feature.icon}
                      </span>
                    </div>
                    <div>
                      <span className="text-[12px] font-bold text-inverse-on-surface block leading-none mb-0.5">
                        {feature.title}
                      </span>
                      <span className="text-[10.5px] text-surface-variant/60 leading-relaxed block">
                        {feature.desc}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Version */}
            <div className="relative z-10 text-surface-variant/40 text-[8px] font-bold tracking-[0.15em] uppercase">
              v4.2 Clinical Protocol • MedicGraph
            </div>
          </div>

          {/* RIGHT SIGN-UP FORM PANEL - Always shown */}
          <div className="w-full md:w-[58%] bg-white p-8 flex flex-col justify-between">
            <div>
              {/* Heading */}
              <div className="text-center md:text-left mb-5">
                {/* Logo visible on Mobile layout */}
                <div className="flex md:hidden items-center justify-center gap-2.5 mb-4">
                  <div className="w-9 h-9 rounded-lg bg-secondary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-secondary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      clinical_notes
                    </span>
                  </div>
                  <h1 className="font-bold text-on-surface text-[18px] tracking-tight">MedicoAgenticAI</h1>
                </div>
                <h2 className="text-[22px] font-bold text-on-surface mb-1">
                  Create Account
                </h2>
                <p className="text-on-surface-variant text-[13px]">
                  Join the clinical intelligence platform
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 flex items-center gap-2 bg-error-container/20 border border-error/20 text-error rounded-lg px-3.5 py-2.5 text-[12px] animate-[fadeIn_0.2s_ease-out]">
                  <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    warning
                  </span>
                  <span>{error}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <TextField 
                  name="name" 
                  type="text"
                  value={name} 
                  onChange={setName}
                  isDisabled={isSubmitting}
                  className="w-full flex flex-col gap-1.5 text-left"
                >
                  <Label className="text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-[0.05em]">
                    Full Name
                  </Label>
                  <InputGroup className="border-outline-variant h-10.5 focus-within:!border-secondary border rounded-lg flex items-center bg-white">
                    <InputGroup.Prefix className="pl-3 pr-2 flex items-center text-outline">
                      <span className="material-symbols-outlined text-[18px]">person</span>
                    </InputGroup.Prefix>
                    <InputGroup.Input 
                      id="signup-name"
                      placeholder="Dr. Jane Doe"
                      autoComplete="name"
                      className="w-full h-full text-[14px] text-on-surface bg-transparent focus:outline-none pr-3"
                    />
                  </InputGroup>
                </TextField>

                <TextField 
                  name="email" 
                  type="email"
                  value={email} 
                  onChange={setEmail}
                  isDisabled={isSubmitting}
                  className="w-full flex flex-col gap-1.5 text-left"
                >
                  <Label className="text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-[0.05em]">
                    Email Address
                  </Label>
                  <InputGroup className="border-outline-variant h-10.5 focus-within:!border-secondary border rounded-lg flex items-center bg-white">
                    <InputGroup.Prefix className="pl-3 pr-2 flex items-center text-outline">
                      <span className="material-symbols-outlined text-[18px]">email</span>
                    </InputGroup.Prefix>
                    <InputGroup.Input 
                      id="signup-email"
                      placeholder="doctor@hospital.com"
                      autoComplete="email"
                      className="w-full h-full text-[14px] text-on-surface bg-transparent focus:outline-none pr-3"
                    />
                  </InputGroup>
                </TextField>

                <TextField 
                  name="password"
                  value={password} 
                  onChange={setPassword}
                  isDisabled={isSubmitting}
                  className="w-full flex flex-col gap-1.5 text-left"
                >
                  <Label className="text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-[0.05em]">
                    Password
                  </Label>
                  <InputGroup className="border-outline-variant h-10.5 focus-within:!border-secondary border rounded-lg flex items-center bg-white">
                    <InputGroup.Prefix className="pl-3 pr-2 flex items-center text-outline">
                      <span className="material-symbols-outlined text-[18px]">lock</span>
                    </InputGroup.Prefix>
                    <InputGroup.Input 
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 6 characters"
                      autoComplete="new-password"
                      className="w-full h-full text-[14px] text-on-surface bg-transparent focus:outline-none"
                    />
                    <InputGroup.Suffix className="pr-3 pl-2 flex items-center">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-outline hover:text-on-surface-variant transition-colors focus:outline-none cursor-pointer"
                        tabIndex={-1}
                      >
                        <span className="material-symbols-outlined text-[18px] mt-0.5">
                          {showPassword ? "visibility_off" : "visibility"}
                        </span>
                      </button>
                    </InputGroup.Suffix>
                  </InputGroup>
                </TextField>

                <TextField 
                  name="confirmPassword"
                  value={confirmPassword} 
                  onChange={setConfirmPassword}
                  isDisabled={isSubmitting}
                  className="w-full flex flex-col gap-1.5 text-left"
                >
                  <Label className="text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-[0.05em]">
                    Confirm Password
                  </Label>
                  <InputGroup className="border-outline-variant h-10.5 focus-within:!border-secondary border rounded-lg flex items-center bg-white">
                    <InputGroup.Prefix className="pl-3 pr-2 flex items-center text-outline">
                      <span className="material-symbols-outlined text-[18px]">lock</span>
                    </InputGroup.Prefix>
                    <InputGroup.Input 
                      id="signup-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter your password"
                      autoComplete="new-password"
                      className="w-full h-full text-[14px] text-on-surface bg-transparent focus:outline-none"
                    />
                    <InputGroup.Suffix className="pr-3 pl-2 flex items-center">
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="text-outline hover:text-on-surface-variant transition-colors focus:outline-none cursor-pointer"
                        tabIndex={-1}
                      >
                        <span className="material-symbols-outlined text-[18px] mt-0.5">
                          {showConfirmPassword ? "visibility_off" : "visibility"}
                        </span>
                      </button>
                    </InputGroup.Suffix>
                  </InputGroup>
                </TextField>

                {/* Submit */}
                <Button
                  id="signup-submit"
                  type="submit"
                  variant="secondary"
                  isPending={isSubmitting}
                  className="w-full py-5 rounded-lg font-bold text-[14px] shadow-sm mt-3 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
                  )}
                  <span>{isSubmitting ? "Creating account..." : "Create Account"}</span>
                </Button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-outline-variant/40" />
                <span className="text-[10px] text-outline font-medium uppercase tracking-wider">
                  or
                </span>
                <div className="flex-1 h-px bg-outline-variant/40" />
              </div>

              {/* Sign In Link */}
              <p className="text-center text-[13px] text-on-surface-variant">
                Already have an account?{" "}
                <Link
                  href="/signin"
                  className="text-primary font-bold hover:underline transition-colors"
                >
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
