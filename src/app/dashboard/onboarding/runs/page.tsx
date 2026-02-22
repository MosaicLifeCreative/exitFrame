"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface OnboardingRunItem {
  id: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  template: { id: string; name: string };
  client: { id: string; name: string };
  stepsCompleted: Array<{
    label: string;
    status: string;
    message: string;
  }> | null;
}

export default function OnboardingRunsPage() {
  const router = useRouter();
  const [runs, setRuns] = useState<OnboardingRunItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRuns = async () => {
      try {
        const res = await fetch("/api/onboarding/runs");
        const json = await res.json();
        if (res.ok) setRuns(json.data);
      } catch {
        toast.error("Failed to load runs");
      } finally {
        setLoading(false);
      }
    };
    fetchRuns();
  }, []);

  const statusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
      case "failed":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard/onboarding")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-semibold">Onboarding Run History</h1>
      </div>

      {loading ? (
        <div className="text-muted-foreground py-12 text-center">
          Loading runs...
        </div>
      ) : runs.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center">
          No onboarding runs yet.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Template</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Steps</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map((run) => {
              const steps = run.stepsCompleted || [];
              const successCount = steps.filter(
                (s) => s.status === "success"
              ).length;
              return (
                <TableRow key={run.id}>
                  <TableCell className="font-medium">
                    {run.template.name}
                  </TableCell>
                  <TableCell>
                    <button
                      className="text-primary hover:underline"
                      onClick={() =>
                        router.push(`/dashboard/clients/${run.client.id}`)
                      }
                    >
                      {run.client.name}
                    </button>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`capitalize ${statusColor(run.status)}`}
                    >
                      {run.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {successCount}/{steps.length} succeeded
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(run.startedAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
