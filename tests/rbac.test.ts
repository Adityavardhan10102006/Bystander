// tests/rbac.test.ts — Unit tests for tenant-aware RBAC logic
// Run: npx vitest run tests/rbac.test.ts

import { describe, it, expect } from "vitest";
import { type TeamRole, RbacError } from "../lib/auth/rbac";

describe("Tenant-aware RBAC Policy Evaluation", () => {
  const DASHBOARD_ROLES: TeamRole[] = ["ADMIN", "MODERATOR"];

  interface RoleMapping {
    userId: string;
    discordGuildId: string;
    role: TeamRole;
  }

  interface TeamRecord {
    id: string;
    discordGuildId: string | null;
  }

  function evaluateTeamAccess(
    userId: string,
    team: TeamRecord | null,
    userRoles: RoleMapping[]
  ): boolean {
    if (!team || !team.discordGuildId) {
      return false;
    }

    const matchedRole = userRoles.find(
      (r) => r.userId === userId && r.discordGuildId === team.discordGuildId
    );

    if (!matchedRole) {
      return false;
    }

    return DASHBOARD_ROLES.includes(matchedRole.role);
  }

  it("grants access to ADMIN in the matching guild", () => {
    const team: TeamRecord = { id: "team-1", discordGuildId: "guild-alpha" };
    const roles: RoleMapping[] = [
      { userId: "user-1", discordGuildId: "guild-alpha", role: "ADMIN" },
    ];
    expect(evaluateTeamAccess("user-1", team, roles)).toBe(true);
  });

  it("grants access to MODERATOR in the matching guild", () => {
    const team: TeamRecord = { id: "team-1", discordGuildId: "guild-alpha" };
    const roles: RoleMapping[] = [
      { userId: "user-2", discordGuildId: "guild-alpha", role: "MODERATOR" },
    ];
    expect(evaluateTeamAccess("user-2", team, roles)).toBe(true);
  });

  it("denies access to MEMBER in the matching guild", () => {
    const team: TeamRecord = { id: "team-1", discordGuildId: "guild-alpha" };
    const roles: RoleMapping[] = [
      { userId: "user-3", discordGuildId: "guild-alpha", role: "MEMBER" },
    ];
    expect(evaluateTeamAccess("user-3", team, roles)).toBe(false);
  });

  it("denies access when user is ADMIN in Guild Beta but accessing Guild Alpha (tenant isolation)", () => {
    const team: TeamRecord = { id: "team-1", discordGuildId: "guild-alpha" };
    const roles: RoleMapping[] = [
      { userId: "user-1", discordGuildId: "guild-beta", role: "ADMIN" },
    ];
    // Cross-tenant access must be denied
    expect(evaluateTeamAccess("user-1", team, roles)).toBe(false);
  });

  it("denies access when team has no associated discordGuildId (fail closed)", () => {
    const team: TeamRecord = { id: "team-2", discordGuildId: null };
    const roles: RoleMapping[] = [
      { userId: "user-1", discordGuildId: "guild-alpha", role: "ADMIN" },
    ];
    expect(evaluateTeamAccess("user-1", team, roles)).toBe(false);
  });

  it("denies access when team is not found", () => {
    const roles: RoleMapping[] = [
      { userId: "user-1", discordGuildId: "guild-alpha", role: "ADMIN" },
    ];
    expect(evaluateTeamAccess("user-1", null, roles)).toBe(false);
  });
});

describe("RbacError Class", () => {
  it("instantiates with message and 403 status code by default", () => {
    const err = new RbacError("Forbidden");
    expect(err.message).toBe("Forbidden");
    expect(err.statusCode).toBe(403);
    expect(err.name).toBe("RbacError");
  });
});
