import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { pricingRouter } from "./routers/pricing";
import { financeRouter } from "./routers/finance";
import { publicProcedure, router } from "./_core/trpc";
import { cashRouter } from "./routers/cash";
import { catalogRouter } from "./routers/catalog";
import { dashboardRouter } from "./routers/dashboard";
import { reportsRouter } from "./routers/reports";
import { purchasesRouter } from "./routers/purchases";
import { salesRouter } from "./routers/sales";
import { stockRouter } from "./routers/stock";
import { usersRouter } from "./routers/users";

export const appRouter = router({
  system: systemRouter,
  pricing: pricingRouter,
  finance: financeRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  dashboard: dashboardRouter,
  catalog: catalogRouter,
  stock: stockRouter,
  cash: cashRouter,
  sales: salesRouter,
  reports: reportsRouter,
  purchases: purchasesRouter,
  users: usersRouter,
});

export type AppRouter = typeof appRouter;
