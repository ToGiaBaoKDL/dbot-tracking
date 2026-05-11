"use client";

import { useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SignalsDashboard } from "@/features/signals/signals-dashboard";
import { Shield, Moon, Sun, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useThemeToggle } from "@/lib/hooks";

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { isDark, handleToggle, mounted } = useThemeToggle();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading" || status === "unauthenticated" || !session?.accessToken) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-lg text-muted-foreground">Đang tải...</div>
      </div>
    );
  }

  const isAdmin = session.user?.is_admin === true;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-3 sm:px-10 sm:py-4">
          <h1 className="text-lg font-bold text-card-foreground sm:text-xl">
            DBOT Signals Tracker
          </h1>
          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => router.push("/watchlist")}
              aria-label="Danh sách theo dõi"
            >
              <Star className="h-4 w-4" />
            </Button>
            {isAdmin && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => router.push("/admin/token")}
                aria-label="Trang quản trị"
              >
                <Shield className="h-4 w-4" />
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleToggle}
              aria-label="Toggle theme"
            >
              {mounted ? (
                isDark ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )
              ) : (
                <span className="h-4 w-4" />
              )}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={async () => {
                await signOut({ callbackUrl: "/login" }).catch(() => {});
              }}
            >
              <span className="hidden sm:inline">Đăng xuất</span>
              <span className="sm:hidden">Exit</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 sm:p-6">
        <SignalsDashboard />
      </main>
    </div>
  );
}
