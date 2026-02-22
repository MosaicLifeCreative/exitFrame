import {
  Activity,
  CheckSquare,
  Target,
  TrendingUp,
  Moon,
  Utensils,
  DollarSign,
  Heart,
  Dumbbell,
  CalendarDays,
  Globe,
  BarChart3,
} from "lucide-react";

const placeholderWidgets = [
  { label: "Oura Readiness", icon: Activity, phase: 2 },
  { label: "Tasks Due Today", icon: CheckSquare, phase: 1 },
  { label: "Active Goals", icon: Target, phase: 3 },
  { label: "Weekly Trends", icon: TrendingUp, phase: 2 },
  { label: "Sleep Score", icon: Moon, phase: 2 },
  { label: "Meal Plan", icon: Utensils, phase: 4 },
  { label: "Monthly Budget", icon: DollarSign, phase: 5 },
  { label: "Health Metrics", icon: Heart, phase: 2 },
  { label: "Workout Streak", icon: Dumbbell, phase: 3 },
  { label: "Upcoming Events", icon: CalendarDays, phase: 6 },
  { label: "Site Status", icon: Globe, phase: 1 },
  { label: "Business Analytics", icon: BarChart3, phase: 7 },
];

export default function DashboardHome() {
  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-semibold text-foreground">
          Welcome back, Trey.
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Mosaic Life Dashboard — your command center.
        </p>
      </div>

      {/* Widget grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {placeholderWidgets.map((widget) => {
          const Icon = widget.icon;
          return (
            <div
              key={widget.label}
              className="rounded-lg border border-border bg-card p-6 flex flex-col items-center justify-center
                text-center space-y-3 min-h-[160px] hover:border-border/80 transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <Icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {widget.label}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Coming in Phase {widget.phase}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
