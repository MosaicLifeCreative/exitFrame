"use client";

import { useChatStore } from "@/lib/chat-store";

export default function MainContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const isOpen = useChatStore((s) => s.isOpen);

  return (
    <main
      className="flex-1 overflow-y-auto transition-[margin] duration-300 ease-in-out"
      style={{ marginRight: isOpen ? 440 : 0 }}
    >
      <div className="max-w-7xl mx-auto p-6">{children}</div>
    </main>
  );
}
