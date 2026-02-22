"use client";

import { useRouter } from "next/navigation";
import TOTPForm from "@/components/auth/TOTPForm";

export default function VerifyTOTPPage() {
  const router = useRouter();

  const handleVerified = () => {
    router.push("/dashboard");
  };

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] flex items-center justify-center overflow-hidden">
      <div className="scanline-overlay" />
      <div className="scanline-moving" />
      <div className="relative z-10">
        <TOTPForm onVerified={handleVerified} />
      </div>
    </div>
  );
}
