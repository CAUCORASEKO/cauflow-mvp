import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { ActionFeedback } from "@/components/dashboard/action-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";

export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setSubmitted(false);
    setError(null);

    try {
      await requestPasswordReset(email);
      setSubmitted(true);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error ? submissionError.message : "Unable to request reset"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthPageShell
      eyebrow="Password reset"
      title="Recover your account"
      copy="Enter the email tied to your account and we’ll send reset instructions if the account exists."
      footer={<Link to="/login" className="text-sm text-slate-400">Back to login</Link>}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-100">Email</label>
          <Input value={email} onChange={(event) => setEmail(event.target.value)} required />
        </div>
        {submitted ? (
          <ActionFeedback
            tone="success"
            message="If an account exists for this email, we sent reset instructions."
            detail="Check your inbox for a reset link. For local development, the link is logged in the backend console."
          />
        ) : null}
        {error ? <ActionFeedback tone="error" message={error} /> : null}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Sending instructions..." : "Request reset"}
        </Button>
      </form>
    </AuthPageShell>
  );
}
