"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ClientSummary {
  id: string;
  name: string;
  minutes: number;
}

interface ModuleSummary {
  name: string;
  minutes: number;
}

interface TimeSummary {
  totalMinutes: number;
  byClient: ClientSummary[];
  byModule: ModuleSummary[];
}

function formatMinutes(mins: number) {
  const hours = Math.floor(mins / 60);
  const remaining = mins % 60;
  if (hours === 0) return `${remaining}m`;
  return `${hours}h ${remaining}m`;
}

function getWeekRange() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  return {
    from: start.toISOString().split("T")[0],
    to: end.toISOString().split("T")[0],
  };
}

export default function TimePage() {
  const weekRange = getWeekRange();
  const [dateFrom, setDateFrom] = useState(weekRange.from);
  const [dateTo, setDateTo] = useState(weekRange.to);
  const [summary, setSummary] = useState<TimeSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (dateFrom) params.set("date_from", dateFrom);
        if (dateTo) params.set("date_to", dateTo);

        const res = await fetch(`/api/time/summary?${params}`);
        const json = await res.json();
        if (res.ok) setSummary(json.data);
      } catch {
        toast.error("Failed to load time summary");
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, [dateFrom, dateTo]);

  const moduleLabel = (name: string) =>
    name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Time Report</h1>
        <div className="flex items-center gap-3">
          <div>
            <Label htmlFor="from" className="text-xs">From</Label>
            <Input
              id="from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-[150px]"
            />
          </div>
          <div>
            <Label htmlFor="to" className="text-xs">To</Label>
            <Input
              id="to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-[150px]"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-muted-foreground py-12 text-center">Loading time data...</div>
      ) : !summary ? (
        <div className="text-muted-foreground py-12 text-center">No time data available.</div>
      ) : (
        <>
          {/* Total */}
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="text-3xl font-semibold">{formatMinutes(summary.totalMinutes)}</div>
                <div className="text-sm text-muted-foreground">Total tracked time</div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By Client */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Time by Client</CardTitle>
              </CardHeader>
              <CardContent>
                {summary.byClient.length > 0 ? (
                  <>
                    <div className="h-[200px] mb-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={summary.byClient}>
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip
                            formatter={(value) => formatMinutes(Number(value ?? 0))}
                            labelStyle={{ fontWeight: 600 }}
                          />
                          <Bar dataKey="minutes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Client</TableHead>
                          <TableHead className="text-right">Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {summary.byClient.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell>{c.name}</TableCell>
                            <TableCell className="text-right">{formatMinutes(c.minutes)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No client time logged.</p>
                )}
              </CardContent>
            </Card>

            {/* By Module */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Time by Module</CardTitle>
              </CardHeader>
              <CardContent>
                {summary.byModule.length > 0 ? (
                  <>
                    <div className="h-[200px] mb-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={summary.byModule.map((m) => ({ ...m, name: moduleLabel(m.name) }))}>
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip
                            formatter={(value) => formatMinutes(Number(value ?? 0))}
                            labelStyle={{ fontWeight: 600 }}
                          />
                          <Bar dataKey="minutes" fill="hsl(var(--chart-2, 220 70% 50%))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Module</TableHead>
                          <TableHead className="text-right">Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {summary.byModule.map((m) => (
                          <TableRow key={m.name}>
                            <TableCell>{moduleLabel(m.name)}</TableCell>
                            <TableCell className="text-right">{formatMinutes(m.minutes)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No module time logged.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
