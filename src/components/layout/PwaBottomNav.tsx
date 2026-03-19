"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  MessageCircle,
  Plane,
  Dumbbell,
  FileText,
  CheckSquare,
  Bell,
} from "lucide-react";

const tabs = [
  { href: "/dashboard/chat", icon: MessageCircle, label: "Chat" },
  { href: "/dashboard/travel", icon: Plane, label: "Travel" },
  { href: "/dashboard/health/fitness", icon: Dumbbell, label: "Fitness" },
  { href: "/dashboard/notes", icon: FileText, label: "Notes" },
  { href: "/dashboard/tasks", icon: CheckSquare, label: "Tasks" },
  { href: "/dashboard/reminders", icon: Bell, label: "Reminders" },
];

export default function PwaBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="pwa-only fixed bottom-0 left-0 right-0 z-[70] bg-background/95 backdrop-blur-sm border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || (tab.href !== "/dashboard/chat" && pathname?.startsWith(tab.href));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <tab.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
