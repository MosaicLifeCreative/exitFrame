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
    name: "add_trip",
    description:
      "Add a new trip. Requires a name, start date, and at least one destination (city). Confirm details before creating.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "Trip name (e.g. 'Colorado Springs Trip', 'NYC Weekend')",
        },
        startDate: {
          type: "string",
          description: "Start date in YYYY-MM-DD format",
        },
        endDate: {
          type: "string",
          description: "End date in YYYY-MM-DD format (optional)",
        },
        notes: {
          type: "string",
          description: "Trip notes or details",
        },
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
        tripId: {
          type: "string",
          description: "Trip UUID (if known)",
        },
        tripName: {
          type: "string",
          description: "Trip name to search for (fuzzy match)",
        },
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
      "Delete a trip and all its destinations. Can search by name or UUID. Confirm before deleting.",
    input_schema: {
      type: "object" as const,
      properties: {
        tripId: {
          type: "string",
          description: "Trip UUID (if known)",
        },
        tripName: {
          type: "string",
          description: "Trip name to search for (fuzzy match)",
        },
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
  const start = trip.startDate.toISOString().split("T")[0];
  const end = trip.endDate ? trip.endDate.toISOString().split("T")[0] : "open-ended";
  const dests = trip.destinations
    .map((d) => {
      const loc = d.state ? `${d.city}, ${d.state}` : `${d.city}, ${d.country}`;
      const dates = d.arrivalDate
        ? ` (${d.arrivalDate.toISOString().split("T")[0]}${d.departureDate ? " to " + d.departureDate.toISOString().split("T")[0] : ""})`
        : "";
      return `  - ${loc}${dates}${d.notes ? ` — ${d.notes}` : ""}`;
    })
    .join("\n");

  return `${trip.name} [${trip.status}]\n  Dates: ${start} to ${end}\n  ID: ${trip.id}${trip.notes ? `\n  Notes: ${trip.notes}` : ""}\n  Destinations:\n${dests}`;
}

async function findTrip(tripId?: string, tripName?: string) {
  if (tripId) {
    return prisma.trip.findUnique({ where: { id: tripId }, include: tripInclude });
  }
  if (tripName) {
    // Fuzzy search — case-insensitive contains
    const trips = await prisma.trip.findMany({
      where: { name: { contains: tripName, mode: "insensitive" } },
      include: tripInclude,
      take: 1,
    });
    return trips[0] || null;
  }
  return null;
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
      return `Deleted trip "${trip.name}" and all its destinations.`;
    }

    default:
      return `Unknown travel tool: ${name}`;
  }
}
