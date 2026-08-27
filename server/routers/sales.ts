import { z } from "zod";
import { cancelSale, createSale, listRecentSales, listSaleItemsForReturn } from "../db";
import { paymentMethods } from "../businessUtils";
import { router } from "../_core/trpc";
import { salesProcedure } from "./_permissions";

export const salesRouter = router({
  listRecent: salesProcedure.query(() => listRecentSales()),
  itemsForReturn: salesProcedure.input(z.object({ saleId: z.number().int().positive() })).query(({ input }) => listSaleItemsForReturn(input.saleId)),
  cancel: salesProcedure.input(z.object({ saleId: z.number().int().positive(), reason: z.string().trim().min(3).max(255) })).mutation(({ ctx, input }) => cancelSale(input.saleId, ctx.user.id, input.reason)),
  create: salesProcedure
    .input(z.object({ customerId: z.number().int().positive().nullable().optional(), discountAmount: z.coerce.number().min(0).default(0), notes: z.string().trim().max(3000).optional(), items: z.array(z.object({ productId: z.number().int().positive(), quantity: z.coerce.number().positive() })).min(1), payments: z.array(z.object({ method: z.enum(paymentMethods), amount: z.coerce.number().positive(), reference: z.string().trim().max(120).optional() })).min(1) }))
    .mutation(({ ctx, input }) => createSale({ ...input, userId: ctx.user.id })),
});
