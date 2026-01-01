/**
 * Audit Logging Utility
 *
 * Provides functions to log security-sensitive events to the database.
 * Use this for any action that should be tracked for compliance or investigation.
 */

import { db } from "@/db";
import {
  auditLogs,
  type AuditAction,
  type NewAuditLog,
} from "@/db/schema/audit-logs";
import { log } from "@/lib/logging";
import { getClientIp } from "@/lib/ratelimit";

/**
 * Log an audit event to the database
 *
 * @param event - The audit event details
 * @returns The created audit log record
 */
export async function logAuditEvent(
  event: Omit<NewAuditLog, "id" | "createdAt">
): Promise<void> {
  try {
    await db.insert(auditLogs).values(event);

    // Also log to application logs for immediate visibility
    log("info", `Audit: ${event.action}`, {
      actorEmail: event.actorEmail?.slice(0, 3) + "***",
      targetEmail: event.targetEmail?.slice(0, 3) + "***",
      resourceType: event.resourceType ?? undefined,
      resourceId: event.resourceId ?? undefined,
    });
  } catch (error) {
    // Don't fail the operation if audit logging fails
    // but do log the error
    log("error", "Failed to write audit log", {
      action: event.action,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Log an impersonation start event
 */
export async function logImpersonationStart(params: {
  adminId: string;
  adminEmail: string;
  targetId: string;
  targetEmail: string;
  request?: Request;
}): Promise<void> {
  await logAuditEvent({
    action: "impersonation.start",
    actorId: params.adminId,
    actorEmail: params.adminEmail,
    targetId: params.targetId,
    targetEmail: params.targetEmail,
    ipAddress: params.request ? getClientIp(params.request) : undefined,
    userAgent: params.request?.headers.get("user-agent") || undefined,
    metadata: {
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log an impersonation end event
 */
export async function logImpersonationEnd(params: {
  adminId: string;
  adminEmail: string;
  targetId: string;
  targetEmail: string;
  request?: Request;
}): Promise<void> {
  await logAuditEvent({
    action: "impersonation.end",
    actorId: params.adminId,
    actorEmail: params.adminEmail,
    targetId: params.targetId,
    targetEmail: params.targetEmail,
    ipAddress: params.request ? getClientIp(params.request) : undefined,
    userAgent: params.request?.headers.get("user-agent") || undefined,
  });
}

/**
 * Log a login event
 */
export async function logLoginEvent(params: {
  action: "login.success" | "login.failed" | "login.locked";
  email: string;
  userId?: string;
  request?: Request;
  reason?: string;
}): Promise<void> {
  await logAuditEvent({
    action: params.action,
    actorId: params.userId,
    actorEmail: params.email,
    ipAddress: params.request ? getClientIp(params.request) : undefined,
    userAgent: params.request?.headers.get("user-agent") || undefined,
    metadata: params.reason ? { reason: params.reason } : undefined,
  });
}

/**
 * Log an admin action
 */
export async function logAdminAction(params: {
  adminId: string;
  adminEmail: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  request?: Request;
}): Promise<void> {
  await logAuditEvent({
    action: "admin.action",
    actorId: params.adminId,
    actorEmail: params.adminEmail,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    ipAddress: params.request ? getClientIp(params.request) : undefined,
    userAgent: params.request?.headers.get("user-agent") || undefined,
    metadata: {
      adminAction: params.action,
      ...params.details,
    },
  });
}

/**
 * Log a resource change (create/update/delete)
 */
export async function logResourceChange(params: {
  action: AuditAction;
  actorId: string;
  actorEmail: string;
  resourceType: string;
  resourceId: string;
  changes?: Record<string, unknown>;
  request?: Request;
}): Promise<void> {
  await logAuditEvent({
    action: params.action,
    actorId: params.actorId,
    actorEmail: params.actorEmail,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    ipAddress: params.request ? getClientIp(params.request) : undefined,
    userAgent: params.request?.headers.get("user-agent") || undefined,
    metadata: params.changes,
  });
}

/**
 * Query audit logs for a specific user
 */
export async function getAuditLogsForUser(
  userId: string,
  limit: number = 100
): Promise<typeof auditLogs.$inferSelect[]> {
  const { eq, or, desc } = await import("drizzle-orm");

  return db
    .select()
    .from(auditLogs)
    .where(or(eq(auditLogs.actorId, userId), eq(auditLogs.targetId, userId)))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}

/**
 * Query audit logs by action type
 */
export async function getAuditLogsByAction(
  action: AuditAction,
  limit: number = 100
): Promise<typeof auditLogs.$inferSelect[]> {
  const { eq, desc } = await import("drizzle-orm");

  return db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.action, action))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}
