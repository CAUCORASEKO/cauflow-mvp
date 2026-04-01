import { pool } from "../config/db.js";
import { sha256 } from "../utils/auth.js";
import { normalizeResponseData } from "../utils/normalize-response.js";

const getBearerToken = (authorizationHeader = "") => {
  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
};

export const attachCurrentUser = async (req, res, next) => {
  try {
    const rawToken = getBearerToken(req.headers.authorization);

    if (!rawToken) {
      req.user = null;
      return next();
    }

    const tokenHash = sha256(rawToken);
    const result = await pool.query(
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
        cs.payout_onboarding_status,
        cs.default_license_type,
        cs.default_license_usage,
        cs.default_price,
        cs.tax_reference,
        cs.stripe_connect_account_id
      FROM user_sessions us
      JOIN users u
        ON u.id = us.user_id
      LEFT JOIN profiles p
        ON p.user_id = u.id
      LEFT JOIN creator_settings cs
        ON cs.user_id = u.id
      WHERE us.token_hash = $1
        AND us.expires_at > CURRENT_TIMESTAMP
      LIMIT 1
      `,
      [tokenHash]
    );

    req.user = result.rows[0] ? normalizeResponseData(result.rows[0]) : null;
    next();
  } catch (error) {
    next(error);
  }
};

export const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Authentication required",
      code: "AUTH_REQUIRED"
    });
  }

  return next();
};

export const requireVerifiedAccount = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Authentication required",
      code: "AUTH_REQUIRED"
    });
  }

  if (!req.user.emailVerified) {
    return res.status(403).json({
      message: "Verify your email to access this area.",
      code: "EMAIL_VERIFICATION_REQUIRED"
    });
  }

  return next();
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Authentication required",
      code: "AUTH_REQUIRED"
    });
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      message: "You do not have permission to perform this action",
      code: "FORBIDDEN"
    });
  }

  return next();
};

export const requireCreatorOrAdmin = requireRole("creator", "admin");
