"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[CLIENT] Page error:", error.message);
  }, [error]);

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h2 className="text-xl font-bold text-destructive">Đã xảy ra lỗi</h2>
        <p className="mt-2 text-muted-foreground">
          Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.
        </p>
        <Button onClick={reset} className="mt-4">
          Thử lại
        </Button>
      </div>
    </div>
  );
}
