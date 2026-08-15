/**
 * lib/auth/config.ts — NextAuth v4 configuration.
 *
 * Exports `authOptions` used by both the [...nextauth] route handler and
 * server-side helpers (getServerSession, middleware token validation).
 *
 * Providers: GitHub OAuth, Google OAuth.
 * Adapter: @next-auth/prisma-adapter (persists sessions/accounts to Postgres).
 * Strategy: database sessions (JWT not used — the Prisma adapter uses DB sessions).
 *
 * Required env vars (all validated by lib/env.ts at startup):
 *   GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
 *   GOOGLE_CLIENT_ID,  GOOGLE_CLIENT_SECRET
 *   NEXTAUTH_SECRET
 */

import { type NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/db/client";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "auth" });

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          // Request offline access so we get a refresh token.
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],

  // Use JWT for sessions (compatible with Edge middleware token checks).
  // The Prisma adapter stores accounts/users; we use JWT for the session
  // token itself so middleware can verify it without a DB call.
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    /**
     * Attach the database User.id to the JWT token so downstream code
     * can do RBAC queries without a round-trip to look up the user by email.
     */
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
      }
      return token;
    },

    /**
     * Expose uid on the client-side session object.
     */
    async session({ session, token }) {
      if (token.uid && session.user) {
        (session.user as typeof session.user & { id: string }).id =
          token.uid as string;
      }
      return session;
    },
  },

  events: {
    async signIn({ user }) {
      log.info({ userId: user.id }, "User signed in");
    },
    async signOut({ token }) {
      log.info({ uid: token?.uid }, "User signed out");
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
};
