import { z } from "zod";
import { closeCashSession, getOpenCashSession, listCashMovements, openCashSession, recordCashMovement } from "../db";
import { router } from "../_core/trpc";
import { managementProcedure, salesProcedure } from "./_permissions";

export const cashRouter = router({
  status: salesProcedure.query(() => getOpenCashSession()),
  movements: salesProcedure.query(() => listCashMovements()),
  open: salesProcedure.input(z.object({ openingAmount: z.coerce.number().min(0), notes: z.string().trim().max(3000).optional() })).mutation(({ ctx, input }) => openCashSession({ ...input, userId: ctx.user.id })),
  record: salesProcedure.input(z.object({ type: z.enum(["supply", "withdrawal", "adjustment"]), amount: z.coerce.number().positive(), description: z.string().trim().max(255).optional() })).mutation(({ ctx, input }) => recordCashMovement({ ...input, userId: ctx.user.id })),
  close: managementProcedure.input(z.object({ actualClosingAmount: z.coerce.number().min(0), notes: z.string().trim().max(3000).optional() })).mutation(({ ctx, input }) => closeCashSession({ ...input, userId: ctx.user.id })),
});
