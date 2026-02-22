"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseRoute(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  // /dashboard/clients/[id]/notes → module: "notes", domain: "mlc"
  // /dashboard/projects/[id] → module: "projects", domain: varies
  // /dashboard/tasks → module: "tasks"

  let moduleName = "dashboard";
  let domain = "life";
  let clientId: string | null = null;
  const projectId: string | null = null;

  if (parts.length >= 2) {
    moduleName = parts[1]; // clients, products, projects, tasks, notes, etc.
  }

  // Detect client context — only set clientId if it's actually a UUID
  if (parts[1] === "clients" && parts[2] && UUID_RE.test(parts[2])) {
    domain = "mlc";
    clientId = parts[2];
    if (parts[3]) moduleName = parts[3]; // sub-tab like "notes", "tasks"
  }

  // Detect product context
  if (parts[1] === "products" && parts[2]) {
    domain = "product";
  }

  const description = `Viewing ${moduleName}`;

  return { moduleName, domain, clientId, projectId, description };
}

const HEARTBEAT_INTERVAL = 60000; // 60 seconds
const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export function TimeTrackingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const lastActivityRef = useRef(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const sendHeartbeat = useCallback(async () => {
    // Don't send if idle
    if (Date.now() - lastActivityRef.current > IDLE_TIMEOUT) return;
    // Don't send if tab is hidden
    if (document.hidden) return;

    const { moduleName, domain, clientId, description } = parseRoute(pathname);

    try {
      await fetch("/api/time/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          route: pathname,
          module: moduleName,
          domain,
          clientId: clientId || null,
          projectId: null,
          activityDescription: description,
        }),
      });
    } catch {
      // Silently fail — time tracking should never break the app
    }
  }, [pathname]);

  // Track user activity for idle detection
  useEffect(() => {
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("click", handleActivity);

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("click", handleActivity);
    };
  }, []);

  // Send heartbeat on interval
  useEffect(() => {
    // Send immediately on route change
    sendHeartbeat();

    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [sendHeartbeat]);

  return <>{children}</>;
}
