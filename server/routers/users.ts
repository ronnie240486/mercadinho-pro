import { z } from "zod";
import { updateUserRole, listUsers } from "../db";
import { adminProcedure, router } from "../_core/trpc";

export const usersRouter = router({
  list: adminProcedure.query(() => listUsers()),
  updateRole: adminProcedure.input(z.object({ userId: z.number().int().positive(), role: z.enum(["admin", "manager", "operator", "stockist"]) })).mutation(({ ctx, input }) => {
    if (input.userId === ctx.user.id && input.role !== "admin") {
      throw new Error("Um administrador não pode remover o próprio acesso administrativo.");
    }
    return updateUserRole(input.userId, input.role);
  }),
});
