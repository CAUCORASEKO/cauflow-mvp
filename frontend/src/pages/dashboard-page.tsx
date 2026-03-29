import { useCallback, useEffect, useState } from "react";
import { Boxes, CreditCard, ShieldCheck } from "lucide-react";
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
    <DashboardShell>
      <section className="glass-panel rounded-[32px] border border-white/10 p-8">
        <div className="grid gap-8 lg:grid-cols-[1.2fr,0.8fr]">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-sky-200">
              Workspace
            </p>
            <h1 className="mt-4 font-display text-5xl font-semibold tracking-tight text-white">
              Run your AI licensing flow from one premium command surface.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
              Upload assets, define licensing packages, and record purchases against
              the live CauFlow backend.
            </p>
          </div>

          <Card className="p-6">
            <p className="text-sm uppercase tracking-[0.22em] text-slate-500">
              API status
            </p>
            <div className="mt-4 flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-emerald-400" />
              <span className="font-semibold text-white">
                {error ? "Needs attention" : "Connected to localhost:5001"}
              </span>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-400">
              The dashboard consumes the same asset, license, and purchase endpoints
              used by the backend MVP.
            </p>
            <div className="mt-6">
              <Button variant="secondary" onClick={() => void loadDashboard()}>
                Refresh data
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {error ? (
        <Card className="border border-rose-400/20 bg-rose-400/5 p-5">
          <p className="font-semibold text-rose-200">Unable to load dashboard data</p>
          <p className="mt-2 text-sm text-rose-100/80">{error}</p>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
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

      <section className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
        <AssetUploadForm onCreated={loadDashboard} />
        <Card className="p-6">
          <SectionHeading
            eyebrow="Assets"
            title="Visual inventory"
            copy="Every uploaded asset appears here with a live preview sourced from the backend static file server."
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

      <section className="grid gap-6 xl:grid-cols-2">
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
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
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
      </section>
    </DashboardShell>
  );
}
