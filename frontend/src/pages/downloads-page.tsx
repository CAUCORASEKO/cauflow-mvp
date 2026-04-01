import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { buyerNav } from "@/lib/platform-nav";
import { fetchEntitlements } from "@/services/api";
import type { LicenseGrant } from "@/types/api";

export function DownloadsPage() {
  const [grants, setGrants] = useState<LicenseGrant[]>([]);

  useEffect(() => {
    void fetchEntitlements().then(setGrants);
  }, []);

  return (
    <AppShell title="Downloads" subtitle="Buyer entitlements" navItems={buyerNav}>
      <div className="grid gap-4">
        {grants
          .filter((grant) => grant.downloadAccess)
          .map((grant) => (
            <Card key={grant.id} className="p-5">
              <p className="text-lg text-white">Download ready for license #{grant.licenseId}</p>
              <p className="mt-2 text-sm text-slate-300">Purchase #{grant.purchaseId}</p>
            </Card>
          ))}
      </div>
    </AppShell>
  );
}
