"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Heart,
  Dumbbell,
  UtensilsCrossed,
  DollarSign,
  Target,
  BarChart3,
  Flower2,
  Home,
  CalendarDays,
  Users,
  Globe,
  FileText,
  TrendingUp,
  Mail,
  MessageSquare,
  Zap,
  ShoppingBag,
  Shirt,
  Briefcase,
  MapPin,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    title: "Life",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Health", href: "/dashboard/health", icon: Heart },
      { label: "Fitness", href: "/dashboard/fitness", icon: Dumbbell },
      { label: "Diet", href: "/dashboard/diet", icon: UtensilsCrossed },
      { label: "Financial", href: "/dashboard/financial", icon: DollarSign },
      { label: "Goals", href: "/dashboard/goals", icon: Target },
      { label: "Trackers", href: "/dashboard/trackers", icon: BarChart3 },
      { label: "Plants", href: "/dashboard/plants", icon: Flower2 },
      { label: "Home", href: "/dashboard/home", icon: Home },
      { label: "Calendar", href: "/dashboard/calendar", icon: CalendarDays },
    ],
  },
  {
    title: "MLC",
    items: [
      { label: "Clients", href: "/dashboard/clients", icon: Users },
      { label: "WordPress", href: "/dashboard/wordpress", icon: Globe },
      { label: "Content", href: "/dashboard/content", icon: FileText },
      { label: "Analytics", href: "/dashboard/analytics", icon: TrendingUp },
      { label: "Email Campaigns", href: "/dashboard/email-campaigns", icon: Mail },
      { label: "Communications", href: "/dashboard/communications", icon: MessageSquare },
      { label: "Automations", href: "/dashboard/automations", icon: Zap },
    ],
  },
  {
    title: "Products",
    items: [
      { label: "GetShelfed", href: "/dashboard/getshelfed", icon: ShoppingBag },
      { label: "ManlyMan", href: "/dashboard/manlyman", icon: Shirt },
      { label: "MLC Website", href: "/dashboard/mlc-website", icon: Briefcase },
      { label: "Grove City Events", href: "/dashboard/grove-city-events", icon: MapPin },
    ],
  },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    Life: true,
    MLC: true,
    Products: true,
  });
  const pathname = usePathname();

  const toggleSection = (title: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  return (
    <aside
      className={cn(
        "h-full bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300",
        collapsed ? "w-[60px]" : "w-[240px]"
      )}
    >
      {/* Logo area */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-sidebar-border">
        {!collapsed && (
          <span className="text-sm font-semibold text-sidebar-foreground tracking-wider">
            MOSAIC
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 transition-transform duration-300",
              collapsed && "rotate-180"
            )}
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {navSections.map((section) => (
          <div key={section.title} className="mb-2">
            {/* Section header */}
            {!collapsed ? (
              <button
                onClick={() => toggleSection(section.title)}
                className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-semibold
                  uppercase tracking-[0.15em] text-sidebar-foreground/40 hover:text-sidebar-foreground/60 transition-colors"
              >
                {section.title}
                {expandedSections[section.title] ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </button>
            ) : (
              <div className="h-px bg-sidebar-border mx-2 my-2" />
            )}

            {/* Section items */}
            {(collapsed || expandedSections[section.title]) && (
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                        collapsed && "justify-center px-0"
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
