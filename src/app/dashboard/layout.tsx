"use client";

import { useState, useCallback } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import MainContent from "@/components/layout/MainContent";
import CommandPalette from "@/components/layout/CommandPalette";
import ChatWidget from "@/components/chat/ChatWidget";
import { TimeTrackingProvider } from "@/components/providers/TimeTrackingProvider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const toggleMobileSidebar = useCallback(() => {
    setMobileSidebarOpen((prev) => !prev);
  }, []);

  const closeMobileSidebar = useCallback(() => {
    setMobileSidebarOpen(false);
  }, []);

  return (
    <TimeTrackingProvider>
      <div className="h-screen flex flex-col overflow-hidden">
        <Header
          onCommandPalette={() => setCommandPaletteOpen(true)}
          onMenuToggle={toggleMobileSidebar}
        />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar
            isMobileOpen={mobileSidebarOpen}
            onMobileClose={closeMobileSidebar}
          />
          <MainContent>{children}</MainContent>
        </div>
        <CommandPalette
          open={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
        />
        <ChatWidget />
      </div>
    </TimeTrackingProvider>
  );
}
