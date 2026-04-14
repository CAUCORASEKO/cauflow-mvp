import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useAuth } from "@/contexts/auth-context";
import { getAuthenticatedHomePath } from "@/lib/platform-nav";
import { ActiveLicensesPage } from "./pages/active-licenses-page";
import { AdminCatalogPage } from "./pages/admin-catalog-page";
import { AdminCommercePage } from "./pages/admin-commerce-page";
import { AdminHomePage } from "./pages/admin-home-page";
import { AdminReviewQueuePage } from "./pages/admin-review-queue-page";
import { AdminUsersPage } from "./pages/admin-users-page";
import { BuyerHomePage } from "./pages/buyer-home-page";
import { CheckoutPage } from "./pages/checkout-page";
import { CreatorHomePage } from "./pages/creator-home-page";
import { DownloadsPage } from "./pages/downloads-page";
import { ExplorePage } from "./pages/explore-page";
import { ForgotPasswordPage } from "./pages/forgot-password-page";
import { DashboardPage } from "./pages/dashboard-page";
import { HomePage } from "./pages/home-page";
import { LoginPage } from "./pages/login-page";
import { PurchasesPage } from "./pages/purchases-page";
import { ResetPasswordPage } from "./pages/reset-password-page";
import { SalesPage } from "./pages/sales-page";
import { SettingsPage } from "./pages/settings-page";
import { SignupPage } from "./pages/signup-page";
import { VerifyEmailPage } from "./pages/verify-email-page";

function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/explore" element={<ExplorePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />

      <Route element={<ProtectedRoute />}>
        <Route
          path="/app"
          element={
            user ? <Navigate to={getAuthenticatedHomePath(user)} replace /> : <Navigate to="/login" replace />
          }
        />
        <Route path="/app/explore" element={<ExplorePage />} />
        <Route path="/app/settings" element={<SettingsPage />} />
        <Route path="/app/checkout/:sessionId" element={<CheckoutPage />} />
      </Route>

      <Route element={<ProtectedRoute roles={["creator"]} />}>
        <Route path="/app/creator" element={<CreatorHomePage />} />
        <Route path="/app/creator/workspace" element={<DashboardPage />} />
        <Route path="/app/creator/sales" element={<SalesPage />} />
      </Route>

      <Route element={<ProtectedRoute roles={["buyer"]} />}>
        <Route path="/app/buyer" element={<BuyerHomePage />} />
        <Route path="/app/buyer/purchases" element={<PurchasesPage />} />
        <Route path="/app/buyer/licenses" element={<ActiveLicensesPage />} />
        <Route path="/app/buyer/downloads" element={<DownloadsPage />} />
      </Route>

      <Route element={<ProtectedRoute roles={["admin"]} />}>
        <Route path="/app/admin" element={<AdminHomePage />} />
        <Route path="/app/admin/review" element={<AdminReviewQueuePage />} />
        <Route path="/app/admin/catalog" element={<AdminCatalogPage />} />
        <Route path="/app/admin/users" element={<AdminUsersPage />} />
        <Route path="/app/admin/commerce" element={<AdminCommercePage />} />
      </Route>
    </Routes>
  );
}

export default App;
