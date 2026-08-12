import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bystander | AI Conflict Mediation",
  description:
    "AI-powered conflict prediction & mediation for team chat platforms. Detect rising tension before it becomes conflict.",
};

import { AuthProvider } from "./components/AuthProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
