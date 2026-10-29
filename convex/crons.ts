import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "purge expired sessions",
  { hourUTC: 3, minuteUTC: 0 },
  internal.access.purgeExpired,
);

crons.daily(
  "purge stale sign-ups and Stripe events",
  { hourUTC: 3, minuteUTC: 30 },
  internal.billing.purgeStale,
);

crons.daily(
  "trial ending reminders",
  { hourUTC: 8, minuteUTC: 0 },
  internal.billing.trialReminders,
);

crons.hourly(
  "purge unused dictations",
  { minuteUTC: 20 },
  internal.recipeImport.purgeAudio,
);

// 7 h in winter, 8 h in summer (Zurich)
crons.weekly(
  "weekly report to PA",
  { dayOfWeek: "monday", hourUTC: 6, minuteUTC: 0 },
  internal.visits.sendWeeklyReport,
);

export default crons;
