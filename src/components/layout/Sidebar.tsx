"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Heart,
  Moon,
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
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Activity,
  FolderOpen,
  CheckSquare,
  Clock,
  StickyNote,
  ClipboardList,
  Upload,
  CandlestickChart,
  Pill,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  children?: NavItem[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "Command Center",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Activity Feed", href: "/dashboard/activity", icon: Activity },
      { label: "All Projects", href: "/dashboard/projects", icon: FolderOpen },
      { label: "All Tasks", href: "/dashboard/tasks", icon: CheckSquare },
      { label: "All Notes", href: "/dashboard/notes", icon: StickyNote },
      { label: "Time Report", href: "/dashboard/time", icon: Clock },
    ],
  },
  {
    title: "Life",
    items: [
      {
        label: "Health",
        href: "/dashboard/health",
        icon: Heart,
        children: [
          { label: "Sleep", href: "/dashboard/health/sleep", icon: Moon },
          { label: "Fitness", href: "/dashboard/health/fitness", icon: Dumbbell },
          { label: "Supplements", href: "/dashboard/health/supplements", icon: Pill },
          { label: "Diet", href: "/dashboard/health/diet", icon: UtensilsCrossed },
        ],
      },
      { label: "Financial", href: "/dashboard/financial", icon: DollarSign },
      { label: "Investing", href: "/dashboard/investing", icon: CandlestickChart },
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
      { label: "Onboarding", href: "/dashboard/onboarding", icon: ClipboardList },
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
      { label: "All Products", href: "/dashboard/products", icon: ShoppingBag },
    ],
  },
  {
    title: "Tools",
    items: [
      { label: "ClickUp Import", href: "/dashboard/import/clickup", icon: Upload },
    ],
  },
  {
    title: "System",
    items: [
      { label: "System Health", href: "/dashboard/system-health", icon: Activity },
    ],
  },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    "Command Center": true,
    Life: true,
    MLC: true,
    Products: true,
    Tools: false,
    System: false,
  });
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({
    Health: true,
  });
  const pathname = usePathname();

  const toggleSection = (title: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const toggleItem = (label: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  const isItemActive = (item: NavItem): boolean => {
    if (pathname === item.href) return true;
    if (item.children) {
      return item.children.some((child) => pathname === child.href);
    }
    return false;
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
            MOSAIC LIFE
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
                  const active = isItemActive(item);
                  const Icon = item.icon;
                  const hasChildren = item.children && item.children.length > 0;
                  const isExpanded = expandedItems[item.label];

                  if (hasChildren && !collapsed) {
                    return (
                      <div key={item.href}>
                        {/* Parent item — clickable label goes to overview, chevron toggles children */}
                        <div className="flex items-center">
                          <Link
                            href={item.href}
                            className={cn(
                              "flex-1 flex items-center gap-3 rounded-md rounded-r-none px-2 py-2 text-sm transition-colors",
                              active
                                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                            )}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span>{item.label}</span>
                          </Link>
                          <button
                            onClick={() => toggleItem(item.label)}
                            className={cn(
                              "p-2 rounded-md rounded-l-none transition-colors",
                              active
                                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                : "text-sidebar-foreground/40 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                            )}
                          >
                            <ChevronDown
                              className={cn(
                                "h-3 w-3 transition-transform",
                                !isExpanded && "-rotate-90"
                              )}
                            />
                          </button>
                        </div>

                        {/* Children */}
                        {isExpanded && (
                          <div className="ml-4 pl-3 border-l border-sidebar-border/50 space-y-0.5 mt-0.5">
                            {item.children!.map((child) => {
                              const childActive = pathname === child.href;
                              const ChildIcon = child.icon;
                              return (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  className={cn(
                                    "flex items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors",
                                    childActive
                                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                      : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                                  )}
                                >
                                  <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                                  <span>{child.label}</span>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Collapsed parent with children — show just the icon
                  if (hasChildren && collapsed) {
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors justify-center px-0",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                        )}
                        title={item.label}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                      </Link>
                    );
                  }

                  // Regular item (no children)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors",
                        active
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
