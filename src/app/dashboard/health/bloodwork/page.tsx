"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useChatContext } from "@/hooks/useChatContext";
import {
  FlaskConical,
  Plus,
  Loader2,
  X,
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Minus,
  Trash2,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

// ─── Types ───────────────────────────────────────────────

const CATEGORIES = [
  "lipids",
  "metabolic",
  "hormones",
  "cbc",
  "thyroid",
  "liver",
  "kidney",
  "vitamins",
  "inflammation",
  "other",
] as const;

type MarkerCategory = (typeof CATEGORIES)[number];

interface BloodworkMarker {
  id: string;
  name: string;
  value: number;
  unit: string;
  refLow: number | null;
  refHigh: number | null;
  category: string;
  flag: "high" | "low" | null;
}

interface BloodworkPanel {
  id: string;
  name: string;
  date: string;
  provider: string | null;
  labName: string | null;
  notes: string | null;
  markerCount: number;
  flaggedCount: number;
  markers?: BloodworkMarker[];
}

interface TrendEntry {
  date: string;
  value: number;
  unit: string;
  panelName: string;
  flag: "high" | "low" | null;
}

interface MarkerFormRow {
  name: string;
  value: string;
  unit: string;
  refLow: string;
  refHigh: string;
  category: MarkerCategory;
}

// ─── Page ────────────────────────────────────────────────

export default function BloodworkPage() {
  const [panels, setPanels] = useState<BloodworkPanel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedPanelId, setExpandedPanelId] = useState<string | null>(null);
  const [expandedPanel, setExpandedPanel] = useState<BloodworkPanel | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [trendMarker, setTrendMarker] = useState<string | null>(null);
  const [trendData, setTrendData] = useState<TrendEntry[]>([]);
  const [loadingTrend, setLoadingTrend] = useState(false);

  const fetchPanels = useCallback(async () => {
    try {
      const res = await fetch("/api/health/bloodwork").then((r) => r.json());
      if (res.data) setPanels(res.data);
    } catch (err) {
      console.error("Bloodwork fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPanelDetail = useCallback(async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/health/bloodwork/${id}`).then((r) => r.json());
      if (res.data) setExpandedPanel(res.data);
    } catch (err) {
      console.error("Panel detail fetch error:", err);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const fetchTrend = useCallback(async (markerName: string) => {
    setLoadingTrend(true);
    setTrendMarker(markerName);
    try {
      const res = await fetch(
        `/api/health/bloodwork/trends?marker=${encodeURIComponent(markerName)}`
      ).then((r) => r.json());
      if (res.data) setTrendData(res.data);
    } catch (err) {
      console.error("Trend fetch error:", err);
      setTrendData([]);
    } finally {
      setLoadingTrend(false);
    }
  }, []);

  useEffect(() => {
    fetchPanels();
  }, [fetchPanels]);

  const handleTogglePanel = useCallback(
    (id: string) => {
      if (expandedPanelId === id) {
        setExpandedPanelId(null);
        setExpandedPanel(null);
      } else {
        setExpandedPanelId(id);
        fetchPanelDetail(id);
      }
      setTrendMarker(null);
      setTrendData([]);
    },
    [expandedPanelId, fetchPanelDetail]
  );

  // Compute flagged markers for chat context
  const allFlaggedInfo = useMemo(() => {
    return panels
      .filter((p) => p.flaggedCount > 0)
      .map((p) => `${p.name} (${p.date}): ${p.flaggedCount} flagged`)
      .join("; ");
  }, [panels]);

  const chatContext = useMemo(() => {
    const parts = ["Page: Bloodwork"];
    parts.push(`Total panels: ${panels.length}`);
    const totalFlagged = panels.reduce((sum, p) => sum + p.flaggedCount, 0);
    if (totalFlagged > 0) {
      parts.push(`Flagged markers across panels: ${totalFlagged}`);
      parts.push(`Details: ${allFlaggedInfo}`);
    }
    if (expandedPanel && expandedPanel.markers) {
      parts.push(`\nViewing panel: ${expandedPanel.name} (${expandedPanel.date})`);
      const flagged = expandedPanel.markers.filter((m) => m.flag);
      if (flagged.length > 0) {
        parts.push("Flagged markers:");
        for (const m of flagged) {
          const range = m.refLow != null && m.refHigh != null ? ` [ref: ${m.refLow}-${m.refHigh}]` : "";
          parts.push(`  ${m.name}: ${m.value} ${m.unit} (${m.flag})${range}`);
        }
      }
    }
    return parts.join("\n");
  }, [panels, allFlaggedInfo, expandedPanel]);

  useChatContext("Bloodwork", chatContext);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bloodwork</h1>
          <p className="text-sm text-muted-foreground">
            {panels.length > 0
              ? `${panels.length} panel${panels.length !== 1 ? "s" : ""} on file`
              : "Track lab results and monitor biomarkers"}
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Panel
        </Button>
      </div>

      {/* Add Panel Form */}
      {showAddForm && (
        <AddPanelForm
          onClose={() => setShowAddForm(false)}
          onAdded={() => {
            setShowAddForm(false);
            fetchPanels();
          }}
        />
      )}

      {/* Trend View */}
      {trendMarker && (
        <TrendView
          markerName={trendMarker}
          data={trendData}
          loading={loadingTrend}
          onClose={() => {
            setTrendMarker(null);
            setTrendData([]);
          }}
        />
      )}

      {/* Panel List */}
      {panels.length === 0 && !showAddForm ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <FlaskConical className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No bloodwork panels yet</p>
              <p className="text-xs mt-1">
                Click &quot;Add Panel&quot; to enter lab results, or tell Claude about your latest bloodwork.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {panels.map((panel) => (
            <Card key={panel.id}>
              <button
                className="w-full text-left"
                onClick={() => handleTogglePanel(panel.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {expandedPanelId === panel.id ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <div>
                        <CardTitle className="text-base">{panel.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(panel.date + "T00:00:00").toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          {panel.provider && (
                            <span className="text-xs text-muted-foreground">
                              {panel.provider}
                            </span>
                          )}
                          {panel.labName && (
                            <span className="text-xs text-muted-foreground">
                              ({panel.labName})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {panel.markerCount} marker{panel.markerCount !== 1 ? "s" : ""}
                      </Badge>
                      {panel.flaggedCount > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {panel.flaggedCount} flagged
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </button>

              {/* Expanded Panel Detail */}
              {expandedPanelId === panel.id && (
                <CardContent className="pt-0">
                  {loadingDetail ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : expandedPanel && expandedPanel.markers ? (
                    <MarkerTable
                      markers={expandedPanel.markers}
                      onViewTrend={fetchTrend}
                    />
                  ) : null}
                  {expandedPanel?.notes && (
                    <p className="text-xs text-muted-foreground mt-3 italic">
                      {expandedPanel.notes}
                    </p>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Marker Table (grouped by category) ──────────────────

function MarkerTable({
  markers,
  onViewTrend,
}: {
  markers: BloodworkMarker[];
  onViewTrend: (name: string) => void;
}) {
  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, BloodworkMarker[]>();
    for (const m of markers) {
      const cat = m.category || "other";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(m);
    }
    // Sort categories alphabetically, but put "other" last
    const entries = Array.from(map.entries());
    entries.sort((a, b) => {
      if (a[0] === "other") return 1;
      if (b[0] === "other") return -1;
      return a[0].localeCompare(b[0]);
    });
    return entries;
  }, [markers]);

  return (
    <div className="space-y-4">
      {grouped.map(([category, categoryMarkers]) => (
        <div key={category}>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 capitalize">
            {category === "cbc" ? "CBC" : category}
          </h4>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-3 py-2 font-medium text-xs">Marker</th>
                  <th className="text-right px-3 py-2 font-medium text-xs">Value</th>
                  <th className="text-right px-3 py-2 font-medium text-xs">Ref Range</th>
                  <th className="text-center px-3 py-2 font-medium text-xs w-16">Flag</th>
                  <th className="text-center px-3 py-2 font-medium text-xs w-10"></th>
                </tr>
              </thead>
              <tbody>
                {categoryMarkers.map((marker) => (
                  <tr
                    key={marker.id}
                    className="border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-3 py-2 text-sm">{marker.name}</td>
                    <td className="px-3 py-2 text-sm text-right font-mono">
                      {marker.value} <span className="text-muted-foreground text-xs">{marker.unit}</span>
                    </td>
                    <td className="px-3 py-2 text-sm text-right text-muted-foreground">
                      {marker.refLow != null && marker.refHigh != null
                        ? `${marker.refLow} - ${marker.refHigh}`
                        : marker.refLow != null
                          ? `> ${marker.refLow}`
                          : marker.refHigh != null
                            ? `< ${marker.refHigh}`
                            : "—"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {marker.flag === "high" && (
                        <span className="inline-flex items-center gap-0.5 text-red-500 text-xs font-medium">
                          <ArrowUp className="h-3 w-3" /> High
                        </span>
                      )}
                      {marker.flag === "low" && (
                        <span className="inline-flex items-center gap-0.5 text-blue-500 text-xs font-medium">
                          <ArrowDown className="h-3 w-3" /> Low
                        </span>
                      )}
                      {!marker.flag && (
                        <Minus className="h-3 w-3 mx-auto text-muted-foreground/30" />
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => onViewTrend(marker.name)}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title={`View trend for ${marker.name}`}
                      >
                        <TrendingUp className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Trend View ──────────────────────────────────────────

function TrendView({
  markerName,
  data,
  loading,
  onClose,
}: {
  markerName: string;
  data: TrendEntry[];
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Trend: {markerName}
          </CardTitle>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No historical data found for this marker.
          </p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-3 py-2 font-medium text-xs">Date</th>
                  <th className="text-left px-3 py-2 font-medium text-xs">Panel</th>
                  <th className="text-right px-3 py-2 font-medium text-xs">Value</th>
                  <th className="text-center px-3 py-2 font-medium text-xs w-16">Flag</th>
                </tr>
              </thead>
              <tbody>
                {data.map((entry, i) => (
                  <tr
                    key={i}
                    className="border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-3 py-2 text-sm">
                      {new Date(entry.date + "T00:00:00").toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-3 py-2 text-sm text-muted-foreground">
                      {entry.panelName}
                    </td>
                    <td className="px-3 py-2 text-sm text-right font-mono">
                      {entry.value}{" "}
                      <span className="text-muted-foreground text-xs">{entry.unit}</span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {entry.flag === "high" && (
                        <span className="text-red-500 text-xs font-medium">High</span>
                      )}
                      {entry.flag === "low" && (
                        <span className="text-blue-500 text-xs font-medium">Low</span>
                      )}
                      {!entry.flag && (
                        <Minus className="h-3 w-3 mx-auto text-muted-foreground/30" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Add Panel Form ──────────────────────────────────────

function AddPanelForm({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: () => void;
}) {
  const [name, setName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [provider, setProvider] = useState("");
  const [labName, setLabName] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [markers, setMarkers] = useState<MarkerFormRow[]>([
    { name: "", value: "", unit: "", refLow: "", refHigh: "", category: "other" },
  ]);

  const addMarkerRow = () => {
    setMarkers((prev) => [
      ...prev,
      { name: "", value: "", unit: "", refLow: "", refHigh: "", category: "other" },
    ]);
  };

  const removeMarkerRow = (index: number) => {
    setMarkers((prev) => prev.filter((_, i) => i !== index));
  };

  const updateMarker = (index: number, field: keyof MarkerFormRow, val: string) => {
    setMarkers((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const validMarkers = markers.filter((m) => m.name.trim() && m.value.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || validMarkers.length === 0) return;

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        date,
        provider: provider.trim() || undefined,
        labName: labName.trim() || undefined,
        notes: notes.trim() || undefined,
        markers: validMarkers.map((m) => ({
          name: m.name.trim(),
          value: parseFloat(m.value),
          unit: m.unit.trim() || undefined,
          refLow: m.refLow ? parseFloat(m.refLow) : undefined,
          refHigh: m.refHigh ? parseFloat(m.refHigh) : undefined,
          category: m.category,
        })),
      };

      const res = await fetch("/api/health/bloodwork", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onAdded();
      } else {
        const err = await res.json();
        console.error("Create panel error:", err);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <FlaskConical className="h-4 w-4" />
              New Bloodwork Panel
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Panel Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs text-muted-foreground mb-1 block">
                Panel Name *
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Comprehensive Metabolic Panel"
                required
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs text-muted-foreground mb-1 block">
                Date *
              </label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Provider
              </label>
              <Input
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="Dr. Smith"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Lab Name
              </label>
              <Input
                value={labName}
                onChange={(e) => setLabName(e.target.value)}
                placeholder="Quest Diagnostics"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">
                Notes
              </label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Fasting, follow-up, etc."
              />
            </div>
          </div>

          {/* Markers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Markers ({validMarkers.length})
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addMarkerRow}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Row
              </Button>
            </div>

            <div className="space-y-2">
              {/* Header row */}
              <div className="hidden sm:grid grid-cols-12 gap-2 px-1">
                <span className="col-span-3 text-[10px] text-muted-foreground uppercase">
                  Name
                </span>
                <span className="col-span-1 text-[10px] text-muted-foreground uppercase">
                  Value
                </span>
                <span className="col-span-1 text-[10px] text-muted-foreground uppercase">
                  Unit
                </span>
                <span className="col-span-1 text-[10px] text-muted-foreground uppercase">
                  Ref Low
                </span>
                <span className="col-span-1 text-[10px] text-muted-foreground uppercase">
                  Ref High
                </span>
                <span className="col-span-2 text-[10px] text-muted-foreground uppercase">
                  Category
                </span>
                <span className="col-span-1"></span>
              </div>

              {markers.map((marker, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-start p-2 rounded-lg border border-border bg-muted/20"
                >
                  <div className="col-span-2 sm:col-span-3">
                    <label className="text-[10px] text-muted-foreground sm:hidden">
                      Name
                    </label>
                    <Input
                      value={marker.name}
                      onChange={(e) => updateMarker(idx, "name", e.target.value)}
                      placeholder="Total Cholesterol"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="text-[10px] text-muted-foreground sm:hidden">
                      Value
                    </label>
                    <Input
                      value={marker.value}
                      onChange={(e) => updateMarker(idx, "value", e.target.value)}
                      placeholder="200"
                      className="h-8 text-sm"
                      type="number"
                      step="any"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="text-[10px] text-muted-foreground sm:hidden">
                      Unit
                    </label>
                    <Input
                      value={marker.unit}
                      onChange={(e) => updateMarker(idx, "unit", e.target.value)}
                      placeholder="mg/dL"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="text-[10px] text-muted-foreground sm:hidden">
                      Ref Low
                    </label>
                    <Input
                      value={marker.refLow}
                      onChange={(e) => updateMarker(idx, "refLow", e.target.value)}
                      placeholder="0"
                      className="h-8 text-sm"
                      type="number"
                      step="any"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="text-[10px] text-muted-foreground sm:hidden">
                      Ref High
                    </label>
                    <Input
                      value={marker.refHigh}
                      onChange={(e) => updateMarker(idx, "refHigh", e.target.value)}
                      placeholder="200"
                      className="h-8 text-sm"
                      type="number"
                      step="any"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] text-muted-foreground sm:hidden">
                      Category
                    </label>
                    <select
                      value={marker.category}
                      onChange={(e) =>
                        updateMarker(idx, "category", e.target.value)
                      }
                      className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat === "cbc" ? "CBC" : cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2 sm:col-span-1 flex justify-end sm:justify-center">
                    {markers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMarkerRow(idx)}
                        className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title="Remove row"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!name.trim() || validMarkers.length === 0 || saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Plus className="h-4 w-4 mr-1" />
              )}
              Save Panel ({validMarkers.length} marker{validMarkers.length !== 1 ? "s" : ""})
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
