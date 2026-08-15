"use client";

import React from "react";
import { SessionProvider, useSession } from "next-auth/react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface User {
  id: string;
  name: string;
  email: string;
  /** teamId is derived from the session — may not be present for new users. */
  teamId?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
}

const AuthContext = React.createContext<AuthContextType>({
  user: null,
  isLoading: true,
});

// ---------------------------------------------------------------------------
// Inner hook — wraps next-auth useSession into our internal User shape
// ---------------------------------------------------------------------------

function AuthStateProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  const isLoading = status === "loading";

  const user: User | null =
    session?.user
      ? {
          id: (session.user as typeof session.user & { id?: string }).id ?? "",
          name: session.user.name ?? "",
          email: session.user.email ?? "",
          // teamId is not stored on the JWT by default — components that need
          // it should fetch from /api/analytics/dashboard which applies RBAC.
          teamId: undefined,
        }
      : null;

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Public exports
// ---------------------------------------------------------------------------

/**
 * AuthProvider wraps the tree with NextAuth's SessionProvider so useSession()
 * works anywhere. AuthStateProvider maps the session into our internal User shape.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthStateProvider>{children}</AuthStateProvider>
    </SessionProvider>
  );
}

export function useAuth() {
  return React.useContext(AuthContext);
}
