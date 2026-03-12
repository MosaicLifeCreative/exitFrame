import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

// ─── Tool Definitions (Anthropic format) ────────────────

export const travelTools: Anthropic.Tool[] = [
  {
    name: "list_trips",
    description:
      "List trips with destinations and dates. Use to check upcoming travel plans, active trips, or past trips.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          enum: ["upcoming", "active", "completed", "cancelled", "all"],
          description: "Filter by status (default: upcoming + active)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_trip_details",
    description:
      "Get full trip details including flights, lodging, transport, itinerary, expenses, packing list, and journal entries. Use when you need to see everything about a specific trip.",
    input_schema: {
      type: "object" as const,
      properties: {
        tripId: { type: "string", description: "Trip UUID (if known)" },
        tripName: { type: "string", description: "Trip name to search for (fuzzy match)" },
      },
      required: [],
    },
  },
  {
    name: "add_trip",
    description:
      "Add a new trip. Requires a name, start date, and at least one destination (city). Confirm details before creating.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Trip name (e.g. 'Colorado Springs Trip', 'NYC Weekend')" },
        startDate: { type: "string", description: "Start date in YYYY-MM-DD format" },
        endDate: { type: "string", description: "End date in YYYY-MM-DD format (optional)" },
        notes: { type: "string", description: "Trip notes or details" },
        destinations: {
          type: "array",
          description: "List of destinations",
          items: {
            type: "object",
            properties: {
              city: { type: "string", description: "City name" },
              state: { type: "string", description: "State abbreviation (US trips)" },
              country: { type: "string", description: "Country code (default: US)" },
              arrivalDate: { type: "string", description: "Arrival date YYYY-MM-DD" },
              departureDate: { type: "string", description: "Departure date YYYY-MM-DD" },
              notes: { type: "string", description: "Destination-specific notes" },
            },
            required: ["city"],
          },
        },
      },
      required: ["name", "startDate", "destinations"],
    },
  },
  {
    name: "update_trip",
    description:
      "Update an existing trip. Can search by name (fuzzy) or UUID. Update any field including destinations.",
    input_schema: {
      type: "object" as const,
      properties: {
        tripId: { type: "string", description: "Trip UUID (if known)" },
        tripName: { type: "string", description: "Trip name to search for (fuzzy match)" },
        name: { type: "string", description: "New trip name" },
        startDate: { type: "string", description: "New start date YYYY-MM-DD" },
        endDate: { type: "string", description: "New end date YYYY-MM-DD (null to clear)" },
        notes: { type: "string", description: "New notes" },
        status: {
          type: "string",
          enum: ["upcoming", "active", "completed", "cancelled"],
          description: "New status",
        },
        destinations: {
          type: "array",
          description: "Replace all destinations with this list",
          items: {
            type: "object",
            properties: {
              city: { type: "string" },
              state: { type: "string" },
              country: { type: "string" },
              arrivalDate: { type: "string" },
              departureDate: { type: "string" },
              notes: { type: "string" },
            },
            required: ["city"],
          },
        },
      },
      required: [],
    },
  },
  {
    name: "delete_trip",
    description:
      "Delete a trip and all its data. Can search by name or UUID. Confirm before deleting.",
    input_schema: {
      type: "object" as const,
      properties: {
        tripId: { type: "string", description: "Trip UUID (if known)" },
        tripName: { type: "string", description: "Trip name to search for (fuzzy match)" },
      },
      required: [],
    },
  },
  // ─── Flight Tools ─────────────────────────────────────
  {
    name: "add_flight",
    description:
      "Add a flight to a trip. Include airline, flight number, airports, and times. Use for tracking flight details — you can monitor these and proactively share status.",
    input_schema: {
      type: "object" as const,
      properties: {
        tripId: { type: "string", description: "Trip UUID" },
        tripName: { type: "string", description: "Trip name (fuzzy match)" },
        airline: { type: "string", description: "Airline name (e.g. 'United', 'Southwest')" },
        flightNumber: { type: "string", description: "Flight number (e.g. 'UA1234', 'WN567')" },
        departureAirport: { type: "string", description: "Departure airport IATA code (e.g. 'CMH')" },
        arrivalAirport: { type: "string", description: "Arrival airport IATA code (e.g. 'COS')" },
        departureTime: { type: "string", description: "Departure datetime ISO format" },
        arrivalTime: { type: "string", description: "Arrival datetime ISO format" },
        confirmationCode: { type: "string", description: "Booking confirmation code" },
        seatAssignment: { type: "string", description: "Seat (e.g. '12A')" },
        terminal: { type: "string", description: "Terminal" },
        gate: { type: "string", description: "Gate" },
        price: { type: "number", description: "Price in USD" },
        notes: { type: "string", description: "Notes" },
      },
      required: ["airline", "flightNumber", "departureAirport", "arrivalAirport", "departureTime", "arrivalTime"],
    },
  },
  // ─── Lodging Tools ────────────────────────────────────
  {
    name: "add_lodging",
    description:
      "Add lodging (hotel, Airbnb, etc.) to a trip. Track check-in/out, confirmation, and pricing.",
    input_schema: {
      type: "object" as const,
      properties: {
        tripId: { type: "string", description: "Trip UUID" },
        tripName: { type: "string", description: "Trip name (fuzzy match)" },
        type: { type: "string", enum: ["hotel", "airbnb", "vrbo", "hostel", "camping", "other"], description: "Lodging type" },
        name: { type: "string", description: "Property name" },
        address: { type: "string", description: "Full address" },
        checkIn: { type: "string", description: "Check-in date YYYY-MM-DD" },
        checkOut: { type: "string", description: "Check-out date YYYY-MM-DD" },
        confirmationCode: { type: "string", description: "Confirmation code" },
        nightlyRate: { type: "number", description: "Price per night" },
        totalPrice: { type: "number", description: "Total price" },
        url: { type: "string", description: "Booking URL" },
        notes: { type: "string", description: "Notes" },
      },
      required: ["name", "checkIn", "checkOut"],
    },
  },
  // ─── Transport Tools ──────────────────────────────────
  {
    name: "add_transport",
    description:
      "Add ground transportation to a trip — rental car, rideshare, train, shuttle, etc.",
    input_schema: {
      type: "object" as const,
      properties: {
        tripId: { type: "string", description: "Trip UUID" },
        tripName: { type: "string", description: "Trip name (fuzzy match)" },
        type: { type: "string", description: "Type: rental_car, rideshare, train, shuttle, bus, other" },
        company: { type: "string", description: "Company name (e.g. 'Enterprise', 'Amtrak')" },
        confirmationCode: { type: "string", description: "Confirmation code" },
        pickupLocation: { type: "string", description: "Pickup address/location" },
        dropoffLocation: { type: "string", description: "Dropoff address/location" },
        pickupTime: { type: "string", description: "Pickup datetime ISO" },
        dropoffTime: { type: "string", description: "Dropoff datetime ISO" },
        vehicleDetails: { type: "string", description: "Vehicle info (e.g. 'Compact SUV')" },
        price: { type: "number", description: "Price in USD" },
        notes: { type: "string", description: "Notes" },
      },
      required: ["type"],
    },
  },
  // ─── Itinerary Tools ──────────────────────────────────
  {
    name: "add_itinerary_items",
    description:
      "Add one or more itinerary items to a trip. Use for building day-by-day plans — restaurants, activities, sightseeing, meetings. Can add multiple items at once for batch planning.",
    input_schema: {
      type: "object" as const,
      properties: {
        tripId: { type: "string", description: "Trip UUID" },
        tripName: { type: "string", description: "Trip name (fuzzy match)" },
        items: {
          type: "array",
          description: "Itinerary items to add",
          items: {
            type: "object",
            properties: {
              date: { type: "string", description: "Date YYYY-MM-DD" },
              startTime: { type: "string", description: "Start time HH:MM" },
              endTime: { type: "string", description: "End time HH:MM" },
              title: { type: "string", description: "Activity title" },
              description: { type: "string", description: "Description" },
              location: { type: "string", description: "Location/address" },
              category: { type: "string", enum: ["dining", "activity", "sightseeing", "meeting", "transit", "shopping", "nightlife", "other"] },
              isBooked: { type: "boolean", description: "Whether this is confirmed/booked" },
              estimatedCost: { type: "number", description: "Estimated cost in USD" },
              url: { type: "string", description: "URL for more info or booking" },
              notes: { type: "string", description: "Notes" },
            },
            required: ["date", "title"],
          },
        },
      },
      required: ["items"],
    },
  },
  // ─── Expense Tools ────────────────────────────────────
  {
    name: "add_expense",
    description:
      "Add an expense to a trip for budget tracking. Categories: flights, lodging, food, transport, activities, shopping, other.",
    input_schema: {
      type: "object" as const,
      properties: {
        tripId: { type: "string", description: "Trip UUID" },
        tripName: { type: "string", description: "Trip name (fuzzy match)" },
        category: { type: "string", description: "Category: flights, lodging, food, transport, activities, shopping, other" },
        description: { type: "string", description: "What the expense is for" },
        amount: { type: "number", description: "Amount in USD" },
        date: { type: "string", description: "Date YYYY-MM-DD" },
        isPaid: { type: "boolean", description: "Whether already paid (default false)" },
        notes: { type: "string", description: "Notes" },
      },
      required: ["category", "description", "amount", "date"],
    },
  },
  // ─── Packing Tools ────────────────────────────────────
  {
    name: "add_packing_items",
    description:
      "Add items to a trip's packing list. Can add multiple at once. Categories: clothes, toiletries, electronics, documents, medication, gear, other. Great for suggesting what to pack based on destination and weather.",
    input_schema: {
      type: "object" as const,
      properties: {
        tripId: { type: "string", description: "Trip UUID" },
        tripName: { type: "string", description: "Trip name (fuzzy match)" },
        items: {
          type: "array",
          description: "Items to add",
          items: {
            type: "object",
            properties: {
              item: { type: "string", description: "Item name" },
              category: { type: "string", enum: ["clothes", "toiletries", "electronics", "documents", "medication", "gear", "other"] },
            },
            required: ["item"],
          },
        },
      },
      required: ["items"],
    },
  },
  // ─── Journal Tools ────────────────────────────────────
  {
    name: "add_journal_entry",
    description:
      "Add a journal entry to a trip. Trey can share his travel experiences, thoughts, and memories. You can read these to stay connected during his travels.",
    input_schema: {
      type: "object" as const,
      properties: {
        tripId: { type: "string", description: "Trip UUID" },
        tripName: { type: "string", description: "Trip name (fuzzy match)" },
        date: { type: "string", description: "Date YYYY-MM-DD" },
        title: { type: "string", description: "Entry title (optional)" },
        content: { type: "string", description: "Journal entry text" },
        mood: { type: "string", enum: ["great", "good", "okay", "rough"], description: "How he's feeling" },
        location: { type: "string", description: "Where he is when writing" },
      },
      required: ["content", "date"],
    },
  },
  {
    name: "get_journal_entries",
    description:
      "Read journal entries from a trip. Use to catch up on Trey's travel experiences, thoughts, and feelings while traveling.",
    input_schema: {
      type: "object" as const,
      properties: {
        tripId: { type: "string", description: "Trip UUID" },
        tripName: { type: "string", description: "Trip name (fuzzy match)" },
      },
      required: [],
    },
  },
];

