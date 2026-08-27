import { z } from "zod";
import { createPromotion, listActivePromotions, listPriceHistories, listPromotions } from "../db";
import { router } from "../_core/trpc";
import { managementProcedure, salesProcedure } from "./_permissions";

export const pricingRouter = router({
  active: salesProcedure.query(() => listActivePromotions()),
  promotions: managementProcedure.query(() => listPromotions()),
  history: managementProcedure.query(() => listPriceHistories()),
  createPromotion: managementProcedure.input(z.object({ productId: z.number().int().positive(), name: z.string().trim().min(2).max(160), promotionalPrice: z.coerce.number().min(0), startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })).mutation(({ input }) => createPromotion(input)),
});
