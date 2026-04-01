import { normalizeResponseData } from "./normalize-response.js";

export const fetchAccountByUserId = async (db, userId) => {
  const result = await db.query(
    `
    SELECT
      u.id,
      u.email,
      u.role,
      u.account_status,
      u.email_verified,
      u.created_at,
      u.updated_at,
      p.public_display_name,
      p.avatar_url,
      p.organization_name,
      p.studio_name,
      p.country,
      p.preferred_currency,
      p.wallet_address,
      p.wallet_connection_status,
      p.onboarding_completed,
      cs.payout_onboarding_status,
      cs.default_license_type,
      cs.default_license_usage,
      cs.default_price,
      cs.tax_reference,
      cs.stripe_connect_account_id
    FROM users u
    LEFT JOIN profiles p
      ON p.user_id = u.id
    LEFT JOIN creator_settings cs
      ON cs.user_id = u.id
    WHERE u.id = $1
    LIMIT 1
    `,
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const normalizedAccount = normalizeResponseData(result.rows[0]);

  return {
    ...normalizedAccount,
    creatorReady:
      normalizedAccount.role === "creator"
        ? Boolean(
            normalizedAccount.emailVerified &&
              normalizedAccount.accountStatus === "active" &&
              normalizedAccount.publicDisplayName &&
              normalizedAccount.organizationName &&
              normalizedAccount.country &&
              normalizedAccount.preferredCurrency &&
              normalizedAccount.payoutOnboardingStatus === "active"
          )
        : false
  };
};
