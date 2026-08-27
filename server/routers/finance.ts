import { z } from "zod";
import { createAccountPayable, listAccountsPayable, payAccountPayable } from "../db";
import { router } from "../_core/trpc";
import { managementProcedure } from "./_permissions";

export const financeRouter = router({
  accounts: managementProcedure.query(() => listAccountsPayable()),
  createAccount: managementProcedure.input(z.object({ supplierId: z.number().int().positive().nullable().optional(), description: z.string().trim().min(2).max(180), dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), amount: z.coerce.number().positive(), notes: z.string().max(1000).optional() })).mutation(({ input }) => createAccountPayable(input)),
  payAccount: managementProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => payAccountPayable(input.id)),
});
