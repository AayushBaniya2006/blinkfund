import { z } from "zod";

/**
 * Common password list to reject
 * These are among the most common passwords and should never be allowed
 */
const COMMON_PASSWORDS = [
  "password123",
  "123456789",
  "qwerty123",
  "admin123",
  "letmein123",
  "welcome123",
  "monkey123",
  "dragon123",
  "master123",
  "password1",
];

/**
 * Strong password schema with security requirements:
 * - Minimum 12 characters
 * - Maximum 128 characters (prevent DoS)
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 * - Not a common password
 */
export const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(128, "Password must be at most 128 characters")
  .refine((password) => /[A-Z]/.test(password), {
    message: "Password must contain at least one uppercase letter",
  })
  .refine((password) => /[a-z]/.test(password), {
    message: "Password must contain at least one lowercase letter",
  })
  .refine((password) => /[0-9]/.test(password), {
    message: "Password must contain at least one number",
  })
  .refine((password) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password), {
    message: "Password must contain at least one special character (!@#$%^&*...)",
  })
  .refine((password) => !COMMON_PASSWORDS.includes(password.toLowerCase()), {
    message: "This password is too common. Please choose a stronger password.",
  });

/**
 * Password requirements for display in UI
 */
export const PASSWORD_REQUIREMENTS = [
  "At least 12 characters",
  "At least one uppercase letter (A-Z)",
  "At least one lowercase letter (a-z)",
  "At least one number (0-9)",
  "At least one special character (!@#$%^&*...)",
];

export const signUpRequestSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
});

export const setPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const resetPasswordRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordConfirmSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type SignUpRequestInput = z.infer<typeof signUpRequestSchema>;
export type SetPasswordInput = z.infer<typeof setPasswordSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ResetPasswordRequestInput = z.infer<
  typeof resetPasswordRequestSchema
>;
export type ResetPasswordConfirmInput = z.infer<
  typeof resetPasswordConfirmSchema
>;

