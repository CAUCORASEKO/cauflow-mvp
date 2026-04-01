import { pool } from "../config/db.js";
import { fetchAccountByUserId } from "../utils/account.js";

const updateProfileSection = async (db, userId, fields) => {
  await db.query(
    `
    INSERT INTO profiles (
      user_id,
      public_display_name,
      avatar_url,
      organization_name,
      studio_name,
      country,
      preferred_currency,
      wallet_address,
      wallet_connection_status,
      onboarding_completed,
      updated_at
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP
    )
    ON CONFLICT (user_id)
    DO UPDATE SET
      public_display_name = COALESCE(EXCLUDED.public_display_name, profiles.public_display_name),
      avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
      organization_name = COALESCE(EXCLUDED.organization_name, profiles.organization_name),
      studio_name = COALESCE(EXCLUDED.studio_name, profiles.studio_name),
      country = COALESCE(EXCLUDED.country, profiles.country),
      preferred_currency = COALESCE(EXCLUDED.preferred_currency, profiles.preferred_currency),
      wallet_address = COALESCE(EXCLUDED.wallet_address, profiles.wallet_address),
      wallet_connection_status = COALESCE(EXCLUDED.wallet_connection_status, profiles.wallet_connection_status),
      onboarding_completed = COALESCE(EXCLUDED.onboarding_completed, profiles.onboarding_completed),
      updated_at = CURRENT_TIMESTAMP
    `,
    [
      userId,
      fields.publicDisplayName ?? null,
      fields.avatarUrl ?? null,
      fields.organizationName ?? null,
      fields.studioName ?? null,
      fields.country ?? null,
      fields.preferredCurrency ?? null,
      fields.walletAddress ?? null,
      fields.walletConnectionStatus ?? null,
      fields.onboardingCompleted ?? null
    ]
  );
};

const updateCreatorSettingsSection = async (db, userId, fields) => {
  await db.query(
    `
    INSERT INTO creator_settings (
      user_id,
      payout_onboarding_status,
      default_license_type,
      default_license_usage,
      default_price,
      tax_reference,
      stripe_connect_account_id,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id)
    DO UPDATE SET
      payout_onboarding_status = COALESCE(EXCLUDED.payout_onboarding_status, creator_settings.payout_onboarding_status),
      default_license_type = COALESCE(EXCLUDED.default_license_type, creator_settings.default_license_type),
      default_license_usage = COALESCE(EXCLUDED.default_license_usage, creator_settings.default_license_usage),
      default_price = COALESCE(EXCLUDED.default_price, creator_settings.default_price),
      tax_reference = COALESCE(EXCLUDED.tax_reference, creator_settings.tax_reference),
      stripe_connect_account_id = COALESCE(EXCLUDED.stripe_connect_account_id, creator_settings.stripe_connect_account_id),
      updated_at = CURRENT_TIMESTAMP
    `,
    [
      userId,
      fields.payoutOnboardingStatus ?? null,
      fields.defaultLicenseType ?? null,
      fields.defaultLicenseUsage ?? null,
      fields.defaultPrice ?? null,
      fields.taxReference ?? null,
      fields.stripeConnectAccountId ?? null
    ]
  );
};

export const getAccount = async (req, res) => {
  const account = await fetchAccountByUserId(pool, req.user.id);

  res.status(200).json({
    message: "Account fetched successfully",
    data: account
  });
};

export const updateProfile = async (req, res) => {
  try {
    await updateProfileSection(pool, req.user.id, req.body);
    const account = await fetchAccountByUserId(pool, req.user.id);

    res.status(200).json({
      message: "Profile updated successfully",
      data: account
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating profile",
      error: error.message
    });
  }
};

export const updateBusinessSettings = async (req, res) => {
  try {
    await updateProfileSection(pool, req.user.id, req.body);
    await updateCreatorSettingsSection(pool, req.user.id, req.body);
    const account = await fetchAccountByUserId(pool, req.user.id);

    res.status(200).json({
      message: "Business settings updated successfully",
      data: account
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating business settings",
      error: error.message
    });
  }
};

export const updateLicensingDefaults = async (req, res) => {
  try {
    await updateCreatorSettingsSection(pool, req.user.id, req.body);
    const account = await fetchAccountByUserId(pool, req.user.id);

    res.status(200).json({
      message: "Licensing defaults updated successfully",
      data: account
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating licensing defaults",
      error: error.message
    });
  }
};

export const updateWalletSettings = async (req, res) => {
  try {
    await updateProfileSection(pool, req.user.id, req.body);
    const account = await fetchAccountByUserId(pool, req.user.id);

    res.status(200).json({
      message: "Wallet settings updated successfully",
      data: account
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating wallet settings",
      error: error.message
    });
  }
};
