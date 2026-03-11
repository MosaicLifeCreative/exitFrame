interface RecurringConfigLike {
  frequency: string;
  intervalDays: number | null;
  daysOfWeek: number[];
  dayOfMonth: number | null;
  monthOfYear: number | null;
}

export function calculateNextDueDate(config: RecurringConfigLike, fromDate: Date): Date {
  const next = new Date(fromDate);
  next.setHours(0, 0, 0, 0);

  switch (config.frequency) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;

    case "weekly":
      if (config.daysOfWeek.length > 0) {
        // Find the next matching day of week
        const currentDay = next.getDay();
        const sorted = Array.from(new Set(config.daysOfWeek)).sort((a, b) => a - b);
        const nextDay = sorted.find((d) => d > currentDay);
        if (nextDay !== undefined) {
          next.setDate(next.getDate() + (nextDay - currentDay));
        } else {
          // Wrap to next week's first day
          next.setDate(next.getDate() + (7 - currentDay + sorted[0]));
        }
      } else {
        next.setDate(next.getDate() + 7);
      }
      break;

    case "biweekly":
      next.setDate(next.getDate() + 14);
      break;

    case "monthly":
      next.setMonth(next.getMonth() + 1);
      if (config.dayOfMonth) {
        const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
        next.setDate(Math.min(config.dayOfMonth, maxDay));
      }
      break;

    case "quarterly":
      next.setMonth(next.getMonth() + 3);
      if (config.dayOfMonth) {
        const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
        next.setDate(Math.min(config.dayOfMonth, maxDay));
      }
      break;

    case "yearly":
      next.setFullYear(next.getFullYear() + 1);
      if (config.monthOfYear) next.setMonth(config.monthOfYear - 1);
      if (config.dayOfMonth) {
        const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
        next.setDate(Math.min(config.dayOfMonth, maxDay));
      }
      break;

    case "custom":
      next.setDate(next.getDate() + (config.intervalDays || 1));
      break;

    default:
      next.setDate(next.getDate() + 1);
  }

  return next;
}
