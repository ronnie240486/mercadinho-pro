import { z } from "zod";
import { listInventoryCounts, listProductBatches, listStockMovements, receiveProductBatch, recordInventoryCount, recordStockMovement, registerStockLoss } from "../db";
import { router } from "../_core/trpc";
import { stockProcedure } from "./_permissions";

export const stockRouter = router({
  movements: stockProcedure.query(() => listStockMovements()),
  batches: stockProcedure.query(() => listProductBatches()),
  inventory: stockProcedure.query(() => listInventoryCounts()),
  record: stockProcedure
    .input(z.object({ productId: z.number().int().positive(), supplierId: z.number().int().positive().nullable().optional(), type: z.enum(["entry", "outbound", "adjustment_in", "adjustment_out", "return"]), quantity: z.coerce.number().positive(), unitCost: z.coerce.number().min(0).optional(), reason: z.string().trim().max(255).optional() }))
    .mutation(({ ctx, input }) => recordStockMovement({ ...input, userId: ctx.user.id })),
  receiveBatch: stockProcedure
    .input(z.object({ productId: z.number().int().positive(), supplierId: z.number().int().positive().nullable().optional(), batchCode: z.string().trim().max(80).optional(), expirationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), quantity: z.coerce.number().positive(), unitCost: z.coerce.number().min(0).optional() }))
    .mutation(({ ctx, input }) => receiveProductBatch({ ...input, userId: ctx.user.id })),
  registerLoss: stockProcedure
    .input(z.object({ productId: z.number().int().positive(), batchId: z.number().int().positive().nullable().optional(), quantity: z.coerce.number().positive(), reason: z.string().trim().min(3).max(255) }))
    .mutation(({ ctx, input }) => registerStockLoss({ ...input, userId: ctx.user.id })),
  countInventory: stockProcedure
    .input(z.object({ productId: z.number().int().positive(), countedQuantity: z.coerce.number().min(0), reason: z.string().trim().max(255).optional() }))
    .mutation(({ ctx, input }) => recordInventoryCount({ ...input, userId: ctx.user.id })),
});
