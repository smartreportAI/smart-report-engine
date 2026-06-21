"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/context";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import Image from "next/image";
import type { ApiError } from "@/lib/api/client";

// Animation Variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
  },
};

const features = [
  "The Intelligent Engine for Medical Reporting.",
  "AI-Powered Diagnostic Explanations.",
  "Secure, Compliant, and Blazing Fast.",
  "Elevating the Patient Experience."
];

export default function LoginPage() {
  const { login, isAuthenticated, user, isLoading } = useAuth();
  const router = useRouter();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [featureIndex, setFeatureIndex] = useState(0);

  // Marketing Text Carousel Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setFeatureIndex((prev) => (prev + 1) % features.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      const target = user.role === "client" || user.role === "lab_staff"
        ? "/client/dashboard"
        : "/admin/dashboard";
      router.replace(target);
    }
  }, [isLoading, isAuthenticated, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login(email, password);
      // After login succeeds, the useEffect above will handle redirect
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "Login failed. Check your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Show loading while checking auth
  if (isLoading || isAuthenticated) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 rounded-full border-2 border-slate-300 border-t-slate-900 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] selection:bg-slate-900 selection:text-white bg-white">
      
      {/* ── Left Side: Marketing Panel (Hidden on Mobile) ── */}
      <div className="relative hidden lg:flex flex-col justify-end p-12 overflow-hidden bg-slate-900">
        {/* Background Image */}
        <Image 
          src="/marketing-bg.png" 
          alt="Ethereal Data Streams" 
          fill 
          priority
          className="object-cover opacity-80 mix-blend-screen"
        />
        
        {/* Deep Gradient Overlay for Text Legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/40 to-transparent" />

        {/* Content */}
        <div className="relative z-10 w-full max-w-2xl mb-8">
          <div className="w-12 h-1 bg-white/20 rounded-full mb-10" />
          
          <div className="min-h-[140px]">
            <AnimatePresence mode="wait">
              <motion.h2
                key={featureIndex}
                initial={{ opacity: 0, y: 15, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -15, filter: "blur(8px)" }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="text-5xl font-semibold text-white tracking-tight leading-[1.15]"
              >
                {features[featureIndex]}
              </motion.h2>
            </AnimatePresence>
          </div>
          
          <p className="text-lg font-medium text-slate-300 mt-6 tracking-wide">
            The next generation of automated reporting.
          </p>
        </div>
      </div>

      {/* ── Right Side: Interactive Login Panel ── */}
      <div className="flex flex-col items-center justify-center p-6 sm:p-12 lg:p-16 relative overflow-hidden bg-slate-50">
        
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-[420px] relative z-10"
        >
          {/* Logo & Header */}
          <motion.div variants={itemVariants} className="mb-12">
            <div className="flex items-center gap-4 mb-6">
              <div className="relative w-12 h-12 bg-white rounded-xl shadow-[0_4px_20px_rgb(0,0,0,0.06)] border border-slate-100 flex items-center justify-center overflow-hidden p-1 shrink-0">
                <Image 
                  src="/logos/pragnya_logo_v2_origami_1782015159098.png" 
                  alt="Pragnya Logo" 
                  fill 
                  className="object-contain"
                />
              </div>
              <span className="text-[26px] font-extrabold tracking-tight">
                <span className="text-slate-900">Prag</span>
                <span className="text-emerald-600">nya</span>
              </span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Welcome Back
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-2 tracking-wide">
              Sign in to the Pragnya secure portal.
            </p>
          </motion.div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            
            {/* Error Alert */}
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-rose-50 border border-rose-100 rounded-2xl px-4 py-3 flex items-center gap-3"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                <p className="text-xs font-medium text-rose-700">{error}</p>
              </motion.div>
            )}

            {/* Email Input */}
            <motion.div variants={itemVariants}>
              <label htmlFor="email" className="block text-[11px] uppercase tracking-[0.1em] font-semibold text-slate-400 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@pragnya.in"
                required
                autoFocus
                className="w-full px-4 py-3.5 bg-white border border-slate-200/80 rounded-2xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all duration-300 shadow-[0_2px_10px_rgb(0,0,0,0.02)]"
              />
            </motion.div>

            {/* Password Input */}
            <motion.div variants={itemVariants}>
              <label htmlFor="password" className="block text-[11px] uppercase tracking-[0.1em] font-semibold text-slate-400 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-4 pr-12 py-3.5 bg-white border border-slate-200/80 rounded-2xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all duration-300 shadow-[0_2px_10px_rgb(0,0,0,0.02)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </motion.div>

            {/* Submit Button */}
            <motion.div variants={itemVariants} className="mt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative w-full flex items-center justify-between bg-slate-900 hover:bg-black text-white font-medium text-sm py-3 px-5 rounded-[1.25rem] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] shadow-xl shadow-slate-900/20 disabled:opacity-70 disabled:pointer-events-none"
              >
                <span className="pl-2">
                  {isSubmitting ? "Authenticating..." : "Sign in to Dashboard"}
                </span>
                
                {/* Trailing Icon */}
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1 group-hover:-translate-y-[1px]">
                  {isSubmitting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5 text-white" />
                  )}
                </div>
              </button>
            </motion.div>

          </form>

          {/* Minimal Footer inside panel */}
          <motion.div variants={itemVariants} className="mt-12 pt-8 border-t border-slate-200/60">
            <p className="text-[11px] font-medium text-slate-400 tracking-wide">
              &copy; {new Date().getFullYear()} Pragnya. All rights reserved.
            </p>
          </motion.div>

        </motion.div>
      </div>

    </div>
  );
}
