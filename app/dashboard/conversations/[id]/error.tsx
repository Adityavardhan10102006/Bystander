"use client";

import { useEffect } from "react";
import { ErrorState } from "../../../components/ui";

export default function ConversationError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Conversation detail error:", error);
  }, [error]);

  return <ErrorState error={error} retry={reset} />;
}
