/**
 * Campaign Validation Schemas
 * Zod schemas for validating campaign-related requests
 */

import { z } from "zod";
import { SOLANA_CONFIG } from "@/lib/solana/config";

// Minimum goal: 0.1 SOL in lamports
const MIN_GOAL_LAMPORTS = 0.1 * 1_000_000_000;
// Maximum goal: 100,000 SOL in lamports
const MAX_GOAL_LAMPORTS = 100_000 * 1_000_000_000;

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

/**
 * Calculate Levenshtein distance between two strings
 * Used for detecting similar slugs (potential impersonation)
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Check if a slug is too similar to existing active campaign slugs
 * Returns the similar slug if found, null otherwise
 *
 * @param newSlug - The proposed new slug
 * @param existingSlugs - Array of existing active campaign slugs
 * @param threshold - Minimum edit distance required (default 3)
 */
export function findSimilarSlug(
  newSlug: string,
  existingSlugs: string[],
  threshold: number = 3
): string | null {
  // Normalize the new slug (remove the random suffix for comparison)
  const newSlugBase = newSlug.replace(/-[a-z0-9]{6}$/, "");

  for (const existingSlug of existingSlugs) {
    // Also normalize the existing slug
    const existingSlugBase = existingSlug.replace(/-[a-z0-9]{6}$/, "");

    // Skip if comparing to itself
    if (newSlug === existingSlug) continue;

    // Check Levenshtein distance
    const distance = levenshteinDistance(newSlugBase, existingSlugBase);

    if (distance < threshold) {
      return existingSlug;
    }

    // Also check for common impersonation patterns
    if (isImpersonationAttempt(newSlugBase, existingSlugBase)) {
      return existingSlug;
    }
  }

  return null;
}

/**
 * Check for common impersonation patterns
 */
function isImpersonationAttempt(newSlug: string, existingSlug: string): boolean {
  // Check for homoglyph substitutions (l/1, o/0, etc.)
  const normalizeHomoglyphs = (s: string) =>
    s
      .replace(/0/g, "o")
      .replace(/1/g, "l")
      .replace(/3/g, "e")
      .replace(/4/g, "a")
      .replace(/5/g, "s")
      .replace(/7/g, "t")
      .replace(/8/g, "b");

  const normalizedNew = normalizeHomoglyphs(newSlug);
  const normalizedExisting = normalizeHomoglyphs(existingSlug);

  if (normalizedNew === normalizedExisting) {
    return true;
  }

  // Check for prefix/suffix manipulation (e.g., "real-campaign" vs "real-campaign-official")
  if (newSlug.startsWith(existingSlug) || existingSlug.startsWith(newSlug)) {
    return true;
  }

  return false;
}

/**
 * Validate a campaign title against potentially malicious content
 */
export function validateCampaignTitle(title: string): { valid: boolean; reason?: string } {
  // Check for excessive special characters that might break rendering
  const specialCharRatio = (title.match(/[^a-zA-Z0-9\s]/g) || []).length / title.length;
  if (specialCharRatio > 0.3) {
    return { valid: false, reason: "Title contains too many special characters" };
  }

  // Check for potential phishing keywords
  const phishingKeywords = ["official", "verified", "real", "authentic", "legitimate", "trust"];
  const titleLower = title.toLowerCase();
  const hasPhishingKeyword = phishingKeywords.some((kw) => titleLower.includes(kw));

  // Allow phishing keywords but flag for review (could be legitimate)
  // This is informational - the calling code can decide what to do

  return { valid: true };
}

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type CampaignQueryInput = z.infer<typeof campaignQuerySchema>;
