import { z } from "zod";
import { createCategory, createCustomer, createProduct, createSupplier, findProductByCode, listCategories, listCustomers, listProducts, listSuppliers, updateProduct } from "../db";
import { router } from "../_core/trpc";
import { managementProcedure, salesProcedure, stockProcedure } from "./_permissions";

const productInput = z.object({
  barcode: z.string().trim().max(64).optional(),
  internalCode: z.string().trim().max(48).optional(),
  name: z.string().trim().min(2).max(180),
  description: z.string().trim().max(3000).optional(),
  categoryId: z.number().int().positive().nullable().optional(),
  unit: z.string().trim().min(1).max(12).default("UN"),
  costPrice: z.coerce.number().min(0),
  salePrice: z.coerce.number().min(0),
  minimumStock: z.coerce.number().min(0),
});

export const catalogRouter = router({
  products: router({
    list: salesProcedure.input(z.object({ search: z.string().trim().max(100).optional() }).optional()).query(({ input }) => listProducts(input?.search)),
    scan: salesProcedure.input(z.object({ code: z.string().trim().min(3).max(64) })).mutation(({ input }) => findProductByCode(input.code)),
    create: stockProcedure.input(productInput).mutation(({ input }) => createProduct(input)),
    update: stockProcedure.input(productInput.extend({ id: z.number().int().positive(), active: z.boolean() })).mutation(({ ctx, input }) => updateProduct({ ...input, userId: ctx.user.id })),
  }),
  categories: router({
    list: salesProcedure.query(() => listCategories()),
    create: stockProcedure.input(z.object({ name: z.string().trim().min(2).max(120), description: z.string().trim().max(1000).optional() })).mutation(({ input }) => createCategory(input)),
  }),
  suppliers: router({
    list: stockProcedure.query(() => listSuppliers()),
    create: stockProcedure.input(z.object({ legalName: z.string().trim().min(2).max(180), tradeName: z.string().trim().max(180).optional(), document: z.string().trim().max(32).optional(), contactName: z.string().trim().max(140).optional(), phone: z.string().trim().max(32).optional(), email: z.string().email().max(320).optional(), notes: z.string().trim().max(3000).optional() })).mutation(({ input }) => createSupplier(input)),
  }),
  customers: router({
    list: salesProcedure.query(() => listCustomers()),
    create: salesProcedure.input(z.object({ name: z.string().trim().min(2).max(180), document: z.string().trim().max(32).optional(), phone: z.string().trim().max(32).optional(), email: z.string().email().max(320).optional(), notes: z.string().trim().max(3000).optional() })).mutation(({ input }) => createCustomer(input)),
  }),
  management: router({
    health: managementProcedure.query(() => ({ success: true })),
  }),
});
