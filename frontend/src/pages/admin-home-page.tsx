import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { adminNav } from "@/lib/platform-nav";
import { fetchRoleDashboard } from "@/services/api";
import type { RoleDashboard } from "@/types/api";

export function AdminHomePage() {
  const [dashboard, setDashboard] = useState<RoleDashboard | null>(null);

  useEffect(() => {
    void fetchRoleDashboard().then(setDashboard);
  }, []);

  return (
    <AppShell title="Admin operations" subtitle="Platform admin" navItems={adminNav}>
      <div className="grid gap-4 md:grid-cols-4">
        {Object.entries(dashboard?.metrics || {}).map(([label, value]) => (
          <Card key={label} className="p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
            <p className="mt-3 text-3xl text-white">{value}</p>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {dashboard?.recentPayments?.map((payment) => (
          <Card key={payment.id} className="p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{payment.status}</p>
            <p className="mt-2 text-lg text-white">Session {payment.providerSessionId}</p>
            <p className="mt-2 text-sm text-slate-300">
              {payment.amount} {payment.currency}
            </p>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
