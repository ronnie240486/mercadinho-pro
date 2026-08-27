import { listLoyaltyBalances, listSalesGoals } from "../db";
import { router } from "../_core/trpc";
import { managementProcedure } from "./_permissions";
export const loyaltyRouter = router({ balances: managementProcedure.query(() => listLoyaltyBalances()), goals: managementProcedure.query(() => listSalesGoals()) });
