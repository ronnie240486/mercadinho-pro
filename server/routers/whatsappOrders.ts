import { z } from "zod";
import { createWhatsappOrder, listWhatsappOrders, markWhatsappOrderSent } from "../db";
import { router } from "../_core/trpc";
import { salesProcedure } from "./_permissions";

export const whatsappOrdersRouter = router({
  list: salesProcedure.query(() => listWhatsappOrders()),
  create: salesProcedure.input(z.object({ customerName: z.string().trim().min(2).max(180), customerPhone: z.string().trim().max(32).optional(), fulfillment: z.enum(["pickup", "delivery"]), deliveryAddress: z.string().trim().max(500).optional(), paymentMethod: z.enum(["cash", "debit", "credit", "pix"]), notes: z.string().trim().max(2000).optional(), items: z.array(z.object({ productId: z.number().int().positive(), quantity: z.coerce.number().positive() })).min(1) })).mutation(({ ctx, input }) => createWhatsappOrder({ ...input, userId: ctx.user.id })),
  markSent: salesProcedure.input(z.object({ code: z.string().trim().min(1).max(32) })).mutation(({ input }) => markWhatsappOrderSent(input.code)),
});
