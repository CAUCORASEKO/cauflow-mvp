import { ArrowRight, LayoutDashboard } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { getAuthenticatedHomePath } from "@/lib/platform-nav";

export function SiteHeader() {
  const { user } = useAuth();
  const appPath = user ? getAuthenticatedHomePath(user) : "/login";

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-slate-950/50 backdrop-blur-xl">
      <div className="shell flex h-20 items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-sky-400/20 bg-sky-400/10 font-display text-lg font-bold text-sky-200">
            C
          </div>
          <div>
            <p className="font-display text-lg font-semibold tracking-tight text-white">
              CauFlow
            </p>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
              AI Licensing OS
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
          <Link to="/">Home</Link>
          <Link to="/explore">Explore</Link>
          <a href="#trust">Licensing</a>
          <a href="#how-it-works">How it works</a>
          <a href="#platform">Platform</a>
        </nav>

        <div className="flex items-center gap-3">
          {!user ? (
            <>
              <Link to="/login">
                <Button variant="ghost" className="hidden md:inline-flex">
                  Log in
                </Button>
              </Link>
              <Link to="/signup">
                <Button variant="secondary" className="hidden md:inline-flex">
                  Sign up
                </Button>
              </Link>
            </>
          ) : null}
          <Link to={appPath}>
            <Button className="gap-2">
              {user ? "Open app" : "Enter platform"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to={appPath} className="md:hidden">
            <Button variant="secondary" className="px-4">
              <LayoutDashboard className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
