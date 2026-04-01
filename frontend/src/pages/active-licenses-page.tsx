import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { buyerNav } from "@/lib/platform-nav";
import { fetchEntitlements } from "@/services/api";
import type { LicenseGrant } from "@/types/api";

export function ActiveLicensesPage() {
  const [grants, setGrants] = useState<LicenseGrant[]>([]);

  useEffect(() => {
    void fetchEntitlements().then(setGrants);
  }, []);

  return (
    <AppShell title="Active licenses" subtitle="Buyer rights" navItems={buyerNav}>
      <div className="grid gap-4">
        {grants.map((grant) => (
          <Card key={grant.id} className="p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{grant.status}</p>
            <p className="mt-2 text-lg text-white">Granted license #{grant.licenseId}</p>
            <p className="mt-2 text-sm text-slate-300">
              Download access: {grant.downloadAccess ? "enabled" : "disabled"}
            </p>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
