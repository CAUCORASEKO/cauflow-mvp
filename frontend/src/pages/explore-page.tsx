import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/app-shell";
import { SiteHeader } from "@/components/layout/site-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { buyerNav } from "@/lib/platform-nav";
import { fetchExploreFeed, getAssetImageUrl } from "@/services/api";
import type { ExploreFeed } from "@/types/api";

export function ExplorePage() {
  const { user } = useAuth();
  const [feed, setFeed] = useState<ExploreFeed | null>(null);

  useEffect(() => {
    void fetchExploreFeed().then(setFeed);
  }, []);

  const content = (
    <div className="grid gap-5 lg:grid-cols-2">
      {feed?.packs.map((pack) => (
        <Card key={`pack-${pack.id}`} className="overflow-hidden p-0">
          <div className="aspect-[16/9] bg-slate-900">
            {getAssetImageUrl(pack.coverAsset?.imageUrl || null) ? (
              <img
                src={getAssetImageUrl(pack.coverAsset?.imageUrl || null) || ""}
                alt={pack.title}
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>
          <div className="p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Pack</p>
            <h3 className="mt-2 font-display text-2xl text-white">{pack.title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">{pack.description}</p>
            <div className="mt-5">
              <Link to={user ? "/app/buyer/purchases" : "/signup"}>
                <Button>{user ? "Browse purchase flow" : "Create buyer account"}</Button>
              </Link>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-mesh">
        <SiteHeader />
        <div className="shell py-12">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.24em] text-sky-200">Explore</p>
            <h1 className="mt-3 font-display text-5xl text-white">Browse licensable creative products</h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">
              Public discovery for buyers, before checkout and account onboarding move into the protected platform.
            </p>
          </div>
          {content}
        </div>
      </div>
    );
  }

  return (
    <AppShell
      title="Explore marketplace"
      subtitle="Buyer surface"
      navItems={buyerNav}
    >
      {content}
    </AppShell>
  );
}
