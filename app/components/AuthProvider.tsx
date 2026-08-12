"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  teamId: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Mock user login for now. 
    // In a real app, this would check session/cookie.
    setTimeout(() => {
      setUser({
        id: "usr_123",
        name: "Demo Admin",
        email: "admin@bystander.ai",
        teamId: "team_demo", // Assuming a demo team exists or will be created/queried
      });
      setIsLoading(false);
    }, 500);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
