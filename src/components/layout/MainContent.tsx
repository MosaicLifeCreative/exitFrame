"use client";

export default function MainContent({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6 pb-20">{children}</div>
      <footer className="border-t border-border/50 py-4 px-6">
        <p className="text-[11px] text-muted-foreground/40 text-center">
          Mosaic Life OS &middot; exitFrame
        </p>
      </footer>
    </main>
  );
}
