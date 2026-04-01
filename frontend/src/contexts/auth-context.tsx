import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren
} from "react";
import {
  fetchCurrentSession,
  logIn as apiLogIn,
  logOut as apiLogOut,
  resendVerificationEmail as apiResendVerificationEmail,
  requestPasswordReset as apiRequestPasswordReset,
  resetPassword as apiResetPassword,
  setSessionToken,
  signUp as apiSignUp,
  verifyEmail as apiVerifyEmail
} from "@/services/api";
import type { Account, UserRole } from "@/types/api";

interface AuthContextValue {
  user: Account | null;
  loading: boolean;
  logIn: (input: { email: string; password: string }) => Promise<Account>;
  signUp: (input: {
    email: string;
    password: string;
    role: UserRole;
    publicDisplayName?: string;
    organizationName?: string;
    studioName?: string;
    country?: string;
    preferredCurrency?: string;
  }) => Promise<{ email: string; role: UserRole; verificationRequired: boolean }>;
  logOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean }>;
  resetPassword: (token: string, password: string) => Promise<{ success: boolean }>;
  verifyEmail: (token: string) => Promise<{ success: boolean }>;
  resendVerificationEmail: (email?: string) => Promise<{ success: boolean }>;
  updateUser: (user: Account) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = async () => {
    try {
      const account = await fetchCurrentSession();
      setUser(account);
    } catch {
      setSessionToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshSession();
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    logIn: async (input) => {
      const payload = await apiLogIn(input);
      setUser(payload.user);
      return payload.user;
    },
    signUp: async (input) => {
      return apiSignUp(input);
    },
    logOut: async () => {
      try {
        await apiLogOut();
      } finally {
        setSessionToken(null);
        setUser(null);
      }
    },
    refreshSession,
    requestPasswordReset: apiRequestPasswordReset,
    resetPassword: apiResetPassword,
    verifyEmail: apiVerifyEmail,
    resendVerificationEmail: apiResendVerificationEmail,
    updateUser: setUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
};
