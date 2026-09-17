import { z } from "zod";

/** Shared input rules. The same schemas guard the UI and the backends. */

const phoneRegex = /^[+]?[\d][\d\s()-]{6,18}$/;

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Enter a valid email address");

export const phoneSchema = z
  .string()
  .trim()
  .min(1, "Phone number is required")
  .regex(phoneRegex, "Enter a valid phone number");

export const leadFormSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80, "Name is too long"),
  email: emailSchema,
  phone: phoneSchema,
});

export type LeadFormValues = z.infer<typeof leadFormSchema>;

export const bankDetailsSchema = z.object({
  accountHolderName: z.string().trim().min(2, "Account holder name is required"),
  bankName: z.string().trim().min(2, "Bank name is required"),
  accountNumber: z
    .string()
    .trim()
    .min(6, "Account number looks too short")
    .max(24, "Account number looks too long")
    .regex(/^\d+$/, "Account number should contain digits only"),
  ifscCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Enter a valid IFSC code (e.g. HDFC0001234)"),
  upiId: z
    .string()
    .trim()
    .max(64)
    .refine((value) => value === "" || /^[\w.-]{2,}@[a-zA-Z]{2,}$/.test(value), "Enter a valid UPI ID or leave it blank")
    .default(""),
});

export type BankDetailsValues = z.infer<typeof bankDetailsSchema>;

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name").max(80),
    email: emailSchema,
    phone: phoneSchema,
    password: z.string().min(8, "Use at least 8 characters"),
    confirmPassword: z.string(),
  })
  .merge(bankDetailsSchema)
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterValues = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export type LoginValues = z.infer<typeof loginSchema>;

export const productSchema = z.object({
  name: z.string().trim().min(2, "Product name is required").max(120),
  description: z.string().trim().max(500).default(""),
  price: z.coerce.number().positive("Price must be greater than 0"),
  currency: z.string().trim().min(3).max(4).default("INR"),
  commissionPercent: z.coerce
    .number()
    .min(0.1, "Commission must be at least 0.1%")
    .max(100, "Commission cannot exceed 100%"),
  landingUrl: z
    .string()
    .trim()
    .refine((value) => value === "" || /^https?:\/\/\S+$/.test(value), "Enter a valid URL or leave it blank")
    .default(""),
  active: z.boolean().default(true),
});

export type ProductValues = z.infer<typeof productSchema>;

export const conversionSchema = z.object({
  saleAmount: z.coerce.number().positive("Sale amount must be greater than 0"),
  commissionPercent: z.coerce.number().min(0).max(100),
  note: z.string().trim().max(300).default(""),
});

export type ConversionValues = z.infer<typeof conversionSchema>;

export const payoutSchema = z.object({
  reference: z.string().trim().min(2, "Add the bank/UPI reference for this transfer").max(120),
  note: z.string().trim().max(300).default(""),
});

export type PayoutValues = z.infer<typeof payoutSchema>;

export const settingsSchema = z.object({
  brandName: z.string().trim().min(1).max(60).default("FunnelOS"),
  currency: z.string().trim().min(3).max(4).default("INR"),
  payoutHoldDays: z.coerce.number().int().min(0, "Cannot be negative").max(90, "That is more than 90 days"),
  publicBaseUrl: z
    .string()
    .trim()
    .refine((value) => value === "" || /^https?:\/\/\S+$/.test(value), "Enter a valid URL or leave it blank")
    .default(""),
  funnelosWebhookUrl: z
    .string()
    .trim()
    .refine((value) => value === "" || /^https?:\/\/\S+$/.test(value), "Enter a valid URL or leave it blank")
    .default(""),
  whatsappNumber: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d{8,15}$/.test(value), "Digits only, with country code (e.g. 919876543210)")
    .default(""),
  notifyFromEmail: z
    .string()
    .trim()
    .refine((value) => value === "" || z.string().email().safeParse(value).success, "Enter a valid email or leave it blank")
    .default(""),
  notifyAdminEmail: z
    .string()
    .trim()
    .refine((value) => value === "" || z.string().email().safeParse(value).success, "Enter a valid email or leave it blank")
    .default(""),
});

export type SettingsValues = z.infer<typeof settingsSchema>;

/** Normalizes a lead payload coming from an untrusted public form. */
export function sanitizeLead(input: { name?: string; email?: string; phone?: string }) {
  return {
    name: (input.name || "").trim().slice(0, 80),
    email: (input.email || "").trim().toLowerCase().slice(0, 120),
    phone: (input.phone || "").trim().slice(0, 20),
  };
}
