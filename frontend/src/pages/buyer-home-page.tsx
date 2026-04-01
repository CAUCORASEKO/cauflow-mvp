import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { buyerNav } from "@/lib/platform-nav";
import { fetchRoleDashboard } from "@/services/api";
import type { RoleDashboard } from "@/types/api";

export function BuyerHomePage() {
  const [dashboard, setDashboard] = useState<RoleDashboard | null>(null);

  useEffect(() => {
    void fetchRoleDashboard().then(setDashboard);
  }, []);

  return (
    <AppShell title="Buyer dashboard" subtitle="Buyer / licensee" navItems={buyerNav}>
      <div className="grid gap-4 md:grid-cols-4">
        {Object.entries(dashboard?.metrics || {}).map(([label, value]) => (
          <Card key={label} className="p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
            <p className="mt-3 text-3xl text-white">{value}</p>
          </Card>
        ))}
      </div>
      <Card className="p-6">
        <p className="text-sm leading-6 text-slate-300">
          Browse published packs, initiate checkout, and manage active rights and downloads from one buyer-facing workspace.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/app/explore"><Button>Browse assets and packs</Button></Link>
          <Link to="/app/buyer/purchases"><Button variant="secondary">View purchases</Button></Link>
        </div>
      </Card>
    </AppShell>
  );
}
