import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useSearchParams } from "react-router-dom";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { ActionFeedback } from "@/components/dashboard/action-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { getAuthenticatedHomePath } from "@/lib/platform-nav";
import { ApiError } from "@/services/api";

type VerifyLocationState = {
  email?: string;
  justSignedUp?: boolean;
  reason?: string;
};

export function VerifyEmailPage() {
  const { user, verifyEmail, resendVerificationEmail } = useAuth();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const locationState = (location.state || {}) as VerifyLocationState;
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const [email, setEmail] = useState(locationState.email || user?.email || "");
  const [verifying, setVerifying] = useState(false);
  const [verifyState, setVerifyState] = useState<"idle" | "success" | "error">("idle");
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const [resendState, setResendState] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const isVerified = Boolean(user?.emailVerified);

  useEffect(() => {
    if (!token || verifyState !== "idle") {
      return;
    }

    let active = true;

    const runVerification = async () => {
      setVerifying(true);
      setVerifyMessage(null);

      try {
        await verifyEmail(token);

        if (!active) {
          return;
        }

        setVerifyState("success");
        setVerifyMessage("Your account is verified. You can now sign in.");
      } catch (submissionError) {
        if (!active) {
          return;
        }

        setVerifyState("error");
        if (
          submissionError instanceof ApiError &&
          submissionError.code === "INVALID_VERIFICATION_TOKEN"
        ) {
          setVerifyMessage("This verification link is invalid or has expired.");
        } else {
          setVerifyMessage(
            submissionError instanceof Error
              ? submissionError.message
              : "Unable to verify email"
          );
        }
      } finally {
        if (active) {
          setVerifying(false);
        }
      }
    };

    void runVerification();

    return () => {
      active = false;
    };
  }, [token, verifyEmail, verifyState]);

  if (isVerified && verifyState !== "success") {
    return <Navigate to={getAuthenticatedHomePath(user!)} replace />;
  }

  const handleResend = async () => {
    if (!email) {
      setResendState("error");
      setResendMessage("Enter your email so we know where to send the verification link.");
      return;
    }

    setResendState("pending");
    setResendMessage(null);

    try {
      await resendVerificationEmail(email);
      setResendState("success");
      setResendMessage("If the account still needs verification, a fresh link is on the way.");
    } catch (submissionError) {
      setResendState("error");
      setResendMessage(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to resend verification email"
      );
    }
  };

  return (
    <AuthPageShell
      eyebrow="Verify email"
      title="Confirm your account"
      copy="Email verification activates your CauFlow account so you can enter the protected creator or buyer workspace."
      footer={
        <p className="text-sm text-slate-400">
          Already verified? <Link to="/login" className="text-sky-200">Log in</Link>
        </p>
      }
    >
      <div className="space-y-4">
        {locationState.justSignedUp ? (
          <ActionFeedback
            tone="success"
            message="Your account is ready for verification."
            detail="Check your inbox for the verification email. For local development, the link is logged in the backend console."
          />
        ) : null}
        {locationState.reason === "verification_required" && !token ? (
          <ActionFeedback
            tone="error"
            message="Verify your email before entering the app."
            detail="Once your email is confirmed, you can sign in and continue to your dashboard."
          />
        ) : null}
        {verifying ? (
          <ActionFeedback
            tone="pending"
            message="Verifying your account..."
            detail="We’re validating the secure link from your email."
          />
        ) : null}
        {verifyState === "success" && verifyMessage ? (
          <ActionFeedback tone="success" message={verifyMessage} />
        ) : null}
        {verifyState === "error" && verifyMessage ? (
          <ActionFeedback
            tone="error"
            message={verifyMessage}
            detail="Request a fresh verification email below if you need a new link."
          />
        ) : null}
        {!token ? (
          <div className="space-y-4 rounded-[24px] border border-white/10 bg-slate-950/55 p-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                Resend verification
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                Enter your account email and we’ll send a fresh verification link if the account still needs one.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-100">Email</label>
              <Input value={email} onChange={(event) => setEmail(event.target.value)} required />
            </div>
            {resendMessage ? (
              <ActionFeedback
                tone={
                  resendState === "pending"
                    ? "pending"
                    : resendState === "success"
                      ? "success"
                      : "error"
                }
                message={resendMessage}
              />
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link to="/login" className="text-sm text-slate-400">
                Back to login
              </Link>
              <Button
                type="button"
                variant="secondary"
                disabled={resendState === "pending"}
                onClick={handleResend}
              >
                {resendState === "pending" ? "Sending link..." : "Resend verification"}
              </Button>
            </div>
          </div>
        ) : verifyState === "success" ? (
          <div className="flex justify-end">
            <Link to="/login">
              <Button>Continue to login</Button>
            </Link>
          </div>
        ) : null}
      </div>
    </AuthPageShell>
  );
}
