import { z } from "zod";
import { isLocalDate } from "@/lib/dates";
import {
  EXPENSE_CATEGORIES,
  PAYMENT_ALLOCATIONS,
  PAYMENT_METHODS,
} from "@/lib/db/schema";

export class PaymentError extends Error {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = "PaymentError";
  }
}

export const recordPaymentSchema = z.object({
  amountPesos: z.string().trim().min(1, "Enter the amount received."),
  allocation: z.enum(PAYMENT_ALLOCATIONS),
  method: z.enum(PAYMENT_METHODS),
  reference: z
    .string()
    .trim()
    .max(120, "Reference must be 120 characters or fewer.")
    .optional(),
  // datetime-local value in the property timezone; empty/omitted = now.
  receivedAt: z.string().trim().max(40).optional(),
  idempotencyKey: z
    .string()
    .trim()
    .max(100, "Idempotency key is too long.")
    .optional(),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export const recordRefundSchema = z.object({
  amountPesos: z.string().trim().min(1, "Enter the refund amount."),
  allocation: z.enum(PAYMENT_ALLOCATIONS),
  method: z.enum(PAYMENT_METHODS),
  reason: z
    .string()
    .trim()
    .min(2, "Give a short reason for the refund.")
    .max(500, "Reason must be 500 characters or fewer."),
});

export type RecordRefundInput = z.infer<typeof recordRefundSchema>;

export const addDeductionSchema = z.object({
  amountPesos: z.string().trim().min(1, "Enter the deduction amount."),
  reason: z
    .string()
    .trim()
    .min(2, "Describe what the deduction is for.")
    .max(500, "Reason must be 500 characters or fewer."),
  // Optional link to the damage report this deduction covers.
  damageReportId: z.string().uuid().optional(),
});

export type AddDeductionInput = z.infer<typeof addDeductionSchema>;

export const submitProofSchema = z.object({
  reference: z
    .string()
    .trim()
    .min(3, "Enter the reference number or sender name.")
    .max(200, "Reference must be 200 characters or fewer."),
  note: z
    .string()
    .trim()
    .max(500, "Note must be 500 characters or fewer.")
    .optional(),
});

export type SubmitProofInput = z.infer<typeof submitProofSchema>;

export const createExpenseSchema = z.object({
  propertyId: z.string().uuid().optional(),
  unitId: z.string().uuid().optional(),
  amountPesos: z.string().trim().min(1, "Enter the amount paid."),
  category: z.enum(EXPENSE_CATEGORIES, {
    message: "Choose an expense category.",
  }),
  description: z
    .string()
    .trim()
    .min(2, "Describe the expense.")
    .max(300, "Description must be 300 characters or fewer."),
  classification: z.enum(["operating", "capital"]),
  paidDate: z.string().refine(isLocalDate, {
    message: "Use a real calendar date (yyyy-mm-dd).",
  }),
  payee: z
    .string()
    .trim()
    .max(120, "Paid to must be 120 characters or fewer.")
    .optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

export const voidExpenseSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(2, "Say why this expense is being voided.")
    .max(300, "Reason must be 300 characters or fewer."),
});

export const recurringExpenseSchema = z.object({
  propertyId: z.string().uuid().optional(),
  unitId: z.string().uuid().optional(),
  amountPesos: z.string().trim().min(1, "Enter the usual amount."),
  category: z.enum(EXPENSE_CATEGORIES, {
    message: "Choose an expense category.",
  }),
  description: z
    .string()
    .trim()
    .min(2, "Name the bill.")
    .max(300, "Name must be 300 characters or fewer."),
  classification: z.enum(["operating", "capital"]),
  payee: z
    .string()
    .trim()
    .max(120, "Paid to must be 120 characters or fewer.")
    .optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  cadence: z.enum(["weekly", "monthly", "yearly"], {
    message: "Choose how often it repeats.",
  }),
  // The first due date when creating; the next due date when editing.
  dueDate: z.string().refine(isLocalDate, {
    message: "Use a real calendar date (yyyy-mm-dd).",
  }),
  endDate: z
    .string()
    .refine(isLocalDate, { message: "Use a real calendar date (yyyy-mm-dd)." })
    .optional(),
});

export type RecurringExpenseInput = z.infer<typeof recurringExpenseSchema>;

export const confirmRecurringSchema = z.object({
  dueDate: z.string().refine(isLocalDate),
  amountPesos: z.string().trim().optional(),
  paidDate: z
    .string()
    .refine(isLocalDate, { message: "Use a real calendar date (yyyy-mm-dd)." })
    .optional(),
});
