import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LockKeyhole, Package2, ShieldCheck, Sparkles } from "lucide-react";
import { ActionFeedback } from "@/components/dashboard/action-feedback";
import { AppShell } from "@/components/layout/app-shell";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { formatLicenseType, formatLicenseUsage } from "@/lib/license-taxonomy";
import { buyerNav } from "@/lib/platform-nav";
import { formatCurrency, humanizeLabel } from "@/lib/utils";
import {
  createCheckoutSession,
  fetchExploreFeed,
  getAssetImageUrl,
  type ApiError
} from "@/services/api";
import type { Asset, ExploreFeed, License, Pack } from "@/types/api";

type PurchaseIntent =
  | { assetId: number; licenseId: number; label: string }
  | { packId: number; licenseId: number; label: string };

const getCreatorLabel = (creator?: {
  publicDisplayName?: string | null;
  organizationName?: string | null;
  studioName?: string | null;
  email?: string;
} | null) =>
  creator?.publicDisplayName ||
  creator?.organizationName ||
  creator?.studioName ||
  creator?.email ||
  "Creator";

const getPurchaseErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unable to start checkout right now";

function ExploreAssetCard({
  asset,
  selectedLicenseId,
  onSelectLicense,
  onCheckout,
  pending,
  user
}: {
  asset: Asset;
  selectedLicenseId: number | null;
  onSelectLicense: (licenseId: number) => void;
  onCheckout: (intent: PurchaseIntent) => void;
  pending: boolean;
  user: unknown;
}) {
  const selectedLicense =
    asset.licenseOptions?.find((license) => license.id === selectedLicenseId) ||
    asset.licenseOptions?.[0] ||
    null;
  const imageUrl = getAssetImageUrl(asset.imageUrl || null);
  const canBuy = Boolean(asset.monetizationReady && selectedLicense);

  return (
    <Card className="surface-highlight overflow-hidden border border-white/10 p-0">
      <div className="aspect-[16/10] bg-slate-950/70">
        {imageUrl ? <img src={imageUrl} alt={asset.title} className="h-full w-full object-cover" /> : null}
      </div>
      <div className="space-y-5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-sky-200">Asset license</p>
            <h3 className="mt-2 font-display text-2xl text-white">{asset.title}</h3>
            <p className="mt-2 text-sm text-slate-400">by {getCreatorLabel(asset.creator)}</p>
          </div>
          <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-300">
            {asset.monetizationReady ? "Available" : "Unavailable"}
          </span>
        </div>

        <p className="text-sm leading-7 text-slate-300">
          {asset.description || "Structured licensing for a single asset with clearly defined commercial terms."}
        </p>

        <div className="grid gap-3 rounded-[24px] border border-white/10 bg-black/20 p-4 md:grid-cols-2">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">License option</p>
            <select
              value={selectedLicense?.id || ""}
              onChange={(event) => onSelectLicense(Number(event.target.value))}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-300/30"
              disabled={!asset.licenseOptions?.length}
            >
              {!asset.licenseOptions?.length ? <option value="">No license options</option> : null}
              {asset.licenseOptions?.map((license) => (
                <option key={license.id} value={license.id}>
                  {formatLicenseType(license.type)} · {formatCurrency(Number(license.price))}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2 text-sm text-slate-300">
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">Selected right</span>
              <span className="text-white">
                {selectedLicense ? formatLicenseType(selectedLicense.type) : "Not available"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">Usage</span>
              <span className="text-white">
                {selectedLicense ? formatLicenseUsage(selectedLicense.usage) : "Unavailable"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">Price</span>
              <span className="font-semibold text-white">
                {selectedLicense ? formatCurrency(Number(selectedLicense.price)) : "Unavailable"}
              </span>
            </div>
          </div>
        </div>

        {!asset.monetizationReady && asset.purchaseBlockedReason ? (
          <ActionFeedback
            tone="error"
            message="Checkout is unavailable for this asset right now."
            detail={asset.purchaseBlockedReason}
          />
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm text-slate-400">
            <ShieldCheck className="h-4 w-4 text-sky-200" />
            Active rights are granted after payment succeeds.
          </p>
          {user ? (
            <Button
              disabled={!canBuy || pending}
              onClick={() =>
                selectedLicense
                  ? onCheckout({
                      assetId: asset.id,
                      licenseId: selectedLicense.id,
                      label: asset.title
                    })
                  : undefined
              }
            >
              {pending ? "Starting checkout..." : "License this asset"}
            </Button>
          ) : (
            <Link to="/signup">
              <Button>Create buyer account</Button>
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}

function ExplorePackCard({
  pack,
  onCheckout,
  pending,
  user
}: {
  pack: Pack;
  onCheckout: (intent: PurchaseIntent) => void;
  pending: boolean;
  user: unknown;
}) {
  const imageUrl = getAssetImageUrl(pack.coverAsset?.imageUrl || null);
  const canBuy = Boolean(pack.monetizationReady && pack.license);

  return (
    <Card className="surface-highlight overflow-hidden border border-white/10 p-0">
      <div className="aspect-[16/10] bg-slate-950/70">
        {imageUrl ? <img src={imageUrl} alt={pack.title} className="h-full w-full object-cover" /> : null}
      </div>
      <div className="space-y-5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-sky-200">Pack license</p>
            <h3 className="mt-2 font-display text-2xl text-white">{pack.title}</h3>
            <p className="mt-2 text-sm text-slate-400">by {getCreatorLabel(pack.creator)}</p>
          </div>
          <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-300">
            {humanizeLabel(pack.category)}
          </span>
        </div>

        <p className="text-sm leading-7 text-slate-300">{pack.description}</p>

        <div className="grid gap-3 rounded-[24px] border border-white/10 bg-black/20 p-4 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Included offer</p>
            <p className="text-base font-semibold text-white">
              {pack.license ? formatLicenseType(pack.license.type) : "No pack license"}
            </p>
            <p className="text-sm text-slate-300">
              {pack.license
                ? formatLicenseUsage(pack.license.usage)
                : "Attach a pack license to sell this bundle."}
            </p>
          </div>
          <div className="grid gap-2 text-sm text-slate-300">
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">Type</span>
              <span className="text-white">Pack</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">Assets included</span>
              <span className="text-white">{pack.assetCount}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">Price</span>
              <span className="font-semibold text-white">{formatCurrency(Number(pack.price))}</span>
            </div>
          </div>
        </div>

        {!pack.monetizationReady && pack.purchaseBlockedReason ? (
          <ActionFeedback
            tone="error"
            message="Checkout is unavailable for this pack right now."
            detail={pack.purchaseBlockedReason}
          />
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm text-slate-400">
            <Package2 className="h-4 w-4 text-sky-200" />
            Pack access is tied to one activated commercial right.
          </p>
          {user ? (
            <Button
              disabled={!canBuy || pending}
              onClick={() =>
                pack.license
                  ? onCheckout({
                      packId: pack.id,
                      licenseId: pack.license.id,
                      label: pack.title
                    })
                  : undefined
              }
            >
              {pending ? "Starting checkout..." : "License this pack"}
            </Button>
          ) : (
            <Link to="/signup">
              <Button>Create buyer account</Button>
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}

export function ExplorePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [feed, setFeed] = useState<ExploreFeed | null>(null);
  const [selectedAssetLicenses, setSelectedAssetLicenses] = useState<Record<number, number>>({});
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string; detail?: string } | null>(
    null
  );

  useEffect(() => {
    void fetchExploreFeed().then((nextFeed) => {
      setFeed(nextFeed);
      setSelectedAssetLicenses(
        nextFeed.assets.reduce<Record<number, number>>((accumulator, asset) => {
          if (asset.licenseOptions?.[0]) {
            accumulator[asset.id] = asset.licenseOptions[0].id;
          }
          return accumulator;
        }, {})
      );
    });
  }, []);

  const handleCheckout = async (intent: PurchaseIntent) => {
    try {
      setPendingLabel(intent.label);
      setFeedback(null);
      const session = await createCheckoutSession(
        "assetId" in intent
          ? { assetId: intent.assetId, licenseId: intent.licenseId }
          : { packId: intent.packId, licenseId: intent.licenseId }
      );

      setFeedback({
        tone: "success",
        message: "Checkout session created.",
        detail: "Review the summary, then complete or cancel the payment state from the checkout screen."
      });
      navigate(session.checkoutUrl || `/app/checkout/${session.id}`);
    } catch (error) {
      setFeedback({
        tone: "error",
        message: "Unable to start checkout.",
        detail: getPurchaseErrorMessage(error as ApiError)
      });
    } finally {
      setPendingLabel(null);
    }
  };

  const content = (
    <div className="space-y-8">
      {feedback ? (
        <ActionFeedback tone={feedback.tone} message={feedback.message} detail={feedback.detail} />
      ) : null}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-sky-200">Single assets</p>
            <h2 className="mt-2 font-display text-3xl text-white">License one asset at a time</h2>
          </div>
          <p className="text-sm text-slate-400">{feed?.assets.length || 0} offers</p>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          {feed?.assets.map((asset) => (
            <ExploreAssetCard
              key={`asset-${asset.id}`}
              asset={asset}
              selectedLicenseId={selectedAssetLicenses[asset.id] || null}
              onSelectLicense={(licenseId) =>
                setSelectedAssetLicenses((current) => ({ ...current, [asset.id]: licenseId }))
              }
              onCheckout={handleCheckout}
              pending={pendingLabel === asset.title}
              user={user}
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-sky-200">Packs</p>
            <h2 className="mt-2 font-display text-3xl text-white">License bundled collections</h2>
          </div>
          <p className="text-sm text-slate-400">{feed?.packs.length || 0} published packs</p>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          {feed?.packs.map((pack) => (
            <ExplorePackCard
              key={`pack-${pack.id}`}
              pack={pack}
              onCheckout={handleCheckout}
              pending={pendingLabel === pack.title}
              user={user}
            />
          ))}
        </div>
      </section>
    </div>
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-mesh">
        <SiteHeader />
        <div className="shell py-12">
          <div className="glass-panel mb-8 rounded-[32px] border border-white/10 p-8">
            <p className="text-xs uppercase tracking-[0.24em] text-sky-200">Explore</p>
            <h1 className="mt-3 font-display text-5xl text-white">Browse licensable creative products</h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">
              Review real offers before entering the protected buyer workspace for checkout, purchase records, and active rights.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/signup">
                <Button>Create buyer account</Button>
              </Link>
              <Link to="/login">
                <Button variant="secondary">Log in</Button>
              </Link>
            </div>
          </div>
          {content}
        </div>
      </div>
    );
  }

  return (
    <AppShell title="Explore marketplace" subtitle="Browse licensable assets and packs" navItems={buyerNav}>
      <section className="glass-panel rounded-[30px] border border-white/10 p-6 md:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-sky-200">Commercial browse</p>
            <h1 className="mt-3 font-display text-4xl text-white md:text-5xl">
              Select the right offer, then move straight into checkout.
            </h1>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/20 px-5 py-4 text-sm text-slate-300">
            <p className="flex items-center gap-2 text-white">
              <Sparkles className="h-4 w-4 text-sky-200" />
              Licensing stays product-led.
            </p>
            <p className="mt-2 max-w-sm leading-6">
              Offers show live license terms, monetization readiness, and a checkout path that records the purchase before rights activate.
            </p>
          </div>
        </div>
      </section>

      {feed ? (
        content
      ) : (
        <Card className="surface-highlight p-6">
          <p className="flex items-center gap-2 text-sm text-slate-300">
            <LockKeyhole className="h-4 w-4 text-sky-200" />
            Loading current offerings and checkout availability.
          </p>
        </Card>
      )}
    </AppShell>
  );
}
