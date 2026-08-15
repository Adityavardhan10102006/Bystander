/**
 * app/api/auth/[...nextauth]/route.ts
 *
 * NextAuth v4 catch-all route handler.
 * Handles: /api/auth/signin, /api/auth/callback/*, /api/auth/signout, etc.
 */

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth/config";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
