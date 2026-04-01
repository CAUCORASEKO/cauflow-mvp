import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Box, Boxes, CreditCard, Settings2, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/app-shell";
import { WorkflowRail } from "@/components/dashboard/workflow-rail";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { creatorNav } from "@/lib/platform-nav";
import { fetchRoleDashboard } from "@/services/api";
import { humanizeLabel } from "@/lib/utils";
import type { RoleDashboard } from "@/types/api";

const summaryMeta = [
  {
    key: "assetsCount",
    label: "Assets",
    detail: "Source inventory now available in the workspace.",
    icon: Boxes
  },
  {
    key: "packsCount",
    label: "Packs",
    detail: "Commercial bundles assembled from your asset catalog.",
    icon: Box
  },
  {
    key: "activeLicenses",
    label: "Active licenses",
    detail: "Rights packages currently available for buyers.",
    icon: ShieldCheck
  },
  {
    key: "totalSales",
    label: "Total sales",
    detail: "Paid transactions recorded against your licensing catalog.",
    icon: CreditCard
  }
] as const;

const workspaceLinks = [
  {
    label: "Assets",
    href: "/app/creator/workspace#assets",
    copy: "Upload, search, and curate the asset inventory."
  },
  {
    label: "Packs",
    href: "/app/creator/workspace#packs",
    copy: "Bundle assets into premium licensable products."
  },
  {
    label: "Licenses",
    href: "/app/creator/workspace#licenses",
    copy: "Attach commercial rights and pricing to the catalog."
  }
] as const;

const formatPayoutStatus = (value: string | undefined) =>
  value ? humanizeLabel(value) : "Not started";

export function CreatorHomePage() {
  const [dashboard, setDashboard] = useState<RoleDashboard | null>(null);

  useEffect(() => {
    void fetchRoleDashboard().then(setDashboard);
  }, []);

  const activeStep = useMemo(() => {
    const metrics = dashboard?.metrics || {};

    return (metrics.totalSales || 0) > 0
      ? 3
      : (metrics.activeLicenses || 0) > 0
        ? 2
        : (metrics.packsCount || 0) > 0
          ? 1
          : 0;
  }, [dashboard]);

  return (
    <AppShell
      title="Overview"
      subtitle="Creator command summary"
      navItems={creatorNav}
    >
      <section className="glass-panel rounded-[30px] border border-white/10 p-6 md:p-7">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr),360px]">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.28em] text-sky-200">Creator overview</p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-white md:text-5xl">
              The executive summary for your licensing operation.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300">
              Use this surface to understand inventory readiness, pack coverage, active rights,
              payout readiness, and where to jump next inside the creator workspace.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/app/creator/workspace#assets">
                <Button className="gap-2">
                  Open workspace
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/app/creator/sales">
                <Button variant="secondary">Review sales</Button>
              </Link>
              <Link to="/app/settings">
                <Button variant="ghost" className="gap-2">
                  <Settings2 className="h-4 w-4" />
                  Open settings
                </Button>
              </Link>
            </div>
          </div>

          <Card className="surface-highlight p-5">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
              Payout onboarding
            </p>
            <p className="mt-3 font-display text-3xl text-white">
              {formatPayoutStatus(dashboard?.payoutStatus)}
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Monetized listings feel fully ready once your business profile, currency, country,
              and payout onboarding are all in place.
            </p>
            <div className="mt-5 rounded-[22px] border border-white/10 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                Quick read
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                Overview is your business snapshot. Assets, Packs, and Licenses stay together in
                the shared workspace. Sales and Settings remain dedicated views.
              </p>
            </div>
          </Card>
        </div>

        <div className="mt-7">
          <WorkflowRail activeStep={activeStep} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryMeta.map(({ key, label, detail, icon: Icon }) => (
          <Card key={key} className="surface-highlight p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</p>
                <p className="mt-3 font-display text-3xl font-semibold text-white">
                  {String(dashboard?.metrics?.[key] || 0)}
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04] text-sky-200">
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-400">{detail}</p>
          </Card>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr),minmax(320px,0.85fr)]">
        <Card className="surface-highlight p-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
            Workspace sections
          </p>
          <h2 className="mt-3 font-display text-3xl text-white">
            Jump into the command center with a clear section focus.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
            Assets, Packs, and Licenses all live inside the same operational workspace. Each link
            below opens that shared surface at the relevant section, so the pipeline still feels
            like one connected system.
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {workspaceLinks.map((item) => (
              <Link key={item.label} to={item.href}>
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 transition hover:-translate-y-0.5 hover:border-white/14 hover:bg-white/[0.04]">
                  <p className="text-sm font-semibold text-white">{item.label}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{item.copy}</p>
                  <div className="mt-4 inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-sky-200">
                    Open section
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="surface-highlight p-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Quick actions</p>
          <div className="mt-4 space-y-3">
            {(dashboard?.quickActions || []).map((action) => (
              <div
                key={action}
                className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-3"
              >
                <p className="text-sm font-medium text-white">{humanizeLabel(action)}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm leading-7 text-slate-400">
            Use Overview for strategic context, then move into the workspace when you need to
            operate the catalog or rights pipeline directly.
          </p>
        </Card>
      </section>
    </AppShell>
  );
}
