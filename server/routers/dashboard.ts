import { getDashboardSummary, listRecentActivity } from "../db";
import { router } from "../_core/trpc";
import { salesProcedure } from "./_permissions";

export const dashboardRouter = router({
  summary: salesProcedure.query(() => getDashboardSummary()),
  activity: salesProcedure.query(() => listRecentActivity()),
});
