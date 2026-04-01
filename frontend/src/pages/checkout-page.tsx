import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppShell } from "@/components/layout/app-shell";
import { ActionFeedback } from "@/components/dashboard/action-feedback";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { buyerNav } from "@/lib/platform-nav";
import { completeCheckoutSession } from "@/services/api";

export function CheckoutPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"idle" | "success" | "cancel">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    void completeCheckoutSession(Number(sessionId))
      .then(() => setStatus("success"))
      .catch((completionError) =>
        setError(
          completionError instanceof Error
            ? completionError.message
            : "Unable to complete checkout"
        )
      );
  }, [sessionId]);

  return (
    <AppShell title="Checkout" subtitle="Buyer payment flow" navItems={buyerNav}>
      <Card className="p-6">
        {status === "success" ? (
          <ActionFeedback
            tone="success"
            message="Payment succeeded and the license was activated."
            detail="The purchase record and granted license are now available in your buyer dashboard."
          />
        ) : null}
        {error ? <ActionFeedback tone="error" message={error} /> : null}
        <div className="mt-5">
          <Button onClick={() => navigate("/app/buyer/purchases")}>Open purchases</Button>
        </div>
      </Card>
    </AppShell>
  );
}
