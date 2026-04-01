import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { buyerNav } from "@/lib/platform-nav";
import { fetchPurchases } from "@/services/api";
import type { Purchase } from "@/types/api";

export function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  useEffect(() => {
    void fetchPurchases().then(setPurchases);
  }, []);

  return (
    <AppShell title="Purchases" subtitle="Buyer history" navItems={buyerNav}>
      <div className="grid gap-4">
        {purchases.map((purchase) => (
          <Card key={purchase.id} className="p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{purchase.paymentStatus || purchase.status}</p>
            <p className="mt-2 text-lg text-white">Purchase #{purchase.id}</p>
            <p className="mt-2 text-sm text-slate-300">License #{purchase.licenseId}</p>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
