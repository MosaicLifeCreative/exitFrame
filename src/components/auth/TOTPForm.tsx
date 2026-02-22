"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function TOTPForm({
  onVerified,
}: {
  onVerified: () => void;
}) {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [trustBrowser, setTrustBrowser] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (value && index === 5) {
      const fullCode = newCode.join("");
      if (fullCode.length === 6) {
        handleVerify(fullCode);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasteData.length === 6) {
      setCode(pasteData.split(""));
      handleVerify(pasteData);
    }
  };

  const fbiRedirect = async (supabase: ReturnType<typeof createClient>) => {
    // Destroy session before redirecting so cookies don't persist
    await supabase.auth.signOut();
    window.location.href = "https://www.fbi.gov";
  };

  const handleVerify = async (totpCode: string) => {
    setLoading(true);
    const supabase = createClient();

    try {
      // Get current MFA factors
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const totpFactor = factorsData?.totp?.[0];

      if (!totpFactor) {
        await fbiRedirect(supabase);
        return;
      }

      // Create a challenge
      const { data: challengeData, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId: totpFactor.id });

      if (challengeError || !challengeData) {
        await fbiRedirect(supabase);
        return;
      }

      // Verify the TOTP code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challengeData.id,
        code: totpCode,
      });

      if (verifyError) {
        await fbiRedirect(supabase);
        return;
      }

      // Register trusted device if checkbox was checked
      if (trustBrowser) {
        await fetch("/api/auth/trust-device", { method: "POST" });
      }

      onVerified();
    } catch {
      const supabaseForSignOut = createClient();
      await supabaseForSignOut.auth.signOut();
      window.location.href = "https://www.fbi.gov";
    }
  };

  return (
    <div className="space-y-6 w-full max-w-sm">
      <div className="space-y-2">
        <label className="block text-xs uppercase tracking-[0.2em] text-green-500/60 font-mono text-center">
          Secondary Verification Required
        </label>
        <p className="text-xs text-green-500/30 font-mono text-center">
          Enter 6-digit authentication code
        </p>
      </div>

      <div
        className="flex gap-2 justify-center"
        onPaste={handlePaste}
      >
        {code.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            disabled={loading}
            className="w-12 h-14 text-center text-xl font-mono terminal-input rounded-none
              focus:border-green-500/60 disabled:opacity-50"
          />
        ))}
      </div>

      {!loading && (
        <label className="flex items-center justify-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={trustBrowser}
            onChange={(e) => setTrustBrowser(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-4 h-4 border border-green-500/30 rounded-none
            peer-checked:bg-green-500/20 peer-checked:border-green-500/60
            group-hover:border-green-500/50 transition-all duration-200
            flex items-center justify-center">
            {trustBrowser && (
              <svg className="w-3 h-3 text-green-400" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-green-500/40
            group-hover:text-green-500/60 transition-colors duration-200">
            Trust this browser
          </span>
        </label>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 text-green-400/60 font-mono text-sm">
          <span className="inline-block w-4 h-4 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
          <span className="uppercase tracking-[0.2em]">Verifying</span>
        </div>
      )}
    </div>
  );
}
