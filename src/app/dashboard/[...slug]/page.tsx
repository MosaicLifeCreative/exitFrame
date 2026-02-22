import { Construction } from "lucide-react";

const phaseMap: Record<string, number> = {
  health: 2,
  fitness: 3,
  diet: 4,
  financial: 5,
  goals: 3,
  trackers: 2,
  plants: 6,
  home: 6,
  calendar: 6,
  clients: 1,
  wordpress: 1,
  content: 7,
  analytics: 7,
  "email-campaigns": 8,
  communications: 8,
  automations: 9,
  getshelfed: 10,
  manlyman: 10,
  "mlc-website": 10,
  "grove-city-events": 10,
};

export default function PlaceholderPage({
  params,
}: {
  params: { slug: string[] };
}) {
  const slug = params.slug[0];
  const phase = phaseMap[slug] ?? "?";
  const title = slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
        <Construction className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <p className="text-sm text-muted-foreground max-w-md">
        This module is coming in <strong>Phase {phase}</strong>. The foundation
        is in place — this feature will be built on top of it.
      </p>
    </div>
  );
}
