"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LoginForm from "@/components/auth/LoginForm";
import TOTPForm from "@/components/auth/TOTPForm";

type AuthStage = "login" | "totp" | "granted";

export default function LoginPage() {
  const [stage, setStage] = useState<AuthStage>("login");
  const router = useRouter();

  const handleAuthenticated = async () => {
    // Check if this device is already trusted (skip TOTP)
    try {
      const res = await fetch("/api/auth/check-trust");
      const { data } = await res.json();
      if (data?.trusted) {
        setStage("granted");
        setTimeout(() => {
          router.push("/dashboard");
        }, 1500);
        return;
      }
    } catch {
      // If check fails, fall through to TOTP
    }
    setStage("totp");
  };

  const handleVerified = () => {
    setStage("granted");
    // Show ACCESS GRANTED for 1.5s then redirect
    setTimeout(() => {
      router.push("/dashboard");
    }, 1500);
  };

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] flex items-center justify-center overflow-hidden">
      {/* Scanline effects */}
      <div className="scanline-overlay" />
      <div className="scanline-moving" />

      {/* Subtle grid background */}
      <div
        className="fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,255,65,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,65,1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Main content */}
      <div className="relative z-10 w-full max-w-lg flex flex-col items-center px-4">
        {/* Classification header */}
        <div className="mb-12 text-center">
          <div className="text-[10px] font-mono uppercase tracking-[0.5em] text-green-500/20 mb-4">
            ── Restricted Access Terminal ──
          </div>
          <h1 className="text-2xl font-mono font-light tracking-[0.3em] text-green-500/40 uppercase">
            exitFrame
          </h1>
          <div className="mt-2 h-px w-48 mx-auto bg-gradient-to-r from-transparent via-green-500/20 to-transparent" />
        </div>

        {/* Login form */}
        <div
          className={`w-full transition-all duration-500 ${
            stage === "login"
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-4 absolute pointer-events-none"
          }`}
        >
          <LoginForm onAuthenticated={handleAuthenticated} />
        </div>

        {/* TOTP form */}
        <div
          className={`w-full transition-all duration-500 ${
            stage === "totp"
              ? "opacity-100 translate-y-0"
              : stage === "granted"
              ? "opacity-0 -translate-y-4 absolute pointer-events-none"
              : "opacity-0 translate-y-4 absolute pointer-events-none"
          }`}
        >
          <TOTPForm onVerified={handleVerified} />
        </div>

        {/* ACCESS GRANTED */}
        <div
          className={`w-full transition-all duration-500 ${
            stage === "granted"
              ? "opacity-100 scale-100"
              : "opacity-0 scale-90 absolute pointer-events-none"
          }`}
        >
          <div className="animate-access-granted text-center">
            <div className="text-3xl font-mono font-bold tracking-[0.4em] text-green-400 uppercase">
              Access Granted
            </div>
            <div className="mt-4 text-xs font-mono tracking-[0.3em] text-green-500/40 uppercase">
              Initializing secure session
            </div>
            <div className="mt-4 flex justify-center gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-green-400 animate-pulse"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Bottom classification line */}
        <div className="fixed bottom-6 left-0 right-0 text-center">
          <span className="text-[10px] font-mono uppercase tracking-[0.4em] text-green-500/10">
            Classification Level: Restricted
          </span>
        </div>
      </div>

      {/* Green flash overlay for ACCESS GRANTED */}
      {stage === "granted" && (
        <div className="fixed inset-0 animate-flash-green pointer-events-none z-20" />
      )}
    </div>
  );
}
