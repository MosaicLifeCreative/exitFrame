"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SetupTOTPPage() {
  const [qrCode, setQrCode] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [factorId, setFactorId] = useState<string>("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    enrollTOTP();
  }, []);

  const enrollTOTP = async () => {
    const supabase = createClient();

    // Unenroll any existing TOTP factors first (supports re-enrollment)
    const { data: factors } = await supabase.auth.mfa.listFactors();
    if (factors?.totp) {
      for (const factor of factors.totp) {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      issuer: "exitFrame",
      friendlyName: "Authenticator App",
    });

    if (error || !data) {
      setError("Failed to initialize TOTP enrollment");
      return;
    }

    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setFactorId(data.id);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();

    const { data: challengeData, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId });

    if (challengeError || !challengeData) {
      setError("Challenge failed");
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    });

    if (verifyError) {
      setError("Invalid code. Try again.");
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push("/dashboard"), 2000);
  };

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] flex items-center justify-center overflow-hidden">
      <div className="scanline-overlay" />
      <div className="scanline-moving" />

      <div className="relative z-10 max-w-md w-full px-4 space-y-8">
        <div className="text-center">
          <h1 className="text-xl font-mono font-light tracking-[0.3em] text-green-500/60 uppercase">
            TOTP Enrollment
          </h1>
          <p className="mt-2 text-xs font-mono text-green-500/30 tracking-wider">
            One-time setup — scan with your authenticator app
          </p>
        </div>

        {success ? (
          <div className="text-center space-y-4">
            <div className="text-xl font-mono font-bold tracking-[0.3em] text-green-400 uppercase">
              TOTP Enrolled
            </div>
            <p className="text-xs font-mono text-green-500/40">
              Redirecting to dashboard...
            </p>
          </div>
        ) : (
          <>
            {qrCode && (
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 bg-white rounded-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCode} alt="TOTP QR Code" width={200} height={200} />
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-mono text-green-500/30 uppercase tracking-wider mb-1">
                    Manual entry key
                  </p>
                  <code className="text-xs font-mono text-green-400/60 break-all select-all">
                    {secret}
                  </code>
                </div>
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs uppercase tracking-[0.2em] text-green-500/60 font-mono">
                  Verification Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="terminal-input w-full h-11 px-4 rounded-none text-sm tracking-[0.5em] text-center"
                  placeholder="000000"
                  required
                />
              </div>

              {error && (
                <p className="text-xs font-mono text-red-400/60 text-center">{error}</p>
              )}

              <button
                type="submit"
                className="w-full h-11 bg-green-500/10 border border-green-500/30 text-green-400
                  font-mono text-sm uppercase tracking-[0.2em] rounded-none
                  hover:bg-green-500/20 hover:border-green-500/50
                  transition-all duration-300"
              >
                Verify & Enroll
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
