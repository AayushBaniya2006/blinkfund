/**
 * Audit Logs Schema
 *
 * Records security-sensitive events for compliance and investigation.
 * Includes admin impersonation, login events, and other security actions.
 */

import { pgTable, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";

/**
 * Audit action types
 */
export type AuditAction =
  | "impersonation.start"
  | "impersonation.end"
  | "login.success"
  | "login.failed"
  | "login.locked"
  | "password.changed"
  | "password.reset"
  | "account.created"
  | "account.deleted"
  | "admin.action"
  | "campaign.created"
  | "campaign.updated"
  | "campaign.deleted"
  | "wallet.verified";

/**
 * Audit logs table
 */
export const auditLogs = pgTable(
  "audit_log",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    /** The type of action that was performed */
    action: text("action").$type<AuditAction>().notNull(),

    /** User ID who performed the action (actor) */
    actorId: text("actor_id"),

    /** Email of the actor */
    actorEmail: text("actor_email"),

    /** User ID who was affected by the action (target) */
    targetId: text("target_id"),

    /** Email of the target user */
    targetEmail: text("target_email"),

    /** Resource type affected (e.g., "campaign", "user") */
    resourceType: text("resource_type"),

    /** Resource ID affected */
    resourceId: text("resource_id"),

    /** Additional context/metadata as JSON */
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    /** IP address of the request */
    ipAddress: text("ip_address"),

    /** User agent string */
    userAgent: text("user_agent"),

    /** Timestamp of the event */
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    index("audit_log_action_idx").on(table.action),
    index("audit_log_actor_id_idx").on(table.actorId),
    index("audit_log_target_id_idx").on(table.targetId),
    index("audit_log_created_at_idx").on(table.createdAt),
    index("audit_log_resource_idx").on(table.resourceType, table.resourceId),
  ]
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
