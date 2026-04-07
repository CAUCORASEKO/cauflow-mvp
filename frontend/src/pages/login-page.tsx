import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { ActionFeedback } from "@/components/dashboard/action-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { getAuthenticatedHomePath } from "@/lib/platform-nav";
import { ApiError } from "@/services/api";

export function LoginPage() {
  const { user, logIn, resendVerificationEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { from?: { pathname?: string }; message?: string } | null;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showVerificationHelp, setShowVerificationHelp] = useState(false);
  const [resendState, setResendState] = useState<"idle" | "pending" | "success" | "error">("idle");

  if (user) {
    return <Navigate to={getAuthenticatedHomePath(user)} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setShowVerificationHelp(false);
    setResendState("idle");

    try {
      const account = await logIn({ email, password });
      const nextPath = locationState?.from?.pathname;
      navigate(nextPath || getAuthenticatedHomePath(account), { replace: true });
    } catch (submissionError) {
      if (submissionError instanceof ApiError && submissionError.code === "EMAIL_VERIFICATION_REQUIRED") {
        setShowVerificationHelp(true);
      }

      setError(
        submissionError instanceof Error ? submissionError.message : "Unable to log in"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      setError("Enter your email first so we can resend the verification link.");
      return;
    }

    setResendState("pending");
    setError(null);

    try {
      await resendVerificationEmail(email);
      setResendState("success");
    } catch (submissionError) {
      setResendState("error");
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to resend verification email"
      );
    }
  };

  return (
    <AuthPageShell
      eyebrow="Sign in"
      title="Enter CauFlow"
      copy="Use your verified account to enter the role-aware workspace for licensing, sales, and purchase operations."
      footer={
        <p className="text-sm text-slate-400">
          New to CauFlow? <Link to="/signup" className="text-sky-200">Create an account</Link>
        </p>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-100">Email</label>
          <Input value={email} onChange={(event) => setEmail(event.target.value)} required />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-100">Password</label>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>
        {showVerificationHelp ? (
          <ActionFeedback
            tone={resendState === "pending" ? "pending" : resendState === "success" ? "success" : "error"}
            message={
              resendState === "success"
                ? "A fresh verification link is on the way."
                : resendState === "pending"
                  ? "Sending a fresh verification link..."
                  : "Your account needs email verification before sign-in."
            }
            detail={
              resendState === "success"
                ? "Check your inbox and return here after confirming the account."
                : "Use the link in your verification email, or resend it below."
            }
          />
        ) : null}
        {!showVerificationHelp && locationState?.message ? (
          <ActionFeedback tone="success" message={locationState.message} />
        ) : null}
        {error ? <ActionFeedback tone="error" message={error} /> : null}
        <div className="flex items-center justify-between gap-3 pt-2">
          <Link to="/forgot-password" className="text-sm text-slate-400">
            Forgot password?
          </Link>
          <div className="flex items-center gap-3">
            {showVerificationHelp ? (
              <Button type="button" variant="secondary" disabled={resendState === "pending"} onClick={handleResendVerification}>
                {resendState === "pending" ? "Sending..." : "Resend verification"}
              </Button>
            ) : null}
            <Button type="submit" disabled={submitting}>
              {submitting ? "Signing in..." : "Log in"}
            </Button>
          </div>
        </div>
      </form>
    </AuthPageShell>
  );
}
