"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm({
  onAuthenticated,
}: {
  onAuthenticated: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Destroy any partial session, then FBI redirect — no error messages
      await supabase.auth.signOut();
      window.location.href = "https://www.fbi.gov";
      return;
    }

    onAuthenticated();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 w-full max-w-sm">
      <div className="space-y-2">
        <label
          htmlFor="email"
          className="block text-xs uppercase tracking-[0.2em] text-green-500/60 font-mono"
        >
          Identification
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="terminal-input w-full h-11 px-4 rounded-none text-sm tracking-wider"
          placeholder="enter credentials"
          required
          autoComplete="email"
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="password"
          className="block text-xs uppercase tracking-[0.2em] text-green-500/60 font-mono"
        >
          Authorization Code
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="terminal-input w-full h-11 px-4 rounded-none text-sm tracking-wider"
          placeholder="••••••••••••"
          required
          autoComplete="current-password"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full h-11 bg-green-500/10 border border-green-500/30 text-green-400
          font-mono text-sm uppercase tracking-[0.2em] rounded-none
          hover:bg-green-500/20 hover:border-green-500/50 hover:shadow-[0_0_20px_rgba(0,255,65,0.1)]
          focus:outline-none focus:ring-1 focus:ring-green-500/30
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-300"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="inline-block w-4 h-4 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
            Authenticating
          </span>
        ) : (
          "Authenticate"
        )}
      </button>
    </form>
  );
}
