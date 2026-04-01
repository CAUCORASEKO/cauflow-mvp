import { useEffect, useState, type PropsWithChildren } from "react";
import { LogOut } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AppNavItem {
  label: string;
  href: string;
}

export function AppShell({
  title,
  subtitle,
  navItems,
  children
}: PropsWithChildren<{
  title: string;
  subtitle: string;
  navItems: AppNavItem[];
}>) {
  const { user, logOut } = useAuth();
  const location = useLocation();
  const [currentHash, setCurrentHash] = useState(
    () => (typeof window === "undefined" ? "" : window.location.hash)
  );

  useEffect(() => {
    const syncHash = () => setCurrentHash(window.location.hash);
    syncHash();
    window.addEventListener("hashchange", syncHash);

    return () => window.removeEventListener("hashchange", syncHash);
  }, [location.pathname]);

  const isNavItemActive = (href: string) => {
    const [pathname, rawHash] = href.split("#");
    const hash = rawHash ? `#${rawHash}` : "";

    if (hash) {
      return (
        location.pathname === pathname &&
        (currentHash === hash || (currentHash === "" && hash === "#assets"))
      );
    }

    return location.pathname === pathname;
  };

  return (
    <div className="min-h-screen bg-mesh">
      <header className="border-b border-white/5 bg-slate-950/60 backdrop-blur-xl">
        <div className="shell flex min-h-[84px] flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-400/20 bg-sky-400/10 font-display text-lg font-bold text-sky-200">
                C
              </div>
            </Link>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-300/75">{subtitle}</p>
              <h1 className="mt-1 font-display text-2xl text-white">{title}</h1>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:items-end">
            <div className="text-sm text-slate-300">
              {user?.publicDisplayName || user?.email}
              <span className="ml-2 rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-slate-300/80">
                {user?.role}
              </span>
            </div>
            <Button variant="ghost" className="gap-2" onClick={() => void logOut()}>
              <LogOut className="h-4 w-4" />
              Log out
            </Button>
          </div>
        </div>
      </header>

      <div className="shell grid gap-5 py-6 lg:grid-cols-[240px,minmax(0,1fr)]">
        <aside className="glass-panel rounded-[28px] border border-white/10 p-4">
          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                aria-current={isNavItemActive(item.href) ? "page" : undefined}
                className={cn(
                  "block rounded-2xl border px-4 py-3 text-sm transition",
                  isNavItemActive(item.href)
                    ? "border-sky-300/20 bg-sky-300/[0.1] text-white"
                    : "border-white/5 bg-white/[0.02] text-slate-300 hover:border-white/10 hover:bg-white/[0.05] hover:text-white"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="space-y-5">{children}</main>
      </div>
    </div>
  );
}
