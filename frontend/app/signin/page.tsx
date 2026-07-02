"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { Card, CardContent, TextField, InputGroup, Label, Button, Checkbox } from "@heroui/react";

export default function SignInPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Animation mount trigger
  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Email address is required.");
      return;
    }
    if (!password.trim()) {
      setError("Password is required.");
      return;
    }

    setIsSubmitting(true);
    const result = await login(email, password);

    if (result.success) {
      router.push("/");
    } else {
      setError(result.error || "Login failed.");
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
        <CardContent className="p-0 flex flex-col md:flex-row min-h-[520px]">
          {/* LEFT BRANDING PANEL - Shown on desktop only */}
          <div className="hidden md:flex md:w-[42%] bg-inverse-surface flex-col justify-between p-8 relative overflow-hidden text-white flex-shrink-0 border-r border-outline-variant/10">
            {/* Decorative background circles */}
            <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-primary/15 blur-3xl" />
            <div className="absolute -bottom-32 -right-16 w-96 h-96 rounded-full bg-primary-fixed/5 blur-3xl" />

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
                  Intelligent Medical
                  <br />
                  Report Analysis
                </h2>
                <p className="text-surface-variant/70 text-[13px] leading-relaxed max-w-[280px]">
                  Powered by OCR, Vector Search, and LLM-driven Retrieval-Augmented Generation for clinical excellence.
                </p>
              </div>

              {/* Feature indicators */}
              <div className="mt-8 space-y-3">
                {[
                  { icon: "description", label: "Layout-Aware OCR Extraction" },
                  { icon: "hub", label: "Multi-Agent RAG Pipeline" },
                  { icon: "verified_user", label: "Human-in-the-Loop Validation" },
                ].map((feature) => (
                  <div
                    key={feature.icon}
                    className="flex items-center gap-2.5 text-surface-variant/80"
                  >
                    <div className="w-7.5 h-7.5 rounded-lg bg-primary/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary-fixed-dim text-[14px]">
                        {feature.icon}
                      </span>
                    </div>
                    <span className="text-[12px] font-medium">{feature.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Version */}
            <div className="relative z-10 text-surface-variant/40 text-[8px] font-bold tracking-[0.15em] uppercase">
              v4.2 Clinical Protocol • MedicGraph
            </div>
          </div>

          {/* RIGHT SIGN-IN FORM PANEL - Always shown */}
          <div className="w-full md:w-[58%] bg-white p-8 flex flex-col justify-between">
            <div>
              {/* Heading */}
              <div className="text-center md:text-left mb-6">
                {/* Logo visible on Mobile layout */}
                <div className="flex md:hidden items-center justify-center gap-2.5 mb-4">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      clinical_notes
                    </span>
                  </div>
                  <h1 className="font-bold text-on-surface text-[18px] tracking-tight">MedicoAgenticAI</h1>
                </div>
                <h2 className="text-[22px] font-bold text-on-surface mb-1">
                  Welcome Back
                </h2>
                <p className="text-on-surface-variant text-[13px]">
                  Sign in to access your clinical workbench
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
              <form onSubmit={handleSubmit} className="space-y-4">
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
                  <InputGroup className="border-outline-variant h-11 focus-within:!border-primary border rounded-lg flex items-center bg-white">
                    <InputGroup.Prefix className="pl-3 pr-2 flex items-center text-outline">
                      <span className="material-symbols-outlined text-[18px]">email</span>
                    </InputGroup.Prefix>
                    <InputGroup.Input 
                      id="signin-email"
                      placeholder="admin@medicograph.dev"
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
                  <InputGroup className="border-outline-variant h-11 focus-within:!border-primary border rounded-lg flex items-center bg-white">
                    <InputGroup.Prefix className="pl-3 pr-2 flex items-center text-outline">
                      <span className="material-symbols-outlined text-[18px]">lock</span>
                    </InputGroup.Prefix>
                    <InputGroup.Input 
                      id="signin-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      autoComplete="current-password"
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

                {/* Remember + Forgot */}
                <div className="flex items-center justify-between pt-1">
                  <Checkbox
                    isSelected={rememberMe}
                    onChange={setRememberMe}
                    id="signin-remember"
                  >
                    <Checkbox.Content className="flex items-center gap-2">
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <span className="text-[12px] text-on-surface-variant hover:text-on-surface transition-colors select-none">
                        Remember me
                      </span>
                    </Checkbox.Content>
                  </Checkbox>
                  <button
                    type="button"
                    className="text-[12px] text-primary hover:underline font-medium transition-colors cursor-pointer focus:outline-none"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Submit */}
                <Button
                  id="signin-submit"
                  type="submit"
                  variant="primary"
                  isPending={isSubmitting}
                  className="w-full py-5 rounded-lg font-bold text-[14px] shadow-sm mt-3 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined text-[18px]">login</span>
                  )}
                  <span>{isSubmitting ? "Authenticating..." : "Sign In"}</span>
                </Button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-outline-variant/40" />
                <span className="text-[10px] text-outline font-medium uppercase tracking-wider">
                  or
                </span>
                <div className="flex-1 h-px bg-outline-variant/40" />
              </div>

              {/* Sign Up Link */}
              <p className="text-center text-[13px] text-on-surface-variant">
                Don&apos;t have an account?{" "}
                <Link
                  href="/signup"
                  className="text-primary font-bold hover:underline transition-colors"
                >
                  Sign Up
                </Link>
              </p>
            </div>

            {/* Test credentials hint */}
            <div className="mt-4 text-center">
              <div className="inline-flex items-center gap-2 bg-primary/5 border border-primary/12 rounded-lg px-3.5 py-2">
                <span className="material-symbols-outlined text-primary text-[14px]">info</span>
                <span className="text-[10px] text-on-surface-variant">
                  Test:{" "}
                  <code className="font-mono text-primary font-bold">admin@medicograph.dev</code>
                  {" / "}
                  <code className="font-mono text-primary font-bold">admin123</code>
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
