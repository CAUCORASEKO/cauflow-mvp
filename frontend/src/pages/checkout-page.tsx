import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, CreditCard, RotateCcw, XCircle } from "lucide-react";
import { ActionFeedback } from "@/components/dashboard/action-feedback";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatLicenseType, formatLicenseUsage } from "@/lib/license-taxonomy";
import { buyerNav } from "@/lib/platform-nav";
import { formatCurrency, formatDate, humanizeLabel } from "@/lib/utils";
import { completeCheckoutSession, fetchCheckoutSession } from "@/services/api";
import type { PaymentRecord, PaymentStatus } from "@/types/api";

const paymentCopy: Record<
  PaymentStatus,
  { tone: "success" | "error" | "pending"; message: string; detail: string }
> = {
  pending: {
    tone: "pending",
    message: "Payment is waiting for completion.",
    detail: "This checkout session has been recorded, but no license is active until payment succeeds."
  },
  paid: {
    tone: "success",
    message: "Payment succeeded and the license is active.",
    detail: "The purchase record and the buyer entitlement are now available in the buyer workspace."
  },
  failed: {
    tone: "error",
    message: "Payment failed.",
    detail: "The purchase remains recorded for audit, but no entitlement was activated."
  },
  canceled: {
    tone: "error",
    message: "Checkout was canceled.",
    detail: "No entitlement was activated. The buyer can start a new checkout when ready."
  },
  refunded: {
    tone: "error",
    message: "Payment was refunded.",
    detail: "The purchase remains on record, and any previously active entitlement has been revoked."
  }
};

const getOfferingLabel = (checkoutSession: PaymentRecord | null) =>
  checkoutSession?.pack?.title || checkoutSession?.asset?.title || "Selected offer";

