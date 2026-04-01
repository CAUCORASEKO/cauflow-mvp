import { useEffect, useState, type PropsWithChildren } from "react";
import {
  Activity,
  Box,
  Boxes,
  Gauge,
  LifeBuoy,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { Link } from "react-router-dom";
import { formatCurrency } from "@/lib/utils";

type WorkspaceSection = "assets" | "packs" | "licenses";

interface DashboardShellProps extends PropsWithChildren {
  assetsCount: number;
  packsCount: number;
  licensesCount: number;
  totalRevenue: number;
  hasError: boolean;
  activeSection: WorkspaceSection;
}

const navItems = [
  { label: "Assets", icon: Boxes, href: "#assets" },
  { label: "Packs", icon: Box, href: "#packs" },
  { label: "Licenses", icon: ShieldCheck, href: "#licenses" }
];

const pulseMetrics = [
  { label: "Assets", valueKey: "assets" },
  { label: "Packs", valueKey: "packs" },
  { label: "Licenses", valueKey: "licenses" },
  { label: "Revenue", valueKey: "revenue" }
] as const;

export function DashboardShell({
  children,
  assetsCount,
  packsCount,
  licensesCount,
  totalRevenue,
  hasError,
  activeSection
}: DashboardShellProps) {
  const [activeHash, setActiveHash] = useState(
    () => window.location.hash || `#${activeSection}`
  );

  const activeSectionLabel = navItems.find((item) => item.href === `#${activeSection}`)?.label || "Assets";

  useEffect(() => {
    const syncHash = () => {
      setActiveHash(window.location.hash || `#${activeSection}`);
    };

    syncHash();
    window.addEventListener("hashchange", syncHash);

    return () => window.removeEventListener("hashchange", syncHash);
  }, [activeSection]);

  return (
    <div className="min-h-screen bg-mesh">
      <div className="shell py-4 md:py-5 lg:py-6">
        <div className="grid gap-4 xl:gap-5 lg:grid-cols-[222px,minmax(0,1fr)] xl:grid-cols-[232px,minmax(0,1fr)] 2xl:grid-cols-[248px,minmax(0,1fr)]">
          <aside className="glass-panel rounded-[30px] border border-white/10 p-4 xl:p-5 lg:sticky lg:top-4 xl:top-5 lg:h-[calc(100vh-2rem)] xl:h-[calc(100vh-2.5rem)] lg:overflow-y-auto">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-lg font-bold text-slate-950 shadow-[0_12px_30px_rgba(255,255,255,0.22)]">
                C
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-display text-lg font-semibold text-white">
                    CauFlow
                  </p>
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200 shadow-[0_0_0_1px_rgba(52,211,153,0.06)]">
                    Live
                  </span>
                </div>
                <p className="truncate text-xs uppercase tracking-[0.18em] text-slate-500">
                  Premium licensing workspace
                </p>
              </div>
            </Link>

            <div className="mt-5 rounded-[24px] border border-white/10 bg-black/20 p-3.5 xl:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                    Workspace pulse
                  </p>
                  <p className="mt-2 text-sm font-medium text-white">
                    {hasError ? "Data stream needs attention" : "Operations in sync"}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-sky-200">
                  <Gauge className="h-4 w-4" />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {pulseMetrics.map(({ label, valueKey }) => {
                  const value =
                    valueKey === "assets"
                      ? assetsCount
                      : valueKey === "packs"
                        ? packsCount
                        : valueKey === "licenses"
                        ? licensesCount
                        : formatCurrency(totalRevenue);

                  return (
                    <div
                      key={label}
                      className="flex min-h-[76px] flex-col justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2.5"
                    >
                      <p className="max-w-full text-[11px] font-medium leading-4 text-slate-400">
                        {label}
                      </p>
                      <p className="mt-2 truncate text-lg font-semibold leading-none text-white">
                        {value}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 rounded-[24px] border border-sky-300/14 bg-sky-300/[0.06] p-3.5 xl:p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
                Focused on
              </p>
              <p className="mt-2 font-display text-2xl text-white">{activeSectionLabel}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                You are still in the shared creator workspace, with the current focus pinned to this section.
              </p>
            </div>

            <div className="mt-4">
              <p className="mb-3 px-1 text-[11px] uppercase tracking-[0.24em] text-slate-500">
                Workspace sections
              </p>
              <nav className="space-y-1.5">
                {navItems.map(({ label, icon: Icon, href }) => (
                  <a
                    key={label}
                    href={href}
                    className={`focus-ring group flex items-center justify-between rounded-2xl border px-3 py-2.5 text-sm transition-all duration-200 ${
                      activeHash === href
                        ? "border-sky-300/18 bg-sky-300/[0.09] text-white shadow-[0_16px_32px_rgba(14,165,233,0.1)]"
                        : "border-white/5 bg-white/[0.02] text-slate-300 hover:-translate-y-px hover:border-white/10 hover:bg-white/[0.05] hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-xl text-sky-200 transition-all duration-200 ${
                          activeHash === href
                            ? "bg-sky-300/14 shadow-[0_10px_24px_rgba(14,165,233,0.12)]"
                            : "bg-white/5 group-hover:bg-sky-300/10"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      {label}
                    </span>
                    <Activity
                      className={`h-3.5 w-3.5 transition ${
                        activeHash === href
                          ? "text-sky-200"
                          : "text-slate-600 group-hover:text-slate-300"
                      }`}
                    />
                  </a>
                ))}
              </nav>
            </div>

            <div className="mt-4 grid gap-3">
              <div className="surface-highlight rounded-[24px] border border-sky-300/10 bg-sky-300/5 p-3.5 xl:p-4">
                <div className="mb-2 flex items-center gap-2 text-sky-200">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-sm font-semibold">Live backend mode</span>
                  <span className="ml-auto h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.9)]" />
                </div>
                <p className="text-sm leading-6 text-slate-300">
                  Reads and writes against the active CauFlow API without mock data.
                </p>
              </div>

              <div className="surface-highlight rounded-[24px] border border-white/8 bg-white/[0.025] p-3.5 xl:p-4">
                <div className="mb-2 flex items-center gap-2 text-white">
                  <LifeBuoy className="h-4 w-4 text-slate-300" />
                  <span className="text-sm font-semibold">Operator notes</span>
                </div>
                <p className="text-sm leading-6 text-slate-400">
                  Upload assets, assemble product packs, attach rights, then track the commercial trail.
                </p>
              </div>
            </div>
          </aside>

          <main className="space-y-4 md:space-y-5 xl:space-y-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
