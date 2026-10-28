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

crons.hourly(
  "purge unused dictations",
  { minuteUTC: 20 },
  internal.recipeImport.purgeAudio,
);

export default crons;