export function CheckoutPage() {
  const { sessionId } = useParams();
  const [checkoutSession, setCheckoutSession] = useState<PaymentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<PaymentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      setError("Checkout session is missing.");
      return;
    }

    void fetchCheckoutSession(Number(sessionId))
      .then((response) => {
        setCheckoutSession(response);
        setError(null);
      })
      .catch((loadError) =>
        setError(loadError instanceof Error ? loadError.message : "Unable to load checkout")
      )
      .finally(() => setLoading(false));
  }, [sessionId]);

  const handleStatusChange = async (status: PaymentStatus) => {
    if (!checkoutSession) {
      return;
    }

    try {
      setUpdatingStatus(status);
      setError(null);
      const response = await completeCheckoutSession(checkoutSession.id, status);
      setCheckoutSession(response.payment);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update checkout");
    } finally {
      setUpdatingStatus(null);
    }
  };

  const currentStatus = checkoutSession?.status || "pending";
  const statusInfo = paymentCopy[currentStatus];

  return (
    <AppShell title="Checkout" subtitle="Review payment state before rights activate" navItems={buyerNav}>
      <section className="glass-panel rounded-[30px] border border-white/10 p-6 md:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-sky-200">Checkout session</p>
            <h1 className="mt-3 font-display text-4xl text-white md:text-5xl">{getOfferingLabel(checkoutSession)}</h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300">
              This product surface is payment-provider ready but still uses an internal completion flow. The state changes below remain honest: purchase and entitlement only activate after a paid outcome.
            </p>
          </div>
          <Card className="surface-highlight min-w-[280px] p-5">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Selected license</p>
            <p className="mt-3 font-display text-3xl text-white">
              {checkoutSession?.license
                ? formatLicenseType(checkoutSession.license.type)
                : "Loading"}
            </p>
            <p className="mt-2 text-sm text-slate-300">
              {checkoutSession?.license
                ? formatLicenseUsage(checkoutSession.license.usage)
                : "Awaiting checkout data"}
            </p>
            <p className="mt-4 text-sm text-slate-400">
              {checkoutSession ? formatCurrency(Number(checkoutSession.amount)) : "Loading amount"}
            </p>
          </Card>
        </div>
      </section>

      {loading ? (
        <Card className="surface-highlight p-6">
          <p className="text-sm text-slate-300">Loading checkout summary and recorded payment state.</p>
        </Card>
      ) : null}

      {error ? <ActionFeedback tone="error" message={error} /> : null}
      {!loading && !error ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr),360px]">
          <div className="space-y-6">
            <ActionFeedback tone={statusInfo.tone} message={statusInfo.message} detail={statusInfo.detail} />

            <Card className="surface-highlight p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Purchase summary</p>
                  <h2 className="mt-2 font-display text-3xl text-white">Recorded before activation</h2>
                </div>
                <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-300">
                  {humanizeLabel(currentStatus)}
                </span>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Offering</p>
                  <p className="mt-2 text-lg text-white">{getOfferingLabel(checkoutSession)}</p>
                  <p className="mt-2 text-sm text-slate-300">
                    {checkoutSession?.pack ? "Pack license" : "Asset license"}
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Creator</p>
                  <p className="mt-2 text-lg text-white">
                    {checkoutSession?.creator?.publicDisplayName ||
                      checkoutSession?.creator?.organizationName ||
                      checkoutSession?.creator?.studioName ||
                      checkoutSession?.creator?.email ||
                      "Unavailable"}
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    Payout state: {humanizeLabel(checkoutSession?.creator?.payoutOnboardingStatus || "not_started")}
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Recorded purchase</p>
                  <p className="mt-2 text-lg text-white">
                    {checkoutSession?.purchase ? `Purchase #${checkoutSession.purchase.id}` : "Pending record"}
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    {checkoutSession?.purchase
                      ? `${humanizeLabel(checkoutSession.purchase.status)} · ${formatDate(checkoutSession.purchase.createdAt)}`
                      : "A pending purchase record is linked to this checkout."}
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Entitlement outcome</p>
                  <p className="mt-2 text-lg text-white">
                    {currentStatus === "paid" ? "Active license" : currentStatus === "refunded" ? "Revoked license" : "No active license"}
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    Successful payment activates rights. Failed or canceled states leave the entitlement inactive.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="surface-highlight p-6">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Payment controls</p>
              <h2 className="mt-2 font-display text-3xl text-white">Advance the recorded payment state</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
                Use these internal controls to simulate the provider callback while keeping purchase recording and entitlement activation connected to the real payment status.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button disabled={Boolean(updatingStatus)} onClick={() => void handleStatusChange("paid")}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {updatingStatus === "paid" ? "Updating..." : "Mark paid"}
                </Button>
                <Button
                  variant="secondary"
                  disabled={Boolean(updatingStatus)}
                  onClick={() => void handleStatusChange("failed")}
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  {updatingStatus === "failed" ? "Updating..." : "Mark failed"}
                </Button>
                <Button
                  variant="secondary"
                  disabled={Boolean(updatingStatus)}
                  onClick={() => void handleStatusChange("canceled")}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  {updatingStatus === "canceled" ? "Updating..." : "Cancel checkout"}
                </Button>
                <Button
                  variant="ghost"
                  disabled={Boolean(updatingStatus) || currentStatus !== "paid"}
                  onClick={() => void handleStatusChange("refunded")}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {updatingStatus === "refunded" ? "Updating..." : "Refund payment"}
                </Button>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="surface-highlight p-6">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Recorded payment</p>
              <div className="mt-4 space-y-4 text-sm text-slate-300">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">Provider</span>
                  <span className="text-white">{humanizeLabel(checkoutSession?.provider || "stripe_connect")}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">Session</span>
                  <span className="text-right text-white">{checkoutSession?.providerSessionId}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">Amount</span>
                  <span className="text-white">
                    {checkoutSession ? formatCurrency(Number(checkoutSession.amount)) : "Unavailable"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">Status</span>
                  <span className="text-white">{humanizeLabel(currentStatus)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">Created</span>
                  <span className="text-white">
                    {checkoutSession ? formatDate(checkoutSession.createdAt) : "Unavailable"}
                  </span>
                </div>
              </div>
            </Card>

            <Card className="surface-highlight p-6">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Next steps</p>
              <div className="mt-4 space-y-3">
                <Link to="/app/buyer/purchases">
                  <Button className="w-full">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Open purchase history
                  </Button>
                </Link>
                <Link to="/app/buyer/licenses">
                  <Button variant="secondary" className="w-full">
                    Open active licenses
                  </Button>
                </Link>
                <Link to="/app/explore">
                  <Button variant="ghost" className="w-full">
                    Back to explore
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
