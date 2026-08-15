/**
 * notify.ts — DM delivery helper.
 *
 * Kept separate from the message-listening logic so it can be imported
 * independently and is easy to unit-test in isolation (just mock the Client).
 *
 * Usage:
 *   import { sendDM } from "./notify";
 *   await sendDM(client, "123456789", "Hey, things are getting heated...");
 */

import { Client, User } from "discord.js";

export interface DMResult {
  ok: boolean;
  /** Populated when ok is false */
  error?: string;
}

/**
 * Sends a private DM to a Discord user by their platform user ID.
 *
 * @param client  - An already-logged-in discord.js Client instance.
 * @param userId  - The Discord user snowflake (platformUserId from NormalizedMessage).
 * @param message - The plain-text message to send.
 * @returns       DMResult indicating success or failure.
 */
export async function sendDM(
  client: Client,
  userId: string,
  message: string
): Promise<DMResult> {
  try {
    let user: User;

    // Prefer the cache to avoid an extra API call; fall back to a fetch.
    const cached = client.users.cache.get(userId);
    if (cached) {
      user = cached;
    } else {
      user = await client.users.fetch(userId);
    }

    await user.send(message);
    console.log(`[notify] DM sent to user ${userId}`);
    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[notify] Failed to send DM to user ${userId}: ${msg}`);
    return { ok: false, error: msg };
  }
}
