import { z } from "zod";
import { listStockMovements, recordStockMovement } from "../db";
import { router } from "../_core/trpc";
import { stockProcedure } from "./_permissions";

export const stockRouter = router({
  movements: stockProcedure.query(() => listStockMovements()),
  record: stockProcedure
    .input(z.object({ productId: z.number().int().positive(), supplierId: z.number().int().positive().nullable().optional(), type: z.enum(["entry", "outbound", "adjustment_in", "adjustment_out", "return"]), quantity: z.coerce.number().positive(), unitCost: z.coerce.number().min(0).optional(), reason: z.string().trim().max(255).optional() }))
    .mutation(({ ctx, input }) => recordStockMovement({ ...input, userId: ctx.user.id })),
});
