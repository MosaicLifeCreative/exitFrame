"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  Plane,
  Hotel,
  Car,
  MapPin,
  Calendar,
  DollarSign,
  CheckSquare,
  BookOpen,
  Trash2,
  X,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

interface Flight {
  id: string;
  airline: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  arrivalTime: string;
  confirmationCode: string | null;
  seatAssignment: string | null;
  terminal: string | null;
  gate: string | null;
  price: string | null;
  notes: string | null;
}

interface Lodging {
  id: string;
  type: string;
  name: string;
  address: string | null;
  checkIn: string;
  checkOut: string;
  confirmationCode: string | null;
  nightlyRate: string | null;
  totalPrice: string | null;
  url: string | null;
  notes: string | null;
}

interface Transport {
  id: string;
  type: string;
  company: string | null;
  confirmationCode: string | null;
  pickupLocation: string | null;
  dropoffLocation: string | null;
  pickupTime: string | null;
  dropoffTime: string | null;
  vehicleDetails: string | null;
  price: string | null;
  notes: string | null;
}

interface ItineraryItem {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  title: string;
  description: string | null;
  location: string | null;
  category: string;
  isBooked: boolean;
  estimatedCost: string | null;
  url: string | null;
  notes: string | null;
}

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: string;
  date: string;
  isPaid: boolean;
  notes: string | null;
}

interface PackingItem {
  id: string;
  item: string;
  category: string;
  isPacked: boolean;
}

interface JournalEntry {
  id: string;
  date: string;
  title: string | null;
  content: string;
  mood: string | null;
  location: string | null;
}

interface Trip {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  destinations: TripDestination[];
  flights: Flight[];
  lodgings: Lodging[];
  transports: Transport[];
  itinerary: ItineraryItem[];
  expenses: Expense[];
  packingItems: PackingItem[];
  journal: JournalEntry[];
}

// ── Helpers ──

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const fmtShortDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

const fmtTime = (d: string) =>
  new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

const statusColors: Record<string, string> = {
  upcoming: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  completed: "bg-gray-100 text-gray-500 dark:bg-gray-900/30 dark:text-gray-500",
  cancelled: "bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400",
};

const categoryIcons: Record<string, string> = {
  dining: "🍽",
  activity: "🎯",
  sightseeing: "📸",
  meeting: "🤝",
  transit: "🚗",
  shopping: "🛍",
  nightlife: "🌙",
  other: "📌",
};

const moodColors: Record<string, string> = {
  great: "text-green-500",
  good: "text-blue-500",
  okay: "text-yellow-500",
  rough: "text-red-500",
};

