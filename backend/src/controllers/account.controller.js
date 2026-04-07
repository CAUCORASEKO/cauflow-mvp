import { pool } from "../config/db.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { fetchAccountByUserId } from "../utils/account.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const removeUploadedAvatar = async (imageUrl) => {
  if (!imageUrl?.startsWith("/uploads/avatars/")) {
    return;
  }

  const absoluteFilePath = path.join(__dirname, "..", "..", imageUrl.replace("/uploads/", "uploads/"));

  try {
    await fs.unlink(absoluteFilePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error(`Failed to remove uploaded avatar: ${absoluteFilePath}`, error.message);
    }
  }
};

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
      $1,
      COALESCE($2, (SELECT public_display_name FROM profiles WHERE user_id = $1)),
      COALESCE($3, (SELECT avatar_url FROM profiles WHERE user_id = $1)),
      COALESCE($4, (SELECT organization_name FROM profiles WHERE user_id = $1)),
      COALESCE($5, (SELECT studio_name FROM profiles WHERE user_id = $1)),
      COALESCE($6, (SELECT country FROM profiles WHERE user_id = $1)),
      COALESCE($7, (SELECT preferred_currency FROM profiles WHERE user_id = $1), 'USD'),
      COALESCE($8, (SELECT wallet_address FROM profiles WHERE user_id = $1)),
      COALESCE($9, (SELECT wallet_connection_status FROM profiles WHERE user_id = $1), 'disconnected'),
      COALESCE($10, (SELECT onboarding_completed FROM profiles WHERE user_id = $1), false),
      CURRENT_TIMESTAMP
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
    VALUES (
      $1,
      COALESCE($2, (SELECT payout_onboarding_status FROM creator_settings WHERE user_id = $1), 'not_started'),
      COALESCE($3, (SELECT default_license_type FROM creator_settings WHERE user_id = $1)),
      COALESCE($4, (SELECT default_license_usage FROM creator_settings WHERE user_id = $1)),
      COALESCE($5, (SELECT default_price FROM creator_settings WHERE user_id = $1)),
      COALESCE($6, (SELECT tax_reference FROM creator_settings WHERE user_id = $1)),
      COALESCE($7, (SELECT stripe_connect_account_id FROM creator_settings WHERE user_id = $1)),
      CURRENT_TIMESTAMP
    )
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
    const nextAvatarUrl = req.file ? `/uploads/avatars/${req.file.filename}` : req.body.avatarUrl;

    await updateProfileSection(pool, req.user.id, {
      ...req.body,
      avatarUrl: nextAvatarUrl
    });
    const account = await fetchAccountByUserId(pool, req.user.id);

    if (
      req.file &&
      req.user.avatarUrl &&
      req.user.avatarUrl !== nextAvatarUrl
    ) {
      await removeUploadedAvatar(req.user.avatarUrl);
    }

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

export const closeAccount = async (req, res) => {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    const { confirmation } = req.body || {};

    if (confirmation !== "DELETE") {
      return res.status(400).json({
        message: "Type DELETE to confirm account closure",
        code: "INVALID_ACCOUNT_CLOSURE_CONFIRMATION"
      });
    }

    await client.query("BEGIN");
    transactionStarted = true;

    await client.query(
      `
      UPDATE users
      SET account_status = 'closed',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [req.user.id]
    );

    await client.query(
      `
      DELETE FROM user_sessions
      WHERE user_id = $1
      `,
      [req.user.id]
    );

    await client.query(
      `
      DELETE FROM email_verification_tokens
      WHERE user_id = $1
      `,
      [req.user.id]
    );

    await client.query(
      `
      DELETE FROM password_reset_tokens
      WHERE user_id = $1
      `,
      [req.user.id]
    );

    await client.query("COMMIT");
    transactionStarted = false;

    res.status(200).json({
      message: "Account closed successfully",
      data: {
        success: true
      }
    });
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }

    res.status(500).json({
      message: "Error closing account",
      error: error.message
    });
  } finally {
    client.release();
  }
};
