/**
 * Campaign Validation Schemas
 * Zod schemas for validating campaign-related requests
 */

import { z } from "zod";

/**
 * Schema for creating a new campaign
 */
export const createCampaignSchema = z.object({
  // Wallet that will receive donations (required, must be verified)
  wallet: z
    .string()
    .min(32, "Wallet address too short")
    .max(44, "Wallet address too long"),

  // Campaign title
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title cannot exceed 100 characters"),

  // Campaign description (optional but recommended)
  description: z
    .string()
    .max(2000, "Description cannot exceed 2000 characters")
    .optional(),

  // Image URL for the campaign card
  imageUrl: z.string().url("Invalid image URL").optional().or(z.literal("")),

  // Goal amount in SOL (will be converted to lamports)
  goalSol: z
    .number()
    .min(0.1, "Goal must be at least 0.1 SOL")
    .max(100_000, "Goal cannot exceed 100,000 SOL"),

  // Deadline (ISO date string, must be in the future)
  deadline: z.string().datetime("Invalid deadline format"),
});

/**
 * Schema for updating a campaign
 */
export const updateCampaignSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title cannot exceed 100 characters")
    .optional(),

  description: z
    .string()
    .max(2000, "Description cannot exceed 2000 characters")
    .optional(),

  imageUrl: z.string().url("Invalid image URL").optional().or(z.literal("")),
});

/**
 * Schema for campaign query parameters
 */
export const campaignQuerySchema = z.object({
  status: z
    .enum(["draft", "active", "paused", "completed", "cancelled"])
    .optional(),
  wallet: z.string().min(32).max(44).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * Schema for wallet-authenticated requests
 */
export const walletAuthSchema = z.object({
  wallet: z.string().min(32).max(44),
  signature: z.string().min(1),
  message: z.string().min(1),
});

/**
 * Convert SOL to lamports
 */
export function solToLamports(sol: number): bigint {
  return BigInt(Math.floor(sol * 1_000_000_000));
}

/**
 * Convert lamports to SOL
 */
export function lamportsToSol(lamports: bigint | string): number {
  const value = typeof lamports === "string" ? BigInt(lamports) : lamports;
  return Number(value) / 1_000_000_000;
}

/**
 * Generate a URL-friendly slug from a title
 */
export function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);

  // Add random suffix for uniqueness
  const suffix = Math.random().toString(36).substring(2, 8);
  return `${base}-${suffix}`;
}

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type CampaignQueryInput = z.infer<typeof campaignQuerySchema>;