// ── Page ──

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // Dialog states
  const [showFlightForm, setShowFlightForm] = useState(false);
  const [showLodgingForm, setShowLodgingForm] = useState(false);
  const [showTransportForm, setShowTransportForm] = useState(false);
  const [showItineraryForm, setShowItineraryForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showPackingForm, setShowPackingForm] = useState(false);
  const [showJournalForm, setShowJournalForm] = useState(false);

  const fetchTrip = useCallback(async () => {
    try {
      const res = await fetch(`/api/travel/${tripId}`);
      const json = await res.json();
      if (json.data) setTrip(json.data);
      else toast.error("Trip not found");
    } catch {
      toast.error("Failed to load trip");
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    fetchTrip();
  }, [fetchTrip]);

  const deleteSubResource = async (resource: string, idParam: string, id: string) => {
    try {
      await fetch(`/api/travel/${tripId}/${resource}?${idParam}=${id}`, { method: "DELETE" });
      toast.success("Deleted");
      fetchTrip();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const togglePacked = async (item: PackingItem) => {
    try {
      await fetch(`/api/travel/${tripId}/packing`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, isPacked: !item.isPacked }),
      });
      fetchTrip();
    } catch {
      toast.error("Failed to update");
    }
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  if (!trip) return <div className="text-center py-12 text-muted-foreground">Trip not found</div>;

  const totalExpenses = trip.expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
  const paidExpenses = trip.expenses.filter((e) => e.isPaid).reduce((s, e) => s + parseFloat(e.amount), 0);
  const packedCount = trip.packingItems.filter((p) => p.isPacked).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/travel")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{trip.name}</h1>
            <Badge variant="secondary" className={statusColors[trip.status] || ""}>
              {trip.status}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {fmtDate(trip.startDate)}
              {trip.endDate && ` – ${fmtDate(trip.endDate)}`}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {trip.destinations.map((d) => d.state ? `${d.city}, ${d.state}` : d.city).join(" → ")}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 lg:grid-cols-8 h-auto">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="flights" className="text-xs">
            Flights {trip.flights.length > 0 && `(${trip.flights.length})`}
          </TabsTrigger>
          <TabsTrigger value="lodging" className="text-xs">
            Lodging {trip.lodgings.length > 0 && `(${trip.lodgings.length})`}
          </TabsTrigger>
          <TabsTrigger value="transport" className="text-xs">
            Transport {trip.transports.length > 0 && `(${trip.transports.length})`}
          </TabsTrigger>
          <TabsTrigger value="itinerary" className="text-xs">
            Itinerary {trip.itinerary.length > 0 && `(${trip.itinerary.length})`}
          </TabsTrigger>
          <TabsTrigger value="budget" className="text-xs">
            Budget {trip.expenses.length > 0 && `($${totalExpenses.toFixed(0)})`}
          </TabsTrigger>
          <TabsTrigger value="packing" className="text-xs">
            Packing {trip.packingItems.length > 0 && `(${packedCount}/${trip.packingItems.length})`}
          </TabsTrigger>
          <TabsTrigger value="journal" className="text-xs">
            Journal {trip.journal.length > 0 && `(${trip.journal.length})`}
          </TabsTrigger>
        </TabsList>

        {/* ── Overview ── */}
        <TabsContent value="overview" className="space-y-4">
          {trip.notes && (
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{trip.notes}</p>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Destinations */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Destinations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {trip.destinations.map((d) => (
                  <div key={d.id} className="text-sm border-l-2 border-muted pl-3">
                    <span className="font-medium">{d.city}{d.state ? `, ${d.state}` : ""}</span>
                    {d.arrivalDate && (
                      <span className="text-xs text-muted-foreground ml-2">
                        {fmtShortDate(d.arrivalDate)}{d.departureDate && ` – ${fmtShortDate(d.departureDate)}`}
                      </span>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Flights</span>
                  <span>{trip.flights.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lodging</span>
                  <span>{trip.lodgings.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Itinerary Items</span>
                  <span>{trip.itinerary.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Budget</span>
                  <span>${totalExpenses.toFixed(2)}{paidExpenses > 0 && ` ($${paidExpenses.toFixed(2)} paid)`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Packing</span>
                  <span>{packedCount}/{trip.packingItems.length} packed</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Journal</span>
                  <span>{trip.journal.length} entries</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Upcoming flights preview */}
          {trip.flights.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Plane className="h-4 w-4" /> Flights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {trip.flights.map((f) => (
                  <div key={f.id} className="flex items-center gap-3 text-sm">
                    <span className="font-medium">{f.airline} {f.flightNumber}</span>
                    <span className="text-muted-foreground">{f.departureAirport} → {f.arrivalAirport}</span>
                    <span className="text-xs text-muted-foreground">{fmtDate(f.departureTime)} {fmtTime(f.departureTime)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Flights ── */}
        <TabsContent value="flights" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowFlightForm(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Flight
            </Button>
          </div>
          {trip.flights.length === 0 ? (
            <EmptyState icon={Plane} message="No flights added yet" />
          ) : (
            <div className="space-y-3">
              {trip.flights.map((f) => (
                <Card key={f.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{f.airline} {f.flightNumber}</span>
                          <span className="text-sm text-muted-foreground">{f.departureAirport} → {f.arrivalAirport}</span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          <span>Depart: {fmtDate(f.departureTime)} at {fmtTime(f.departureTime)}</span>
                          <span className="mx-2">|</span>
                          <span>Arrive: {fmtDate(f.arrivalTime)} at {fmtTime(f.arrivalTime)}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
                          {f.confirmationCode && <span>Confirmation: <strong>{f.confirmationCode}</strong></span>}
                          {f.seatAssignment && <span>Seat: {f.seatAssignment}</span>}
                          {f.terminal && <span>Terminal: {f.terminal}</span>}
                          {f.gate && <span>Gate: {f.gate}</span>}
                          {f.price && <span>${parseFloat(f.price)}</span>}
                        </div>
                        {f.notes && <p className="text-xs text-muted-foreground mt-1">{f.notes}</p>}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => deleteSubResource("flights", "flightId", f.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Lodging ── */}
        <TabsContent value="lodging" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowLodgingForm(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Lodging
            </Button>
          </div>
          {trip.lodgings.length === 0 ? (
            <EmptyState icon={Hotel} message="No lodging added yet" />
          ) : (
            <div className="space-y-3">
              {trip.lodgings.map((l) => (
                <Card key={l.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{l.name}</span>
                          <Badge variant="outline" className="text-[10px]">{l.type}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Check-in: {fmtDate(l.checkIn)} | Check-out: {fmtDate(l.checkOut)}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
                          {l.address && <span>{l.address}</span>}
                          {l.confirmationCode && <span>Confirmation: <strong>{l.confirmationCode}</strong></span>}
                          {l.nightlyRate && <span>${parseFloat(l.nightlyRate)}/night</span>}
                          {l.totalPrice && <span>Total: ${parseFloat(l.totalPrice)}</span>}
                        </div>
                        {l.notes && <p className="text-xs text-muted-foreground mt-1">{l.notes}</p>}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => deleteSubResource("lodging", "lodgingId", l.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Transport ── */}
        <TabsContent value="transport" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowTransportForm(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Transport
            </Button>
          </div>
          {trip.transports.length === 0 ? (
            <EmptyState icon={Car} message="No transport added yet" />
          ) : (
            <div className="space-y-3">
              {trip.transports.map((t) => (
                <Card key={t.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium capitalize">{t.type.replace("_", " ")}</span>
                          {t.company && <span className="text-sm text-muted-foreground">({t.company})</span>}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
                          {t.pickupLocation && <span>Pickup: {t.pickupLocation}{t.pickupTime && ` at ${fmtTime(t.pickupTime)}`}</span>}
                          {t.dropoffLocation && <span>Dropoff: {t.dropoffLocation}{t.dropoffTime && ` at ${fmtTime(t.dropoffTime)}`}</span>}
                          {t.vehicleDetails && <span>Vehicle: {t.vehicleDetails}</span>}
                          {t.confirmationCode && <span>Confirmation: <strong>{t.confirmationCode}</strong></span>}
                          {t.price && <span>${parseFloat(t.price)}</span>}
                        </div>
                        {t.notes && <p className="text-xs text-muted-foreground mt-1">{t.notes}</p>}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => deleteSubResource("transport", "transportId", t.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Itinerary ── */}
        <TabsContent value="itinerary" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowItineraryForm(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Item
            </Button>
          </div>
          {trip.itinerary.length === 0 ? (
            <EmptyState icon={Calendar} message="No itinerary items yet. Ask Ayden to help plan your days!" />
          ) : (
            <div className="space-y-4">
              {groupByDate(trip.itinerary).map(([date, items]) => (
                <div key={date}>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">{fmtDate(date)}</h3>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <Card key={item.id}>
                        <CardContent className="py-3 px-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-2">
                              <span className="text-lg">{categoryIcons[item.category] || "📌"}</span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{item.title}</span>
                                  {item.isBooked && <Badge variant="outline" className="text-[10px] text-green-600">Booked</Badge>}
                                </div>
                                <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground mt-0.5">
                                  {item.startTime && <span>{item.startTime}{item.endTime && ` – ${item.endTime}`}</span>}
                                  {item.location && <span>@ {item.location}</span>}
                                  {item.estimatedCost && <span>~${parseFloat(item.estimatedCost)}</span>}
                                </div>
                                {item.description && <p className="text-xs text-muted-foreground mt-1">{item.description}</p>}
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => deleteSubResource("itinerary", "itemId", item.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Budget ── */}
        <TabsContent value="budget" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Total: <strong className="text-foreground">${totalExpenses.toFixed(2)}</strong>
              {paidExpenses > 0 && <> | Paid: <strong className="text-green-600">${paidExpenses.toFixed(2)}</strong></>}
              {totalExpenses - paidExpenses > 0 && <> | Remaining: <strong className="text-orange-500">${(totalExpenses - paidExpenses).toFixed(2)}</strong></>}
            </div>
            <Button size="sm" onClick={() => setShowExpenseForm(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Expense
            </Button>
          </div>
          {trip.expenses.length === 0 ? (
            <EmptyState icon={DollarSign} message="No expenses tracked yet" />
          ) : (
            <div className="space-y-2">
              {trip.expenses.map((e) => (
                <Card key={e.id}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-[10px]">{e.category}</Badge>
                        <span className="text-sm">{e.description}</span>
                        <span className="text-sm font-medium">${parseFloat(e.amount)}</span>
                        {e.isPaid && <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700">Paid</Badge>}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">{fmtShortDate(e.date)}</span>
                        <Button variant="ghost" size="sm" onClick={() => deleteSubResource("expenses", "expenseId", e.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Packing ── */}
        <TabsContent value="packing" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {packedCount}/{trip.packingItems.length} items packed
            </div>
            <Button size="sm" onClick={() => setShowPackingForm(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Items
            </Button>
          </div>
          {trip.packingItems.length === 0 ? (
            <EmptyState icon={CheckSquare} message="No packing list yet. Ask Ayden to suggest what to pack!" />
          ) : (
            <div className="space-y-4">
              {groupByCategory(trip.packingItems).map(([cat, items]) => (
                <div key={cat}>
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 capitalize">{cat}</h3>
                  <div className="space-y-1">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 group">
                        <button
                          onClick={() => togglePacked(item)}
                          className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                            item.isPacked ? "bg-green-500 border-green-500 text-white" : "border-muted-foreground/30"
                          }`}
                        >
                          {item.isPacked && <span className="text-[10px]">✓</span>}
                        </button>
                        <span className={`text-sm ${item.isPacked ? "line-through text-muted-foreground" : ""}`}>
                          {item.item}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                          onClick={() => deleteSubResource("packing", "itemId", item.id)}
                        >
                          <X className="h-3 w-3 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Journal ── */}
        <TabsContent value="journal" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowJournalForm(true)}>
              <Plus className="h-4 w-4 mr-1" /> New Entry
            </Button>
          </div>
          {trip.journal.length === 0 ? (
            <EmptyState icon={BookOpen} message="No journal entries yet. Share your travel experiences!" />
          ) : (
            <div className="space-y-4">
              {trip.journal.map((entry) => (
                <Card key={entry.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium">{fmtDate(entry.date)}</span>
                          {entry.title && <span className="text-sm text-muted-foreground">— {entry.title}</span>}
                          {entry.mood && (
                            <Badge variant="outline" className={`text-[10px] ${moodColors[entry.mood] || ""}`}>
                              {entry.mood}
                            </Badge>
                          )}
                          {entry.location && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {entry.location}
                            </span>
                          )}
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{entry.content}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => deleteSubResource("journal", "entryId", entry.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Form Dialogs ── */}
      {showFlightForm && (
        <FlightFormDialog
          tripId={tripId}
          onClose={() => setShowFlightForm(false)}
          onSaved={() => { setShowFlightForm(false); fetchTrip(); }}
        />
      )}
      {showLodgingForm && (
        <LodgingFormDialog
          tripId={tripId}
          onClose={() => setShowLodgingForm(false)}
          onSaved={() => { setShowLodgingForm(false); fetchTrip(); }}
        />
      )}
      {showTransportForm && (
        <TransportFormDialog
          tripId={tripId}
          onClose={() => setShowTransportForm(false)}
          onSaved={() => { setShowTransportForm(false); fetchTrip(); }}
        />
      )}
      {showItineraryForm && (
        <ItineraryFormDialog
          tripId={tripId}
          onClose={() => setShowItineraryForm(false)}
          onSaved={() => { setShowItineraryForm(false); fetchTrip(); }}
        />
      )}
      {showExpenseForm && (
        <ExpenseFormDialog
          tripId={tripId}
          onClose={() => setShowExpenseForm(false)}
          onSaved={() => { setShowExpenseForm(false); fetchTrip(); }}
        />
      )}
      {showPackingForm && (
        <PackingFormDialog
          tripId={tripId}
          onClose={() => setShowPackingForm(false)}
          onSaved={() => { setShowPackingForm(false); fetchTrip(); }}
        />
      )}
      {showJournalForm && (
        <JournalFormDialog
          tripId={tripId}
          onClose={() => setShowJournalForm(false)}
          onSaved={() => { setShowJournalForm(false); fetchTrip(); }}
        />
      )}
    </div>
  );
}

// ── Helpers ──

function EmptyState({ icon: Icon, message }: { icon: React.ComponentType<{ className?: string }>; message: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Icon className="h-8 w-8 mb-2 opacity-40" />
        <p className="text-sm">{message}</p>
      </CardContent>
    </Card>
  );
}

function groupByDate(items: ItineraryItem[]): [string, ItineraryItem[]][] {
  const groups: Record<string, ItineraryItem[]> = {};
  for (const item of items) {
    const date = item.date.split("T")[0];
    if (!groups[date]) groups[date] = [];
    groups[date].push(item);
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
}

function groupByCategory(items: PackingItem[]): [string, PackingItem[]][] {
  const groups: Record<string, PackingItem[]> = {};
  for (const item of items) {
    if (!groups[item.category]) groups[item.category] = [];
    groups[item.category].push(item);
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
}

// ── Form Dialogs ──

function FlightFormDialog({ tripId, onClose, onSaved }: { tripId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    airline: "", flightNumber: "", departureAirport: "", arrivalAirport: "",
    departureTime: "", arrivalTime: "", confirmationCode: "", seatAssignment: "",
    terminal: "", gate: "", price: "", notes: "",
  });

  const handleSave = async () => {
    if (!form.airline || !form.flightNumber || !form.departureAirport || !form.arrivalAirport || !form.departureTime || !form.arrivalTime) {
      toast.error("Airline, flight number, airports, and times are required");
      return;
    }
    try {
      const res = await fetch(`/api/travel/${tripId}/flights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price: form.price ? parseFloat(form.price) : null,
          confirmationCode: form.confirmationCode || null,
          seatAssignment: form.seatAssignment || null,
          terminal: form.terminal || null,
          gate: form.gate || null,
          notes: form.notes || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Flight added");
      onSaved();
    } catch { toast.error("Failed to add flight"); }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add Flight</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Airline</Label><Input value={form.airline} onChange={(e) => setForm((p) => ({ ...p, airline: e.target.value }))} placeholder="Southwest" /></div>
            <div><Label>Flight Number</Label><Input value={form.flightNumber} onChange={(e) => setForm((p) => ({ ...p, flightNumber: e.target.value }))} placeholder="WN1234" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>From (Airport)</Label><Input value={form.departureAirport} onChange={(e) => setForm((p) => ({ ...p, departureAirport: e.target.value.toUpperCase() }))} placeholder="CMH" maxLength={4} /></div>
            <div><Label>To (Airport)</Label><Input value={form.arrivalAirport} onChange={(e) => setForm((p) => ({ ...p, arrivalAirport: e.target.value.toUpperCase() }))} placeholder="COS" maxLength={4} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Departure</Label><Input type="datetime-local" value={form.departureTime} onChange={(e) => setForm((p) => ({ ...p, departureTime: e.target.value }))} /></div>
            <div><Label>Arrival</Label><Input type="datetime-local" value={form.arrivalTime} onChange={(e) => setForm((p) => ({ ...p, arrivalTime: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Confirmation Code</Label><Input value={form.confirmationCode} onChange={(e) => setForm((p) => ({ ...p, confirmationCode: e.target.value }))} /></div>
            <div><Label>Seat</Label><Input value={form.seatAssignment} onChange={(e) => setForm((p) => ({ ...p, seatAssignment: e.target.value }))} placeholder="12A" /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Terminal</Label><Input value={form.terminal} onChange={(e) => setForm((p) => ({ ...p, terminal: e.target.value }))} /></div>
            <div><Label>Gate</Label><Input value={form.gate} onChange={(e) => setForm((p) => ({ ...p, gate: e.target.value }))} /></div>
            <div><Label>Price</Label><Input type="number" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} placeholder="0.00" /></div>
          </div>
          <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={2} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave}>Add Flight</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LodgingFormDialog({ tripId, onClose, onSaved }: { tripId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    type: "hotel", name: "", address: "", checkIn: "", checkOut: "",
    confirmationCode: "", nightlyRate: "", totalPrice: "", url: "", notes: "",
  });

  const handleSave = async () => {
    if (!form.name || !form.checkIn || !form.checkOut) { toast.error("Name, check-in, and check-out are required"); return; }
    try {
      const res = await fetch(`/api/travel/${tripId}/lodging`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          nightlyRate: form.nightlyRate ? parseFloat(form.nightlyRate) : null,
          totalPrice: form.totalPrice ? parseFloat(form.totalPrice) : null,
          address: form.address || null, confirmationCode: form.confirmationCode || null,
          url: form.url || null, notes: form.notes || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Lodging added");
      onSaved();
    } catch { toast.error("Failed to add lodging"); }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add Lodging</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["hotel", "airbnb", "vrbo", "hostel", "camping", "other"].map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Hampton Inn" /></div>
          </div>
          <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Check-in</Label><Input type="date" value={form.checkIn} onChange={(e) => setForm((p) => ({ ...p, checkIn: e.target.value }))} /></div>
            <div><Label>Check-out</Label><Input type="date" value={form.checkOut} onChange={(e) => setForm((p) => ({ ...p, checkOut: e.target.value }))} /></div>
          </div>
          <div><Label>Confirmation Code</Label><Input value={form.confirmationCode} onChange={(e) => setForm((p) => ({ ...p, confirmationCode: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nightly Rate</Label><Input type="number" value={form.nightlyRate} onChange={(e) => setForm((p) => ({ ...p, nightlyRate: e.target.value }))} placeholder="0.00" /></div>
            <div><Label>Total Price</Label><Input type="number" value={form.totalPrice} onChange={(e) => setForm((p) => ({ ...p, totalPrice: e.target.value }))} placeholder="0.00" /></div>
          </div>
          <div><Label>Booking URL</Label><Input value={form.url} onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))} /></div>
          <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={2} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave}>Add Lodging</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TransportFormDialog({ tripId, onClose, onSaved }: { tripId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    type: "rental_car", company: "", confirmationCode: "",
    pickupLocation: "", dropoffLocation: "", pickupTime: "", dropoffTime: "",
    vehicleDetails: "", price: "", notes: "",
  });

  const handleSave = async () => {
    if (!form.type) { toast.error("Type is required"); return; }
    try {
      const res = await fetch(`/api/travel/${tripId}/transport`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price: form.price ? parseFloat(form.price) : null,
          company: form.company || null, confirmationCode: form.confirmationCode || null,
          pickupLocation: form.pickupLocation || null, dropoffLocation: form.dropoffLocation || null,
          pickupTime: form.pickupTime || null, dropoffTime: form.dropoffTime || null,
          vehicleDetails: form.vehicleDetails || null, notes: form.notes || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Transport added");
      onSaved();
    } catch { toast.error("Failed to add transport"); }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add Transport</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["rental_car", "rideshare", "train", "shuttle", "bus", "other"].map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Company</Label><Input value={form.company} onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))} placeholder="Enterprise" /></div>
          </div>
          <div><Label>Confirmation Code</Label><Input value={form.confirmationCode} onChange={(e) => setForm((p) => ({ ...p, confirmationCode: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Pickup Location</Label><Input value={form.pickupLocation} onChange={(e) => setForm((p) => ({ ...p, pickupLocation: e.target.value }))} /></div>
            <div><Label>Dropoff Location</Label><Input value={form.dropoffLocation} onChange={(e) => setForm((p) => ({ ...p, dropoffLocation: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Pickup Time</Label><Input type="datetime-local" value={form.pickupTime} onChange={(e) => setForm((p) => ({ ...p, pickupTime: e.target.value }))} /></div>
            <div><Label>Dropoff Time</Label><Input type="datetime-local" value={form.dropoffTime} onChange={(e) => setForm((p) => ({ ...p, dropoffTime: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Vehicle</Label><Input value={form.vehicleDetails} onChange={(e) => setForm((p) => ({ ...p, vehicleDetails: e.target.value }))} placeholder="Compact SUV" /></div>
            <div><Label>Price</Label><Input type="number" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} /></div>
          </div>
          <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={2} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave}>Add Transport</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ItineraryFormDialog({ tripId, onClose, onSaved }: { tripId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    date: "", startTime: "", endTime: "", title: "", description: "",
    location: "", category: "activity", estimatedCost: "", url: "", notes: "",
    isBooked: false,
  });

  const handleSave = async () => {
    if (!form.date || !form.title) { toast.error("Date and title are required"); return; }
    try {
      const res = await fetch(`/api/travel/${tripId}/itinerary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          estimatedCost: form.estimatedCost ? parseFloat(form.estimatedCost) : null,
          startTime: form.startTime || null, endTime: form.endTime || null,
          description: form.description || null, location: form.location || null,
          url: form.url || null, notes: form.notes || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Itinerary item added");
      onSaved();
    } catch { toast.error("Failed to add item"); }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add Itinerary Item</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Garden of the Gods hike" /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} /></div>
            <div><Label>Start</Label><Input type="time" value={form.startTime} onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))} /></div>
            <div><Label>End</Label><Input type="time" value={form.endTime} onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["dining", "activity", "sightseeing", "meeting", "transit", "shopping", "nightlife", "other"].map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Est. Cost</Label><Input type="number" value={form.estimatedCost} onChange={(e) => setForm((p) => ({ ...p, estimatedCost: e.target.value }))} placeholder="0.00" /></div>
          </div>
          <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} /></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2} /></div>
          <div><Label>URL</Label><Input value={form.url} onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))} /></div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isBooked" checked={form.isBooked} onChange={(e) => setForm((p) => ({ ...p, isBooked: e.target.checked }))} className="h-4 w-4" />
            <Label htmlFor="isBooked">Already booked/confirmed</Label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave}>Add Item</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ExpenseFormDialog({ tripId, onClose, onSaved }: { tripId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    category: "other", description: "", amount: "", date: new Date().toISOString().slice(0, 10),
    isPaid: false, notes: "",
  });

  const handleSave = async () => {
    if (!form.description || !form.amount || !form.date) { toast.error("Description, amount, and date are required"); return; }
    try {
      const res = await fetch(`/api/travel/${tripId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount),
          notes: form.notes || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Expense added");
      onSaved();
    } catch { toast.error("Failed to add expense"); }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["flights", "lodging", "food", "transport", "activities", "shopping", "other"].map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Amount</Label><Input type="number" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} placeholder="0.00" /></div>
          </div>
          <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></div>
          <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} /></div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isPaid" checked={form.isPaid} onChange={(e) => setForm((p) => ({ ...p, isPaid: e.target.checked }))} className="h-4 w-4" />
            <Label htmlFor="isPaid">Already paid</Label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave}>Add Expense</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PackingFormDialog({ tripId, onClose, onSaved }: { tripId: string; onClose: () => void; onSaved: () => void }) {
  const [items, setItems] = useState([{ item: "", category: "other" }]);

  const addRow = () => setItems((prev) => [...prev, { item: "", category: "other" }]);

  const handleSave = async () => {
    const valid = items.filter((i) => i.item.trim());
    if (valid.length === 0) { toast.error("Add at least one item"); return; }
    try {
      const res = await fetch(`/api/travel/${tripId}/packing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(valid),
      });
      if (!res.ok) throw new Error();
      toast.success(`Added ${valid.length} item${valid.length > 1 ? "s" : ""}`);
      onSaved();
    } catch { toast.error("Failed to add items"); }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add Packing Items</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={item.item}
                onChange={(e) => setItems((prev) => prev.map((p, j) => j === i ? { ...p, item: e.target.value } : p))}
                placeholder="Item name"
                className="flex-1"
              />
              <Select
                value={item.category}
                onValueChange={(v) => setItems((prev) => prev.map((p, j) => j === i ? { ...p, category: v } : p))}
              >
                <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["clothes", "toiletries", "electronics", "documents", "medication", "gear", "other"].map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {items.length > 1 && (
                <Button variant="ghost" size="sm" onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addRow} className="w-full">
            <Plus className="h-3 w-3 mr-1" /> Add Row
          </Button>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave}>Add Items</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function JournalFormDialog({ tripId, onClose, onSaved }: { tripId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    title: "", content: "", mood: "", location: "",
  });

  const handleSave = async () => {
    if (!form.content || !form.date) { toast.error("Date and content are required"); return; }
    try {
      const res = await fetch(`/api/travel/${tripId}/journal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          title: form.title || null,
          mood: form.mood || null,
          location: form.location || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Journal entry saved");
      onSaved();
    } catch { toast.error("Failed to save entry"); }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Journal Entry</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} /></div>
            <div>
              <Label>Mood</Label>
              <Select value={form.mood} onValueChange={(v) => setForm((p) => ({ ...p, mood: v }))}>
                <SelectTrigger><SelectValue placeholder="How are you feeling?" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="great">Great</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="okay">Okay</SelectItem>
                  <SelectItem value="rough">Rough</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Title (optional)</Label><Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Day 1 in Colorado Springs" /></div>
          <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} placeholder="Garden of the Gods" /></div>
          <div>
            <Label>Entry</Label>
            <Textarea
              value={form.content}
              onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
              rows={8}
              placeholder="Write about your day, experiences, thoughts..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave}>Save Entry</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
