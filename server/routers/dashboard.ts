import { getDashboardSummary, listCriticalStockProducts, listRecentActivity } from "../db";
import { router } from "../_core/trpc";
import { salesProcedure } from "./_permissions";

export const dashboardRouter = router({
  summary: salesProcedure.query(() => getDashboardSummary()),
  criticalStock: salesProcedure.query(() => listCriticalStockProducts()),
  activity: salesProcedure.query(() => listRecentActivity()),
});
