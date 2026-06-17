import { z } from "zod";

export const identitySchema = z.object({
  first_name: z.string().min(1, "First name is required").max(100),
  last_name: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Invalid email"),
  department: z.string().max(100).default(""),
  job_title: z.string().max(100).default(""),
  manager_id: z.string().uuid().nullable().optional(),
  employee_id: z.string().min(1, "Employee ID is required").max(50),
  status: z.enum(["active", "disabled"]).default("active"),
  last_login: z.string().datetime().nullable().optional(),
});

export const updateIdentitySchema = identitySchema.partial();

export type IdentityInput = z.infer<typeof identitySchema>;

export const roleSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(500).optional(),
  is_administrative: z.boolean().default(false),
});

export const updateRoleOwnershipSchema = z.object({
  owner_id: z.string().uuid().nullable(),
  review_frequency: z
    .enum(["monthly", "quarterly", "semi_annual", "annual"])
    .nullable(),
});

export const updateApplicationOwnershipSchema = z.object({
  owner_id: z.string().uuid().nullable(),
  criticality_level: z.enum(["low", "medium", "high", "critical"]).nullable(),
  review_frequency: z
    .enum(["monthly", "quarterly", "semi_annual", "annual"])
    .nullable(),
});

export const groupSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(500).optional(),
});

export const applicationSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(500).optional(),
});

export const sodRuleSchema = z.object({
  role_a_id: z.string().uuid(),
  role_b_id: z.string().uuid(),
  risk_level: z.enum(["medium", "high", "critical"]).default("critical"),
  description: z.string().max(500).default(""),
}).refine((data) => data.role_a_id !== data.role_b_id, {
  message: "Roles must be different",
  path: ["role_b_id"],
});

export const campaignSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  type: z.enum(["application", "role", "group"]),
  reviewer_id: z.string().uuid().optional(),
  entitlement_id: z.string().uuid(),
  department_filter: z.string().optional(),
  due_date: z.string().optional(),
});

export const reviewDecisionSchema = z.object({
  decision: z.enum(["approved", "revoked", "escalated"]),
  notes: z.string().max(1000).optional(),
});

// CSV import schemas
export const csvUserSchema = z.object({
  email: z.string().email(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  department: z.string().default(""),
  job_title: z.string().default(""),
  employee_id: z.string().min(1),
  status: z.enum(["active", "disabled"]).default("active"),
});

const reviewFrequencySchema = z.enum(["monthly", "quarterly", "semi_annual", "annual"]);

const optionalEmail = z
  .string()
  .optional()
  .transform((v) => (v?.trim() ? v.trim() : undefined))
  .pipe(z.union([z.string().email(), z.undefined()]));

const optionalReviewFrequency = z
  .string()
  .optional()
  .transform((v) => (v?.trim() ? v.trim() : undefined))
  .pipe(z.union([reviewFrequencySchema, z.undefined()]));

const optionalCriticality = z
  .string()
  .optional()
  .transform((v) => (v?.trim() ? v.trim() : undefined))
  .pipe(z.union([z.enum(["low", "medium", "high", "critical"]), z.undefined()]));

export const csvRoleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  is_administrative: z
    .union([z.boolean(), z.string()])
    .transform((v) => v === true || v === "true" || v === "1")
    .default(false),
  owner_email: optionalEmail,
  review_frequency: optionalReviewFrequency,
});

export const csvGroupSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export const csvApplicationSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  owner_email: optionalEmail,
  criticality_level: optionalCriticality,
  review_frequency: optionalReviewFrequency,
});

export const csvEntitlementSchema = z.object({
  email: z.string().email(),
  entitlement_type: z.enum(["role", "group", "application"]),
  entitlement_name: z.string().min(1),
});

export type CsvUserRow = z.infer<typeof csvUserSchema>;
export type CsvRoleRow = z.infer<typeof csvRoleSchema>;
export type CsvGroupRow = z.infer<typeof csvGroupSchema>;
export type CsvApplicationRow = z.infer<typeof csvApplicationSchema>;
export type CsvEntitlementRow = z.infer<typeof csvEntitlementSchema>;

export type ImportType = "users" | "roles" | "groups" | "applications" | "entitlements";
