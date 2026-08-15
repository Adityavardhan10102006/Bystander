import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./components/AuthProvider";

export const metadata: Metadata = {
  title: "Bystander | AI Conflict Mediation",
  description:
    "AI-powered conflict prediction & mediation for team chat platforms. Detect rising tension before it becomes conflict.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/*
         * AuthProvider wraps both NextAuth's SessionProvider and our internal
         * AuthContext so useAuth() and useSession() both work throughout the tree.
         */}
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
