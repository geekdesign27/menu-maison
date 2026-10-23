import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "purge expired sessions",
  { hourUTC: 3, minuteUTC: 0 },
  internal.access.purgeExpired,
);

export default crons;
