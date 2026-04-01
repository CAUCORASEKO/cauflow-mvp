import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { ActionFeedback } from "@/components/dashboard/action-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import { getAuthenticatedHomePath } from "@/lib/platform-nav";
import type { UserRole } from "@/types/api";

export function SignupPage() {
  const { user, signUp } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<UserRole>("creator");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [publicDisplayName, setPublicDisplayName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [country, setCountry] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) {
    return <Navigate to={getAuthenticatedHomePath(user)} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload = await signUp({
        role,
        email,
        password,
        publicDisplayName,
        organizationName,
        country,
        preferredCurrency: "USD"
      });

      navigate("/verify-email", {
        replace: true,
        state: {
          email: payload.email,
          role: payload.role,
          justSignedUp: true
        }
      });
    } catch (submissionError) {
      setError(
        submissionError instanceof Error ? submissionError.message : "Unable to create account"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthPageShell
      eyebrow="Create account"
      title="Join the licensing platform"
      copy="Choose your primary role, set your public identity, and create the account that anchors your licensing workflow."
      footer={
        <p className="text-sm text-slate-400">
          Already have an account? <Link to="/login" className="text-sky-200">Log in</Link>
        </p>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-100">Primary role</label>
            <Select value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
              <option value="creator">Creator</option>
              <option value="buyer">Buyer</option>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-100">Country</label>
            <Input value={country} onChange={(event) => setCountry(event.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-100">Public display name</label>
          <Input
            value={publicDisplayName}
            onChange={(event) => setPublicDisplayName(event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-100">Studio / organization</label>
          <Input
            value={organizationName}
            onChange={(event) => setOrganizationName(event.target.value)}
          />
        </div>
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
        {error ? <ActionFeedback tone="error" message={error} /> : null}
        <div className="pt-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating account..." : "Sign up"}
          </Button>
        </div>
      </form>
    </AuthPageShell>
  );
}
