/**
 * lib/auth/rbac.ts — Tenant-aware RBAC helpers.
 *
 * ALL access checks must go through these helpers.
 *
 * Key invariant: a user's role in Guild A NEVER grants access to Guild B.
 * Every check is tied to a specific team → guild mapping.
 *
 * Data model for access:
 *   User
 *     → UserServerRole (userId, discordGuildId, role)
 *         → Team (discordGuildId)
 *             → ConversationThread / Message / etc.
 */

import { prisma } from "@/lib/db/client";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "auth/rbac" });

export type TeamRole = "ADMIN" | "MODERATOR" | "MEMBER";

/** Roles that can access the moderator dashboard. */
const DASHBOARD_ROLES: TeamRole[] = ["ADMIN", "MODERATOR"];

// ---------------------------------------------------------------------------
// Core access check
// ---------------------------------------------------------------------------

/**
 * Returns true if the given user holds ADMIN or MODERATOR role for the
 * specific team (identified by teamId).
 *
 * The check is performed by:
 *   1. Look up the Team to find its discordGuildId.
 *   2. Check UserServerRole for (userId, discordGuildId, role IN [ADMIN, MODERATOR]).
 *
 * A role in a DIFFERENT guild does NOT grant access here.
 * No bootstrap bypass — if the team has no guild mapping, access is denied.
 */
export async function hasTeamAccess(
  userId: string,
  teamId: string
): Promise<boolean> {
  try {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true, discordGuildId: true },
    });

    if (!team) {
      log.warn({ userId, teamId }, "RBAC: team not found");
      return false;
    }

    // If the team has no guild mapping, we cannot verify membership.
    // This is a configuration issue, not a reason to grant access.
    if (!team.discordGuildId) {
      log.warn({ userId, teamId }, "RBAC: team has no discordGuildId — denying access");
      return false;
    }

    const role = await prisma.userServerRole.findUnique({
      where: {
        userId_discordGuildId: {
          userId,
          discordGuildId: team.discordGuildId,
        },
      },
      select: { role: true },
    });

    if (!role) {
      log.debug({ userId, teamId, guildId: team.discordGuildId }, "RBAC: no role found");
      return false;
    }

    const allowed = DASHBOARD_ROLES.includes(role.role as TeamRole);
    if (!allowed) {
      log.debug({ userId, teamId, role: role.role }, "RBAC: role insufficient");
    }
    return allowed;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log.error({ err: message, userId, teamId }, "RBAC check failed");
    return false;
  }
}

/**
 * Throws a structured error if the user does not have access.
 * Returns void on success for clean call-site code.
 */
export async function assertTeamAccess(
  userId: string,
  teamId: string
): Promise<void> {
  const allowed = await hasTeamAccess(userId, teamId);
  if (!allowed) {
    log.warn({ userId, teamId }, "RBAC denied: insufficient role for team");
    throw new RbacError(`Forbidden — insufficient role for team ${teamId}`, 403);
  }
}

// ---------------------------------------------------------------------------
// Team discovery
// ---------------------------------------------------------------------------

/**
 * Returns all teams the user can access (ADMIN or MODERATOR role).
 * Each team is identified by its discordGuildId in UserServerRole,
 * then joined to the Team record.
 */
export async function getUserTeams(userId: string) {
  // Find all guilds where the user has ADMIN or MODERATOR role
  const userRoles = await prisma.userServerRole.findMany({
    where: {
      userId,
      role: { in: ["ADMIN", "MODERATOR"] },
    },
    select: { discordGuildId: true, role: true },
  });

  if (userRoles.length === 0) return [];

  const guildIds = userRoles.map((r) => r.discordGuildId);

  // Find teams associated with those guilds
  const teams = await prisma.team.findMany({
    where: {
      discordGuildId: { in: guildIds },
    },
    select: {
      id: true,
      name: true,
      platform: true,
      discordGuildId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return teams;
}

// ---------------------------------------------------------------------------
// Custom error class
// ---------------------------------------------------------------------------

export class RbacError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 403
  ) {
    super(message);
    this.name = "RbacError";
  }
}
