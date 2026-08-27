import { TRPCError } from "@trpc/server";
import { hasOperationalPermission, type OperationalRole } from "../businessUtils";
import { protectedProcedure } from "../_core/trpc";

function procedureForRoles(allowedRoles: readonly OperationalRole[]) {
  return protectedProcedure.use(({ ctx, next }) => {
    if (!hasOperationalPermission(ctx.user.role, allowedRoles)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Você não possui permissão para esta operação." });
    }
    return next({ ctx });
  });
}

export const salesProcedure = procedureForRoles(["user", "admin", "manager", "operator"]);
export const stockProcedure = procedureForRoles(["admin", "manager", "stockist"]);
export const managementProcedure = procedureForRoles(["admin", "manager"]);