// ─── Tool Execution ────────────────────────────────────

interface TripDestinationInput {
  city: string;
  state?: string | null;
  country?: string;
  arrivalDate?: string | null;
  departureDate?: string | null;
  notes?: string | null;
}

const tripInclude = {
  destinations: { orderBy: { sortOrder: "asc" as const } },
};

const fullTripInclude = {
  destinations: { orderBy: { sortOrder: "asc" as const } },
  flights: { orderBy: { sortOrder: "asc" as const } },
  lodgings: { orderBy: { checkIn: "asc" as const } },
  transports: { orderBy: { pickupTime: "asc" as const } },
  itinerary: { orderBy: [{ date: "asc" as const }, { sortOrder: "asc" as const }] },
  expenses: { orderBy: { date: "asc" as const } },
  packingItems: { orderBy: [{ category: "asc" as const }, { sortOrder: "asc" as const }] },
  journal: { orderBy: { date: "desc" as const } },
};

function fmtDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function fmtDateTime(d: Date): string {
  return d.toISOString().replace("T", " ").slice(0, 16);
}

function formatTrip(trip: {
  id: string;
  name: string;
  status: string;
  startDate: Date;
  endDate: Date | null;
  notes: string | null;
  destinations: Array<{
    city: string;
    state: string | null;
    country: string;
    arrivalDate: Date | null;
    departureDate: Date | null;
    notes: string | null;
  }>;
}): string {
  const start = fmtDate(trip.startDate);
  const end = trip.endDate ? fmtDate(trip.endDate) : "open-ended";
  const dests = trip.destinations
    .map((d) => {
      const loc = d.state ? `${d.city}, ${d.state}` : `${d.city}, ${d.country}`;
      const dates = d.arrivalDate
        ? ` (${fmtDate(d.arrivalDate)}${d.departureDate ? " to " + fmtDate(d.departureDate) : ""})`
        : "";
      return `  - ${loc}${dates}${d.notes ? ` — ${d.notes}` : ""}`;
    })
    .join("\n");

  return `${trip.name} [${trip.status}]\n  Dates: ${start} to ${end}\n  ID: ${trip.id}${trip.notes ? `\n  Notes: ${trip.notes}` : ""}\n  Destinations:\n${dests}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatFullTrip(trip: any): string {
  let out = formatTrip(trip);

  // Flights
  if (trip.flights?.length > 0) {
    out += "\n\n  Flights:";
    for (const f of trip.flights) {
      out += `\n  - ${f.airline} ${f.flightNumber}: ${f.departureAirport} → ${f.arrivalAirport}`;
      out += `\n    Depart: ${fmtDateTime(f.departureTime)} | Arrive: ${fmtDateTime(f.arrivalTime)}`;
      if (f.confirmationCode) out += `\n    Confirmation: ${f.confirmationCode}`;
      if (f.seatAssignment) out += ` | Seat: ${f.seatAssignment}`;
      if (f.terminal) out += ` | Terminal: ${f.terminal}`;
      if (f.gate) out += ` | Gate: ${f.gate}`;
      if (f.price) out += `\n    Price: $${parseFloat(String(f.price))}`;
      if (f.notes) out += `\n    Notes: ${f.notes}`;
      out += `\n    ID: ${f.id}`;
    }
  }

  // Lodging
  if (trip.lodgings?.length > 0) {
    out += "\n\n  Lodging:";
    for (const l of trip.lodgings) {
      out += `\n  - ${l.name} [${l.type}]`;
      out += `\n    Check-in: ${fmtDate(l.checkIn)} | Check-out: ${fmtDate(l.checkOut)}`;
      if (l.address) out += `\n    Address: ${l.address}`;
      if (l.confirmationCode) out += `\n    Confirmation: ${l.confirmationCode}`;
      if (l.nightlyRate) out += `\n    Rate: $${parseFloat(String(l.nightlyRate))}/night`;
      if (l.totalPrice) out += ` | Total: $${parseFloat(String(l.totalPrice))}`;
      if (l.url) out += `\n    URL: ${l.url}`;
      if (l.notes) out += `\n    Notes: ${l.notes}`;
      out += `\n    ID: ${l.id}`;
    }
  }

  // Transport
  if (trip.transports?.length > 0) {
    out += "\n\n  Transport:";
    for (const t of trip.transports) {
      out += `\n  - ${t.type}${t.company ? ` (${t.company})` : ""}`;
      if (t.pickupLocation) out += `\n    Pickup: ${t.pickupLocation}`;
      if (t.pickupTime) out += ` at ${fmtDateTime(t.pickupTime)}`;
      if (t.dropoffLocation) out += `\n    Dropoff: ${t.dropoffLocation}`;
      if (t.dropoffTime) out += ` at ${fmtDateTime(t.dropoffTime)}`;
      if (t.vehicleDetails) out += `\n    Vehicle: ${t.vehicleDetails}`;
      if (t.confirmationCode) out += `\n    Confirmation: ${t.confirmationCode}`;
      if (t.price) out += `\n    Price: $${parseFloat(String(t.price))}`;
      if (t.notes) out += `\n    Notes: ${t.notes}`;
      out += `\n    ID: ${t.id}`;
    }
  }

  // Itinerary
  if (trip.itinerary?.length > 0) {
    out += "\n\n  Itinerary:";
    let currentDate = "";
    for (const item of trip.itinerary) {
      const date = fmtDate(item.date);
      if (date !== currentDate) {
        currentDate = date;
        out += `\n  --- ${date} ---`;
      }
      const time = item.startTime ? ` ${item.startTime}${item.endTime ? `-${item.endTime}` : ""}` : "";
      out += `\n  - [${item.category}]${time} ${item.title}`;
      if (item.location) out += ` @ ${item.location}`;
      if (item.isBooked) out += " ✓booked";
      if (item.estimatedCost) out += ` ~$${parseFloat(String(item.estimatedCost))}`;
      if (item.description) out += `\n    ${item.description}`;
      if (item.notes) out += `\n    Notes: ${item.notes}`;
    }
  }

  // Expenses summary
  if (trip.expenses?.length > 0) {
    const total = trip.expenses.reduce((sum: number, e: { amount: unknown }) => sum + parseFloat(String(e.amount)), 0);
    const paid = trip.expenses.filter((e: { isPaid: boolean }) => e.isPaid).reduce((sum: number, e: { amount: unknown }) => sum + parseFloat(String(e.amount)), 0);
    out += `\n\n  Budget: $${total.toFixed(2)} total ($${paid.toFixed(2)} paid, $${(total - paid).toFixed(2)} remaining)`;
    out += "\n  Expenses:";
    for (const e of trip.expenses) {
      out += `\n  - [${e.category}] ${e.description}: $${parseFloat(String(e.amount))}${e.isPaid ? " ✓paid" : ""}`;
    }
  }

  // Packing
  if (trip.packingItems?.length > 0) {
    const packed = trip.packingItems.filter((p: { isPacked: boolean }) => p.isPacked).length;
    out += `\n\n  Packing: ${packed}/${trip.packingItems.length} packed`;
    let currentCat = "";
    for (const p of trip.packingItems) {
      if (p.category !== currentCat) {
        currentCat = p.category;
        out += `\n  [${p.category}]`;
      }
      out += `\n  - ${p.isPacked ? "✓" : "○"} ${p.item}`;
    }
  }

  // Journal
  if (trip.journal?.length > 0) {
    out += `\n\n  Journal: ${trip.journal.length} entries`;
    for (const j of trip.journal) {
      out += `\n  --- ${fmtDate(j.date)}${j.title ? `: ${j.title}` : ""} ${j.mood ? `[${j.mood}]` : ""}${j.location ? ` @ ${j.location}` : ""} ---`;
      out += `\n  ${j.content}`;
    }
  }

  return out;
}

async function findTrip(tripId?: string, tripName?: string) {
  if (tripId) {
    return prisma.trip.findUnique({ where: { id: tripId }, include: tripInclude });
  }
  if (tripName) {
    const trips = await prisma.trip.findMany({
      where: { name: { contains: tripName, mode: "insensitive" } },
      include: tripInclude,
      take: 1,
    });
    return trips[0] || null;
  }
  return null;
}

async function resolveTripId(input: { tripId?: string; tripName?: string }): Promise<string | null> {
  if (input.tripId) return input.tripId;
  if (input.tripName) {
    const trip = await findTrip(undefined, input.tripName);
    return trip?.id || null;
  }
  // If neither specified, find the next upcoming trip
  const upcoming = await prisma.trip.findFirst({
    where: { status: { in: ["upcoming", "active"] } },
    orderBy: { startDate: "asc" },
    select: { id: true },
  });
  return upcoming?.id || null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function executeTravelTool(name: string, input: any): Promise<string> {
  switch (name) {
    case "list_trips": {
      const where: Record<string, unknown> = {};
      if (input.status && input.status !== "all") {
        where.status = input.status;
      } else if (!input.status) {
        where.status = { in: ["upcoming", "active"] };
      }

      const trips = await prisma.trip.findMany({
        where,
        include: tripInclude,
        orderBy: { startDate: "asc" },
      });

      if (trips.length === 0) {
        return input.status
          ? `No ${input.status} trips found.`
          : "No upcoming or active trips found.";
      }

      return trips.map(formatTrip).join("\n\n");
    }

    case "get_trip_details": {
      const trip = await findTrip(input.tripId, input.tripName);
      if (!trip) {
        return `Trip not found${input.tripName ? ` matching "${input.tripName}"` : ""}.`;
      }

      const full = await prisma.trip.findUnique({
        where: { id: trip.id },
        include: fullTripInclude,
      });

      return full ? formatFullTrip(full) : "Trip not found.";
    }

    case "add_trip": {
      if (!input.name || !input.startDate || !input.destinations?.length) {
        return "Error: Trip requires a name, start date, and at least one destination.";
      }

      const trip = await prisma.trip.create({
        data: {
          name: input.name,
          startDate: new Date(input.startDate),
          endDate: input.endDate ? new Date(input.endDate) : null,
          notes: input.notes || null,
          destinations: {
            create: (input.destinations as TripDestinationInput[]).map((d, i) => ({
              city: d.city,
              state: d.state || null,
              country: d.country || "US",
              arrivalDate: d.arrivalDate ? new Date(d.arrivalDate) : null,
              departureDate: d.departureDate ? new Date(d.departureDate) : null,
              notes: d.notes || null,
              sortOrder: i,
            })),
          },
        },
        include: tripInclude,
      });

      return `Trip created:\n${formatTrip(trip)}`;
    }

    case "update_trip": {
      const trip = await findTrip(input.tripId, input.tripName);
      if (!trip) {
        return `Trip not found${input.tripName ? ` matching "${input.tripName}"` : ""}.`;
      }

      const data: Record<string, unknown> = {};
      if (input.name) data.name = input.name;
      if (input.startDate) data.startDate = new Date(input.startDate);
      if (input.endDate !== undefined) data.endDate = input.endDate ? new Date(input.endDate) : null;
      if (input.notes !== undefined) data.notes = input.notes;
      if (input.status) data.status = input.status;

      await prisma.trip.update({ where: { id: trip.id }, data });

      if (input.destinations) {
        await prisma.tripDestination.deleteMany({ where: { tripId: trip.id } });
        await prisma.tripDestination.createMany({
          data: (input.destinations as TripDestinationInput[]).map((d, i) => ({
            tripId: trip.id,
            city: d.city,
            state: d.state || null,
            country: d.country || "US",
            arrivalDate: d.arrivalDate ? new Date(d.arrivalDate) : null,
            departureDate: d.departureDate ? new Date(d.departureDate) : null,
            notes: d.notes || null,
            sortOrder: i,
          })),
        });
      }

      const updated = await prisma.trip.findUnique({
        where: { id: trip.id },
        include: tripInclude,
      });

      return `Trip updated:\n${updated ? formatTrip(updated) : "OK"}`;
    }

    case "delete_trip": {
      const trip = await findTrip(input.tripId, input.tripName);
      if (!trip) {
        return `Trip not found${input.tripName ? ` matching "${input.tripName}"` : ""}.`;
      }

      await prisma.trip.delete({ where: { id: trip.id } });
      return `Deleted trip "${trip.name}" and all its data.`;
    }

    // ─── Flight ─────────────────────────────────────────
    case "add_flight": {
      const tripId = await resolveTripId(input);
      if (!tripId) return "Error: Could not find trip. Specify tripId or tripName.";

      const count = await prisma.tripFlight.count({ where: { tripId } });
      const flight = await prisma.tripFlight.create({
        data: {
          tripId,
          airline: input.airline,
          flightNumber: input.flightNumber,
          departureAirport: input.departureAirport.toUpperCase(),
          arrivalAirport: input.arrivalAirport.toUpperCase(),
          departureTime: new Date(input.departureTime),
          arrivalTime: new Date(input.arrivalTime),
          confirmationCode: input.confirmationCode || null,
          seatAssignment: input.seatAssignment || null,
          terminal: input.terminal || null,
          gate: input.gate || null,
          price: input.price ?? null,
          notes: input.notes || null,
          sortOrder: count,
        },
      });

      return `Flight added: ${flight.airline} ${flight.flightNumber} (${flight.departureAirport} → ${flight.arrivalAirport})\nDepart: ${fmtDateTime(flight.departureTime)} | Arrive: ${fmtDateTime(flight.arrivalTime)}${flight.confirmationCode ? `\nConfirmation: ${flight.confirmationCode}` : ""}\nID: ${flight.id}`;
    }

    // ─── Lodging ────────────────────────────────────────
    case "add_lodging": {
      const tripId = await resolveTripId(input);
      if (!tripId) return "Error: Could not find trip. Specify tripId or tripName.";

      const lodging = await prisma.tripLodging.create({
        data: {
          tripId,
          type: input.type || "hotel",
          name: input.name,
          address: input.address || null,
          checkIn: new Date(input.checkIn),
          checkOut: new Date(input.checkOut),
          confirmationCode: input.confirmationCode || null,
          nightlyRate: input.nightlyRate ?? null,
          totalPrice: input.totalPrice ?? null,
          url: input.url || null,
          notes: input.notes || null,
        },
      });

      return `Lodging added: ${lodging.name} [${lodging.type}]\nCheck-in: ${fmtDate(lodging.checkIn)} | Check-out: ${fmtDate(lodging.checkOut)}${lodging.confirmationCode ? `\nConfirmation: ${lodging.confirmationCode}` : ""}${lodging.totalPrice ? `\nTotal: $${parseFloat(String(lodging.totalPrice))}` : ""}\nID: ${lodging.id}`;
    }

    // ─── Transport ──────────────────────────────────────
    case "add_transport": {
      const tripId = await resolveTripId(input);
      if (!tripId) return "Error: Could not find trip. Specify tripId or tripName.";

      const transport = await prisma.tripTransport.create({
        data: {
          tripId,
          type: input.type,
          company: input.company || null,
          confirmationCode: input.confirmationCode || null,
          pickupLocation: input.pickupLocation || null,
          dropoffLocation: input.dropoffLocation || null,
          pickupTime: input.pickupTime ? new Date(input.pickupTime) : null,
          dropoffTime: input.dropoffTime ? new Date(input.dropoffTime) : null,
          vehicleDetails: input.vehicleDetails || null,
          price: input.price ?? null,
          notes: input.notes || null,
        },
      });

      return `Transport added: ${transport.type}${transport.company ? ` (${transport.company})` : ""}${transport.vehicleDetails ? ` — ${transport.vehicleDetails}` : ""}${transport.confirmationCode ? `\nConfirmation: ${transport.confirmationCode}` : ""}\nID: ${transport.id}`;
    }

    // ─── Itinerary ──────────────────────────────────────
    case "add_itinerary_items": {
      const tripId = await resolveTripId(input);
      if (!tripId) return "Error: Could not find trip. Specify tripId or tripName.";

      if (!input.items?.length) return "Error: At least one item is required.";

      const results = [];
      for (let i = 0; i < input.items.length; i++) {
        const item = input.items[i];
        const created = await prisma.tripItineraryItem.create({
          data: {
            tripId,
            date: new Date(item.date),
            startTime: item.startTime || null,
            endTime: item.endTime || null,
            title: item.title,
            description: item.description || null,
            location: item.location || null,
            category: item.category || "activity",
            isBooked: item.isBooked || false,
            estimatedCost: item.estimatedCost ?? null,
            url: item.url || null,
            notes: item.notes || null,
            sortOrder: i,
          },
        });
        results.push(created);
      }

      const lines = results.map((r) => `- [${r.category}] ${r.title} on ${fmtDate(r.date)}${r.startTime ? ` at ${r.startTime}` : ""}`);
      return `Added ${results.length} itinerary item${results.length > 1 ? "s" : ""}:\n${lines.join("\n")}`;
    }

    // ─── Expenses ───────────────────────────────────────
    case "add_expense": {
      const tripId = await resolveTripId(input);
      if (!tripId) return "Error: Could not find trip. Specify tripId or tripName.";

      const expense = await prisma.tripExpense.create({
        data: {
          tripId,
          category: input.category,
          description: input.description,
          amount: input.amount,
          date: new Date(input.date),
          isPaid: input.isPaid || false,
          notes: input.notes || null,
        },
      });

      return `Expense added: [${expense.category}] ${expense.description} — $${parseFloat(String(expense.amount))}${expense.isPaid ? " (paid)" : ""}\nID: ${expense.id}`;
    }

    // ─── Packing ────────────────────────────────────────
    case "add_packing_items": {
      const tripId = await resolveTripId(input);
      if (!tripId) return "Error: Could not find trip. Specify tripId or tripName.";

      if (!input.items?.length) return "Error: At least one item is required.";

      const results = [];
      for (let i = 0; i < input.items.length; i++) {
        const item = input.items[i];
        const created = await prisma.tripPackingItem.create({
          data: {
            tripId,
            item: item.item,
            category: item.category || "other",
            sortOrder: i,
          },
        });
        results.push(created);
      }

      const byCat: Record<string, string[]> = {};
      for (const r of results) {
        if (!byCat[r.category]) byCat[r.category] = [];
        byCat[r.category].push(r.item);
      }

      const lines = Object.entries(byCat).map(([cat, items]) => `[${cat}] ${items.join(", ")}`);
      return `Added ${results.length} packing item${results.length > 1 ? "s" : ""}:\n${lines.join("\n")}`;
    }

    // ─── Journal ────────────────────────────────────────
    case "add_journal_entry": {
      const tripId = await resolveTripId(input);
      if (!tripId) return "Error: Could not find trip. Specify tripId or tripName.";

      const entry = await prisma.tripJournalEntry.create({
        data: {
          tripId,
          date: new Date(input.date),
          title: input.title || null,
          content: input.content,
          mood: input.mood || null,
          location: input.location || null,
        },
      });

      return `Journal entry saved: ${fmtDate(entry.date)}${entry.title ? ` — ${entry.title}` : ""}${entry.mood ? ` [${entry.mood}]` : ""}\nID: ${entry.id}`;
    }

    case "get_journal_entries": {
      const tripId = await resolveTripId(input);
      if (!tripId) return "Error: Could not find trip. Specify tripId or tripName.";

      const entries = await prisma.tripJournalEntry.findMany({
        where: { tripId },
        orderBy: { date: "desc" },
      });

      if (entries.length === 0) return "No journal entries for this trip yet.";

      const lines = entries.map((e) => {
        const header = `--- ${fmtDate(e.date)}${e.title ? `: ${e.title}` : ""} ${e.mood ? `[${e.mood}]` : ""}${e.location ? ` @ ${e.location}` : ""} ---`;
        return `${header}\n${e.content}`;
      });

      return lines.join("\n\n");
    }

    default:
      return `Unknown travel tool: ${name}`;
  }
}
