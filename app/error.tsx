"use client";

import { ErrorContent } from "@/components/public-documents";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorContent resetAction={reset} />;
}
