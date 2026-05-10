"use client";

import { useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SignalsDashboard } from "@/features/signals/signals-dashboard";
import { Shield, Moon, Sun } from "lucide-react";
import { useThemeToggle } from "@/lib/hooks";

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { isDark, handleToggle } = useThemeToggle();

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
            {isAdmin && (
              <Link
                href="/admin/token"
                className="flex items-center gap-1.5 rounded-md bg-accent px-2 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent/80 sm:px-3 sm:text-sm"
              >
                <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            )}
            <button
              type="button"
              onClick={handleToggle}
              className="cursor-pointer rounded-md p-2 text-muted-foreground hover:bg-muted"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={async () => {
                await signOut({ callbackUrl: "/login" }).catch(() => {});
              }}
              className="cursor-pointer rounded-md bg-muted px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/80 sm:px-3 sm:text-sm"
            >
              <span className="hidden sm:inline">Đăng xuất</span>
              <span className="sm:hidden">Exit</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 sm:p-6">
        <SignalsDashboard />
      </main>
    </div>
  );
}
