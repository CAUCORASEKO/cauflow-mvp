import { useEffect, useState } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ActionFeedback } from "@/components/dashboard/action-feedback";
import { AdminEmptyState, AdminStatCard, AdminStatusPill } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { formatAssetDeliveryStatus } from "@/lib/asset-delivery";
import { formatAssetReviewStatus, getAssetReviewBadgeClassName } from "@/lib/asset-review";
import { adminNav } from "@/lib/platform-nav";
import { formatDate, formatFileSize } from "@/lib/utils";
import { fetchAdminReviewQueue, getAssetImageUrl, updateAssetReview } from "@/services/api";
import type { AdminReviewQueueSnapshot, Asset } from "@/types/api";

const formatCatalogStatus = (value: Asset["status"]) =>
  value === "published" ? "Published" : value === "archived" ? "Archived" : "Draft";

const getReviewMeta = (asset: Asset) =>
  [
    asset.masterFile?.mimeType
      ? asset.masterFile.mimeType.replace("image/", "").toUpperCase()
      : null,
    asset.masterFile?.resolutionSummary || null,
    asset.masterFile?.fileSize ? formatFileSize(asset.masterFile.fileSize) : null
  ].filter(Boolean) as string[];

export function AdminReviewQueuePage() {
  const [snapshot, setSnapshot] = useState<AdminReviewQueueSnapshot | null>(null);
  const [draftNotes, setDraftNotes] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(
    null
  );

  useEffect(() => {
    void fetchAdminReviewQueue().then((nextSnapshot) => {
      setSnapshot(nextSnapshot);
      setDraftNotes(
        Object.fromEntries(nextSnapshot.assets.map((asset) => [asset.id, asset.reviewNote || ""]))
      );
    });
  }, []);

  const buildSummary = (assets: Asset[]) => ({
    inReviewCount: assets.length,
    deliveryReadyCount: assets.filter((entry) => entry.deliveryReadiness?.isReady).length,
    blockedCount: assets.filter((entry) => !entry.deliveryReadiness?.isReady).length
  });

  const updateAssetInState = (nextAsset: Asset) => {
    setSnapshot((current) =>
      current
        ? (() => {
            const assets = current.assets.filter((asset) => asset.id !== nextAsset.id);

            return {
              ...current,
              summary: buildSummary(assets),
              assets
            };
          })()
        : current
    );
    setDraftNotes((current) => ({ ...current, [nextAsset.id]: nextAsset.reviewNote || "" }));
  };

  const handleReviewAction = async (
    asset: Asset,
    input: { reviewStatus?: Asset["reviewStatus"]; reviewNote?: string },
    successMessage: string
  ) => {
    try {
      const actionKey = `${asset.id}:${input.reviewStatus || "note"}`;
      setSubmitting(actionKey);
      const updatedAsset = await updateAssetReview(asset.id, input);
      setNotice({ tone: "success", message: successMessage });

      if (updatedAsset.reviewStatus === "in_review") {
        setDraftNotes((current) => ({ ...current, [updatedAsset.id]: updatedAsset.reviewNote || "" }));
        setSnapshot((current) =>
          current
            ? (() => {
                const assets = current.assets.map((entry) =>
                  entry.id === updatedAsset.id ? updatedAsset : entry
                );

                return {
                  ...current,
                  summary: buildSummary(assets),
                  assets
                };
              })()
            : current
        );
      } else {
        updateAssetInState(updatedAsset);
      }
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Unable to update review state"
      });
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <AppShell title="Review queue" subtitle="Admin moderation" navItems={adminNav}>
      {notice ? <ActionFeedback tone={notice.tone} message={notice.message} /> : null}

      <section className="glass-panel rounded-[30px] border border-white/10 p-6 md:p-7">
        <p className="text-xs uppercase tracking-[0.28em] text-sky-200">Moderation</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-white md:text-5xl">
          Review delivery readiness, creator intent, and publication discipline before assets go live.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
          This queue is purpose-built for premium visual licensing. Admins can inspect the preview,
          delivery health, moderation note, and catalog status before approving or rejecting the
          asset for publication.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <AdminStatCard
          label="In review"
          value={String(snapshot?.summary.inReviewCount ?? 0)}
          detail="Assets currently waiting for an admin decision."
        />
        <AdminStatCard
          label="Delivery ready"
          value={String(snapshot?.summary.deliveryReadyCount ?? 0)}
          detail="Queue items that already meet premium file requirements."
        />
        <AdminStatCard
          label="Blocked"
          value={String(snapshot?.summary.blockedCount ?? 0)}
          detail="Items still missing delivery readiness or technical completeness."
        />
      </section>

      {snapshot?.assets.length ? (
        <div className="grid gap-5">
          {snapshot.assets.map((asset) => {
            const imageUrl = getAssetImageUrl(
              asset.previewImageUrl || asset.previewFile?.url || asset.imageUrl || null
            );
            const noteValue = draftNotes[asset.id] ?? "";
            const meta = getReviewMeta(asset);

            return (
              <Card key={asset.id} className="surface-highlight p-6">
                <div className="grid gap-5 xl:grid-cols-[280px,minmax(0,1fr)]">
                  <div>
                    <div className="overflow-hidden rounded-[24px] border border-white/10 bg-slate-950">
                      {imageUrl ? (
                        <img src={imageUrl} alt={asset.title} className="h-64 w-full object-cover" />
                      ) : (
                        <div className="flex h-64 items-center justify-center text-slate-500">
                          No preview
                        </div>
                      )}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <AdminStatusPill label={formatCatalogStatus(asset.status)} />
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${getAssetReviewBadgeClassName(asset.reviewStatus)}`}
                      >
                        {formatAssetReviewStatus(asset.reviewStatus)}
                      </span>
                      <AdminStatusPill
                        label={formatAssetDeliveryStatus(asset.deliveryReadiness?.status)}
                        tone={asset.deliveryReadiness?.isReady ? "success" : "warning"}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                          Submitted {formatDate(asset.createdAt)}
                        </p>
                        <h2 className="mt-3 font-display text-3xl text-white">{asset.title}</h2>
                        <p className="mt-2 text-sm text-slate-400">
                          {asset.creator?.publicDisplayName ||
                            asset.creator?.organizationName ||
                            asset.creator?.studioName ||
                            asset.creator?.email ||
                            "Unknown creator"}
                        </p>
                      </div>
                      <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">
                        {asset.visualType.replace(/_/g, " ")}
                      </div>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Preview</p>
                        <p className="mt-2 text-white">
                          {asset.previewFile?.resolutionSummary || "Preview metadata unavailable"}
                        </p>
                      </div>
                      <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Master file</p>
                        <p className="mt-2 text-white">
                          {asset.masterFile?.fileName || "Master file unavailable"}
                        </p>
                      </div>
                      <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Readiness</p>
                        <p className="mt-2 text-white">
                          {asset.deliveryReadiness?.helperText || "No readiness data"}
                        </p>
                      </div>
                      <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Current note</p>
                        <p className="mt-2 text-white">
                          {asset.reviewNote || "No review note saved yet"}
                        </p>
                      </div>
                    </div>

                    {meta.length ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {meta.map((item) => (
                          <span
                            key={item}
                            className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-300"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-6 rounded-[24px] border border-white/10 bg-black/20 p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Admin review note</p>
                      <Textarea
                        className="mt-3 min-h-[140px]"
                        value={noteValue}
                        onChange={(event) =>
                          setDraftNotes((current) => ({
                            ...current,
                            [asset.id]: event.target.value
                          }))
                        }
                        placeholder="Capture moderation context, delivery concerns, or publication guidance."
                      />
                      <div className="mt-4 flex flex-wrap gap-3">
                        <Button
                          variant="ghost"
                          disabled={submitting === `${asset.id}:note`}
                          onClick={() =>
                            void handleReviewAction(
                              asset,
                              { reviewNote: noteValue },
                              noteValue ? "Review note saved." : "Review note cleared."
                            )
                          }
                        >
                          Save note
                        </Button>
                        <Button
                          variant="secondary"
                          className="gap-2"
                          disabled={submitting === `${asset.id}:approved`}
                          onClick={() =>
                            void handleReviewAction(
                              asset,
                              { reviewStatus: "approved", reviewNote: noteValue },
                              "Asset approved."
                            )
                          }
                        >
                          <Check className="h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          variant="secondary"
                          className="gap-2"
                          disabled={submitting === `${asset.id}:rejected`}
                          onClick={() =>
                            void handleReviewAction(
                              asset,
                              { reviewStatus: "rejected", reviewNote: noteValue },
                              "Asset rejected."
                            )
                          }
                        >
                          <X className="h-4 w-4" />
                          Reject
                        </Button>
                        <Button
                          variant="ghost"
                          className="gap-2"
                          disabled={submitting === `${asset.id}:draft`}
                          onClick={() =>
                            void handleReviewAction(
                              asset,
                              { reviewStatus: "draft", reviewNote: noteValue },
                              "Asset returned to draft."
                            )
                          }
                        >
                          <RotateCcw className="h-4 w-4" />
                          Return to draft
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <AdminEmptyState
          title="No assets are currently in review."
          copy="The moderation queue will repopulate as creators submit new premium assets for approval."
          actionLabel="Open catalog"
          actionHref="/app/admin/catalog"
        />
      )}
    </AppShell>
  );
}
