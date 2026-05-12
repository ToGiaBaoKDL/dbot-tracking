"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useThemeToggle } from "@/lib/hooks";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/watchlist", label: "Watchlist" },
];

export function AppHeader() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { isDark, handleToggle, mounted } = useThemeToggle();

  const isAdmin = session?.user?.is_admin === true;

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <nav className="flex items-center gap-1 sm:gap-2">
          {NAV_ITEMS.map((item) => (
            <Button
              key={item.href}
              type="button"
              variant={isActive(item.href) ? "default" : "ghost"}
              size="sm"
              onClick={() => router.push(item.href)}
              className="text-sm font-medium"
            >
              {item.label}
            </Button>
          ))}

          {/* Stock — active when on /stock/* */}
          <Button
            type="button"
            variant={pathname.startsWith("/stock") ? "default" : "ghost"}
            size="sm"
            onClick={() => {
              if (pathname.startsWith("/stock")) return;
              const saved =
                typeof window !== "undefined" ? sessionStorage.getItem("dbot-stock-query") : null;
              router.push(saved?.trim() ? `/stock/${saved.trim()}` : "/stock");
            }}
            className="text-sm font-medium"
          >
            Stock
          </Button>

          {isAdmin && (
            <Button
              type="button"
              variant={pathname.startsWith("/admin") ? "default" : "ghost"}
              size="sm"
              onClick={() => router.push("/admin/token")}
              className="text-sm font-medium"
            >
              Admin
            </Button>
          )}
        </nav>

        <div className="flex items-center gap-2">
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
  );
}
