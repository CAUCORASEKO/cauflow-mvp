import { useMemo, useState, type FormEvent } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { ActionFeedback } from "@/components/dashboard/action-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { getAuthenticatedHomePath } from "@/lib/platform-nav";
import { ApiError } from "@/services/api";

export function ResetPasswordPage() {
  const { user, resetPassword } = useAuth();
  const [searchParams] = useSearchParams();
  const initialToken = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (user) {
    return <Navigate to={getAuthenticatedHomePath(user)} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      await resetPassword(token, password);
      setSuccess(true);
      setPassword("");
    } catch (submissionError) {
      if (
        submissionError instanceof ApiError &&
        submissionError.code === "INVALID_RESET_TOKEN"
      ) {
        setError("This reset link is invalid or has expired. Request a fresh email to continue.");
      } else {
        setError(
          submissionError instanceof Error ? submissionError.message : "Unable to reset password"
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthPageShell
      eyebrow="New password"
      title="Set a new password"
      copy="Use the reset link from your email to secure the account again and return to the platform."
      footer={<Link to="/login" className="text-sm text-slate-400">Back to login</Link>}
    >
      <div className="space-y-4">
        {!initialToken ? (
          <ActionFeedback
            tone="error"
            message="This page needs a valid reset link."
            detail="Open the reset link from your email, or request a new one if the original link has expired."
          />
        ) : null}
        {success ? (
          <ActionFeedback
            tone="success"
            message="Your password has been updated."
            detail="Sign in with your new password to continue."
          />
        ) : null}
        {error ? <ActionFeedback tone="error" message={error} /> : null}
        <form className="space-y-4" onSubmit={handleSubmit}>
          {!initialToken ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-100">Reset token</label>
              <Input value={token} onChange={(event) => setToken(event.target.value)} required />
            </div>
          ) : null}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-100">New password</label>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              required
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <Link to="/forgot-password" className="text-sm text-slate-400">
              Need a fresh reset link?
            </Link>
            <Button type="submit" disabled={submitting || !token}>
              {submitting ? "Updating password..." : "Reset password"}
            </Button>
          </div>
        </form>
      </div>
    </AuthPageShell>
  );
}
