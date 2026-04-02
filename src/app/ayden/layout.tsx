import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AydenPublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="tf-ambient min-h-screen bg-background text-foreground">
      <div className="px-6 py-10 sm:px-10">
        {children}
      </div>
    </div>
  );
}
