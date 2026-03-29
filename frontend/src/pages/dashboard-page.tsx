import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, Boxes, CreditCard, RefreshCcw, ShieldCheck } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AssetUploadForm } from "@/components/dashboard/asset-upload-form";
import { AssetsGrid } from "@/components/dashboard/assets-grid";
import { LicenseForm } from "@/components/dashboard/license-form";
import { LicenseList } from "@/components/dashboard/license-list";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PurchaseForm } from "@/components/dashboard/purchase-form";
import { PurchaseList } from "@/components/dashboard/purchase-list";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fetchAssets, fetchLicenses, fetchPurchases } from "@/services/api";
import { formatCurrency } from "@/lib/utils";
import type { Asset, License, Purchase } from "@/types/api";

export function DashboardPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [nextAssets, nextLicenses, nextPurchases] = await Promise.all([
        fetchAssets(),
        fetchLicenses(),
        fetchPurchases()
      ]);
      setAssets(nextAssets);
      setLicenses(nextLicenses);
      setPurchases(nextPurchases);
      setLastSyncedAt(new Date());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const totalRevenue = purchases.reduce((sum, purchase) => {
    const matchedLicense = licenses.find((license) => license.id === purchase.licenseId);
    return sum + Number(matchedLicense?.price || 0);
  }, 0);

  return (
    <DashboardShell
      assetsCount={assets.length}
      licensesCount={licenses.length}
      purchasesCount={purchases.length}
      totalRevenue={totalRevenue}
      hasError={Boolean(error)}
    >
      <section
        id="overview"
        className="glass-panel rounded-[30px] border border-white/10 p-5 md:p-6 xl:p-7"
      >
        <div className="grid gap-4 lg:gap-5 xl:gap-6 lg:grid-cols-[minmax(0,1.2fr),minmax(320px,0.84fr)] 2xl:grid-cols-[minmax(0,1.28fr),390px]">
          <div className="max-w-3xl self-start">
            <p className="text-xs uppercase tracking-[0.28em] text-sky-200">
              Workspace overview
            </p>
            <h1 className="mt-3 font-display text-[2.45rem] font-semibold tracking-tight text-white sm:text-[2.8rem] lg:text-[2.95rem] xl:text-[3.25rem] xl:leading-[1.02]">
              Operate the full asset-to-license pipeline from one command surface.
            </h1>
            <p className="mt-3 max-w-2xl text-[15px] leading-7 text-slate-300 md:text-base xl:text-lg">
              Review inventory, package rights, and record purchase activity against
              the live CauFlow backend without leaving the workspace.
            </p>
          </div>

          <div className="grid w-full gap-3 self-start sm:grid-cols-2">
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 sm:col-span-2">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                    API status
                  </p>
                  <div className="mt-2 flex items-center gap-2.5">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${
                        error ? "bg-rose-300" : "bg-emerald-400"
                      }`}
                    />
                    <span className="text-sm font-semibold text-white">
                      {error ? "Needs attention" : "Connected to localhost:5001"}
                    </span>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => void loadDashboard()}
                  className="gap-2 px-4 py-2.5"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Refresh
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                <span>Assets</span>
                <span>Licenses</span>
                <span>Purchases</span>
                <span>
                  {lastSyncedAt
                    ? `Synced ${lastSyncedAt.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit"
                      })}`
                    : "Awaiting sync"}
                </span>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-3.5 xl:p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                Focus
              </p>
              <p className="mt-2 text-sm font-medium text-white">
                Build clean licensable inventory
              </p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-3.5 xl:p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                Flow health
              </p>
              <p className="mt-2 flex items-center gap-2 text-sm font-medium text-white">
                Live workspace
                <ArrowUpRight className="h-4 w-4 text-sky-200" />
              </p>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <Card className="border border-rose-400/20 bg-rose-400/5 p-5">
          <p className="font-semibold text-rose-200">Unable to load dashboard data</p>
          <p className="mt-2 text-sm text-rose-100/80">{error}</p>
        </Card>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-3">
        <MetricCard
          label="Assets"
          value={String(assets.length)}
          detail="Curated inventory uploaded into the platform."
          icon={Boxes}
        />
        <MetricCard
          label="Licenses"
          value={String(licenses.length)}
          detail="Monetizable rights packages attached to assets."
          icon={ShieldCheck}
        />
        <MetricCard
          label="Revenue represented"
          value={formatCurrency(totalRevenue)}
          detail="Derived from recorded purchases and linked license prices."
          icon={CreditCard}
        />
      </section>

      <section
        id="assets"
        className="grid gap-5 xl:grid-cols-[minmax(320px,0.88fr),minmax(0,1.12fr)] 2xl:grid-cols-[380px,minmax(0,1fr)]"
      >
        <div className="xl:sticky xl:top-4 2xl:top-5 xl:self-start">
          <AssetUploadForm onCreated={loadDashboard} />
        </div>
        <Card className="p-6 md:p-7">
          <SectionHeading
            eyebrow="Assets"
            title="Visual inventory"
            copy="A broader inventory surface makes previews, IDs, descriptions, and timestamps easier to scan at a glance."
          />
          <div className="mt-8">
            {loading ? (
              <p className="text-sm text-slate-400">Loading assets...</p>
            ) : assets.length > 0 ? (
              <AssetsGrid assets={assets} />
            ) : (
              <p className="text-sm text-slate-400">
                No assets yet. Upload the first asset to populate the catalog.
              </p>
            )}
          </div>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div id="licenses" className="space-y-6">
          <LicenseForm assets={assets} onCreated={loadDashboard} />
          {loading ? (
            <Card className="p-6">
              <p className="text-sm text-slate-400">Loading licenses...</p>
            </Card>
          ) : licenses.length > 0 ? (
            <LicenseList licenses={licenses} assets={assets} />
          ) : (
            <Card className="p-6">
              <p className="font-display text-2xl text-white">Licenses</p>
              <p className="mt-3 text-sm text-slate-400">
                No licenses yet. Create one from an existing asset.
              </p>
            </Card>
          )}
        </div>

        <div id="purchases" className="space-y-6">
          <PurchaseForm licenses={licenses} onCreated={loadDashboard} />
          {loading ? (
            <Card className="p-6">
              <p className="text-sm text-slate-400">Loading purchases...</p>
            </Card>
          ) : purchases.length > 0 ? (
            <PurchaseList purchases={purchases} licenses={licenses} />
          ) : (
            <Card className="p-6">
              <p className="font-display text-2xl text-white">Purchases</p>
              <p className="mt-3 text-sm text-slate-400">
                No purchases yet. Record a purchase against any created license.
              </p>
            </Card>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}
