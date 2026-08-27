import { getReportsOverview } from "../db";
import { router } from "../_core/trpc";
import { managementProcedure } from "./_permissions";

export const reportsRouter = router({
  overview: managementProcedure.query(() => getReportsOverview()),
});
