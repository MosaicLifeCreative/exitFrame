"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Plus,
  Plane,
  MapPin,
  Calendar,
  Trash2,
  X,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ── Types ──

interface TripDestination {
  id: string;
  city: string;
  state: string | null;
  country: string;
  arrivalDate: string | null;
  departureDate: string | null;
  notes: string | null;
}

interface Trip {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  destinations: TripDestination[];
}

interface DestinationInput {
  city: string;
  state: string;
  country: string;
  arrivalDate: string;
  departureDate: string;
  notes: string;
}

// ── Page ──

export default function TravelPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("upcoming");
  const [showCreate, setShowCreate] = useState(false);
  const [editTrip, setEditTrip] = useState<Trip | null>(null);
  const [expandedTrips, setExpandedTrips] = useState<Set<string>>(new Set());

  const fetchTrips = useCallback(async () => {
    try {
      const params = filter === "all" ? "" : `?status=${filter}`;
      const res = await fetch(`/api/travel${params}`);
      const json = await res.json();
      if (json.data) setTrips(json.data);
    } catch {
      toast.error("Failed to load trips");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const toggleExpand = (id: string) => {
    setExpandedTrips((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const deleteTrip = async (id: string) => {
    try {
      await fetch(`/api/travel/${id}`, { method: "DELETE" });
      toast.success("Trip deleted");
      fetchTrips();
    } catch {
      toast.error("Failed to delete trip");
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const formatShortDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const getDaysUntil = (d: string) => {
    const diff = Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return `${Math.abs(diff)}d ago`;
    if (diff === 0) return "today";
    if (diff === 1) return "tomorrow";
    return `in ${diff}d`;
  };

  const statusColors: Record<string, string> = {
    upcoming: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    completed: "bg-gray-100 text-gray-500 dark:bg-gray-900/30 dark:text-gray-500",
    cancelled: "bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Travel</h1>
          <p className="text-sm text-muted-foreground">Trips and destinations</p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> New Trip
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {["upcoming", "active", "completed", "all"].map((s) => (
          <Button
            key={s}
            variant={filter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(s)}
            className="capitalize"
          >
            {s}
          </Button>
        ))}
      </div>

      {/* Trip List */}
      {loading ? (
        <div className="text-muted-foreground text-center py-12">Loading...</div>
      ) : trips.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Plane className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">No {filter !== "all" ? filter : ""} trips</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {trips.map((trip) => {
            const isExpanded = expandedTrips.has(trip.id);
            return (
              <Card key={trip.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Trip header */}
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleExpand(trip.id)}
                  >
                    <button className="shrink-0 text-muted-foreground">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{trip.name}</span>
                        <Badge variant="secondary" className={`text-[10px] ${statusColors[trip.status] || ""}`}>
                          {trip.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatShortDate(trip.startDate)}
                          {trip.endDate && ` – ${formatShortDate(trip.endDate)}`}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {trip.destinations.map((d) => d.state ? `${d.city}, ${d.state}` : d.city).join(" → ")}
                        </span>
                        {trip.status === "upcoming" && (
                          <span className="text-blue-500 font-medium">{getDaysUntil(trip.startDate)}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t border-border px-4 py-3 space-y-3">
                      {trip.notes && (
                        <p className="text-sm text-muted-foreground">{trip.notes}</p>
                      )}
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Destinations</p>
                        {trip.destinations.map((dest) => (
                          <div key={dest.id} className="flex items-start gap-2 text-sm pl-2 border-l-2 border-muted">
                            <div>
                              <span className="font-medium">
                                {dest.city}{dest.state ? `, ${dest.state}` : ""}{dest.country !== "US" ? `, ${dest.country}` : ""}
                              </span>
                              {dest.arrivalDate && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  {formatDate(dest.arrivalDate)}
                                  {dest.departureDate && ` – ${formatDate(dest.departureDate)}`}
                                </span>
                              )}
                              {dest.notes && (
                                <p className="text-xs text-muted-foreground mt-0.5">{dest.notes}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button variant="outline" size="sm" onClick={() => setEditTrip(trip)}>Edit</Button>
                        <Button variant="destructive" size="sm" onClick={() => deleteTrip(trip.id)}>
                          <Trash2 className="h-3 w-3 mr-1" /> Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      {showCreate && (
        <TripFormDialog
          onClose={() => setShowCreate(false)}
          onSave={async (data) => {
            try {
              const res = await fetch("/api/travel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
              });
              if (!res.ok) throw new Error();
              toast.success("Trip created");
              setShowCreate(false);
              fetchTrips();
            } catch {
              toast.error("Failed to create trip");
            }
          }}
        />
      )}

      {/* Edit Dialog */}
      {editTrip && (
        <TripFormDialog
          trip={editTrip}
          onClose={() => setEditTrip(null)}
          onSave={async (data) => {
            try {
              const res = await fetch(`/api/travel/${editTrip.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
              });
              if (!res.ok) throw new Error();
              toast.success("Trip updated");
              setEditTrip(null);
              fetchTrips();
            } catch {
              toast.error("Failed to update trip");
            }
          }}
        />
      )}
    </div>
  );
}

// ── Trip Form Dialog ──

function TripFormDialog({
  trip,
  onClose,
  onSave,
}: {
  trip?: Trip;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => void;
}) {
  const [form, setForm] = useState({
    name: trip?.name || "",
    startDate: trip?.startDate ? trip.startDate.split("T")[0] : "",
    endDate: trip?.endDate ? trip.endDate.split("T")[0] : "",
    notes: trip?.notes || "",
    status: trip?.status || "upcoming",
  });

  const [destinations, setDestinations] = useState<DestinationInput[]>(
    trip?.destinations.map((d) => ({
      city: d.city,
      state: d.state || "",
      country: d.country || "US",
      arrivalDate: d.arrivalDate ? d.arrivalDate.split("T")[0] : "",
      departureDate: d.departureDate ? d.departureDate.split("T")[0] : "",
      notes: d.notes || "",
    })) || [{ city: "", state: "", country: "US", arrivalDate: "", departureDate: "", notes: "" }]
  );

  const addDestination = () => {
    setDestinations((prev) => [
      ...prev,
      { city: "", state: "", country: "US", arrivalDate: "", departureDate: "", notes: "" },
    ]);
  };

  const removeDestination = (index: number) => {
    if (destinations.length <= 1) return;
    setDestinations((prev) => prev.filter((_, i) => i !== index));
  };

  const updateDestination = (index: number, field: keyof DestinationInput, value: string) => {
    setDestinations((prev) =>
      prev.map((d, i) => (i === index ? { ...d, [field]: value } : d))
    );
  };

  const handleSave = () => {
    if (!form.name || !form.startDate || !destinations[0]?.city) {
      toast.error("Name, start date, and at least one destination city are required");
      return;
    }
    onSave({
      name: form.name,
      startDate: form.startDate,
      endDate: form.endDate || null,
      notes: form.notes || null,
      status: form.status,
      destinations: destinations
        .filter((d) => d.city)
        .map((d) => ({
          city: d.city,
          state: d.state || null,
          country: d.country || "US",
          arrivalDate: d.arrivalDate || null,
          departureDate: d.departureDate || null,
          notes: d.notes || null,
        })),
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{trip ? "Edit Trip" : "New Trip"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Trip Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Colorado Springs Trip"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
              />
            </div>
          </div>

          {trip && (
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              rows={2}
              placeholder="Trip details, purpose, etc."
            />
          </div>

          {/* Destinations */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Destinations</Label>
              <Button type="button" variant="outline" size="sm" onClick={addDestination}>
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
            <div className="space-y-3">
              {destinations.map((dest, i) => (
                <div key={i} className="border border-border rounded-md p-3 space-y-2 relative">
                  {destinations.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDestination(i)}
                      className="absolute top-2 right-2 text-muted-foreground hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <Input
                        placeholder="City"
                        value={dest.city}
                        onChange={(e) => updateDestination(i, "city", e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Input
                        placeholder="State"
                        value={dest.state}
                        onChange={(e) => updateDestination(i, "state", e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="date"
                      value={dest.arrivalDate}
                      onChange={(e) => updateDestination(i, "arrivalDate", e.target.value)}
                      className="h-8 text-xs"
                    />
                    <Input
                      type="date"
                      value={dest.departureDate}
                      onChange={(e) => updateDestination(i, "departureDate", e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave}>
              {trip ? "Save" : "Create Trip"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
