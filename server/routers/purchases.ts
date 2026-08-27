import { z } from "zod";
import { createPurchase } from "../db";
import { router } from "../_core/trpc";
import { stockProcedure } from "./_permissions";

export const purchasesRouter = router({
  create: stockProcedure
    .input(z.object({ supplierId: z.number().int().positive(), notes: z.string().trim().max(3000).optional(), items: z.array(z.object({ productId: z.number().int().positive(), quantity: z.coerce.number().positive(), unitCost: z.coerce.number().min(0) })).min(1) }))
    .mutation(({ ctx, input }) => createPurchase({ ...input, userId: ctx.user.id })),
});
