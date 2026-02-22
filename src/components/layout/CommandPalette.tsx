"use client";

import { useEffect, useRef } from "react";
import { Search, X } from "lucide-react";

export default function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 rounded-lg border border-border bg-popover shadow-2xl">
        {/* Search input */}
        <div className="flex items-center border-b border-border px-4">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search..."
            className="flex-1 h-12 bg-transparent text-sm text-foreground placeholder:text-muted-foreground
              border-0 outline-none focus:ring-0 px-3"
          />
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Placeholder content */}
        <div className="p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Command palette coming in a future phase.
          </p>
          <p className="text-xs text-muted-foreground/60 mt-2">
            Press <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted text-[10px]">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
}
