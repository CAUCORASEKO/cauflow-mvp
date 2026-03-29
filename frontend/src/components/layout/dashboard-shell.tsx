import type { PropsWithChildren } from "react";
import {
  Boxes,
  CreditCard,
  LayoutDashboard,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { Link } from "react-router-dom";

const navItems = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Assets", icon: Boxes },
  { label: "Licenses", icon: ShieldCheck },
  { label: "Purchases", icon: CreditCard }
];

export function DashboardShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-mesh">
      <div className="shell py-8">
        <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
          <aside className="glass-panel rounded-[32px] border border-white/10 p-6">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-lg font-bold text-slate-950">
                C
              </div>
              <div>
                <p className="font-display text-xl font-semibold text-white">
                  CauFlow
                </p>
                <p className="text-sm text-slate-400">Premium licensing workspace</p>
              </div>
            </Link>

            <div className="mt-8 space-y-2">
              {navItems.map(({ label, icon: Icon }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3 text-sm text-slate-300"
                >
                  <Icon className="h-4 w-4 text-sky-300" />
                  {label}
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-3xl border border-sky-300/10 bg-sky-300/5 p-5">
              <div className="mb-3 flex items-center gap-2 text-sky-200">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm font-semibold">Live backend mode</span>
              </div>
              <p className="text-sm leading-6 text-slate-300">
                This dashboard reads and writes directly against the CauFlow API on
                localhost.
              </p>
            </div>
          </aside>

          <main className="space-y-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
