import { z } from "zod";
import { createSale, listRecentSales } from "../db";
import { paymentMethods } from "../businessUtils";
import { router } from "../_core/trpc";
import { salesProcedure } from "./_permissions";

export const salesRouter = router({
  listRecent: salesProcedure.query(() => listRecentSales()),
  create: salesProcedure
    .input(z.object({ customerId: z.number().int().positive().nullable().optional(), discountAmount: z.coerce.number().min(0).default(0), notes: z.string().trim().max(3000).optional(), items: z.array(z.object({ productId: z.number().int().positive(), quantity: z.coerce.number().positive() })).min(1), payments: z.array(z.object({ method: z.enum(paymentMethods), amount: z.coerce.number().positive(), reference: z.string().trim().max(120).optional() })).min(1) }))
    .mutation(({ ctx, input }) => createSale({ ...input, userId: ctx.user.id })),
});
