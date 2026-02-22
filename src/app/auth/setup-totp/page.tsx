"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SetupTOTPPage() {
  const [qrCode, setQrCode] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [factorId, setFactorId] = useState<string>("");
  const [oldFactorIds, setOldFactorIds] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const enrollTOTP = useCallback(async () => {
    const supabase = createClient();

    // Ensure we have a valid session before calling MFA methods
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.warn("[setup-totp] No valid session:", userError?.message);
      setError("No active session. Redirecting to login...");
      setTimeout(() => router.push("/login"), 1500);
      return;
    }

    // List existing factors — we can't unenroll at AAL1 (requires AAL2),
    // so enroll with a unique name, then unenroll old ones AFTER verification
    // promotes the session to AAL2.
    const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
    if (listError) {
      console.warn("[setup-totp] listFactors failed:", listError.message);
      setError(listError.message);
      setLoading(false);
      return;
    }

    const existingIds = factors?.totp?.map((f) => f.id) ?? [];
    setOldFactorIds(existingIds);

    // Use a unique friendly name to avoid "already exists" collision
    const friendlyName = existingIds.length > 0
      ? `Authenticator App ${Date.now()}`
      : "Authenticator App";

    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      issuer: "exitFrame",
      friendlyName,
    });

    if (enrollError || !data) {
      setError(enrollError?.message || "Failed to initialize TOTP enrollment");
      setLoading(false);
      return;
    }

    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setFactorId(data.id);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    enrollTOTP();
  }, [enrollTOTP]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const supabase = createClient();

    const { data: challengeData, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId });

    if (challengeError || !challengeData) {
      setError(challengeError?.message || "Challenge failed — try refreshing the page");
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

    // Verification succeeded — session is now AAL2, so we can unenroll old factors
    for (const oldId of oldFactorIds) {
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: oldId });
      if (unenrollError) {
        console.warn("[setup-totp] Failed to unenroll old factor:", oldId, unenrollError.message);
      }
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

        {loading ? (
          <div className="text-center space-y-4">
            <div className="inline-block w-6 h-6 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
            <p className="text-xs font-mono text-green-500/40">
              Initializing secure enrollment...
            </p>
          </div>
        ) : success ? (
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
                disabled={!factorId}
                className="w-full h-11 bg-green-500/10 border border-green-500/30 text-green-400
                  font-mono text-sm uppercase tracking-[0.2em] rounded-none
                  hover:bg-green-500/20 hover:border-green-500/50
                  disabled:opacity-50 disabled:cursor-not-allowed
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
