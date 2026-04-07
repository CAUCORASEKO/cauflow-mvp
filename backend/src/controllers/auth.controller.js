import { pool } from "../config/db.js";
import {
  sendPasswordResetEmail,
  sendVerificationEmail
} from "../services/auth-email.service.js";
import { fetchAccountByUserId } from "../utils/account.js";
import { generateToken, hashPassword, sha256, verifyPassword } from "../utils/auth.js";

const SESSION_TTL_DAYS = 30;
const TOKEN_TTL_HOURS = 24;
const PUBLIC_SIGNUP_ROLES = new Set(["creator", "buyer"]);
const PASSWORD_MIN_LENGTH = 8;
const CLOSED_ACCOUNT_STATUSES = new Set(["closed", "suspended"]);

const sendError = (res, status, message, code, error) =>
  res.status(status).json({
    message,
    ...(code ? { code } : {}),
    ...(error ? { error } : {})
  });

const sendSuccess = (res, status, message, data) =>
  res.status(status).json({
    message,
    data
  });

const normalizeEmail = (email) => email.trim().toLowerCase();

const createSession = async (db, userId) => {
  const sessionToken = generateToken();
  const tokenHash = sha256(sessionToken);

  await db.query(
    `
    INSERT INTO user_sessions (user_id, token_hash, expires_at)
    VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '${SESSION_TTL_DAYS} days')
    `,
    [userId, tokenHash]
  );

  return sessionToken;
};

const createTokenRecord = async (db, tableName, userId) => {
  const rawToken = generateToken();
  const tokenHash = sha256(rawToken);

  await db.query(
    `
    INSERT INTO ${tableName} (user_id, token_hash, expires_at)
    VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '${TOKEN_TTL_HOURS} hours')
    `,
    [userId, tokenHash]
  );

  return rawToken;
};

const ensurePublicSignupRole = (role) => {
  if (!PUBLIC_SIGNUP_ROLES.has(role)) {
    throw new Error("role must be one of: creator, buyer");
  }
};

const ensurePassword = (password) => {
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    throw new Error(`password must be at least ${PASSWORD_MIN_LENGTH} characters`);
  }
};

const revokeTokensForUser = async (db, tableName, userId) => {
  await db.query(
    `
    DELETE FROM ${tableName}
    WHERE user_id = $1
    `,
    [userId]
  );
};

const issueVerificationToken = async (db, userId) => {
  await revokeTokensForUser(db, "email_verification_tokens", userId);
  return createTokenRecord(db, "email_verification_tokens", userId);
};

export const signUp = async (req, res) => {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    const {
      email,
      password,
      role = "buyer",
      publicDisplayName,
      organizationName,
      studioName,
      country,
      preferredCurrency = "USD"
    } = req.body;

    if (!email || !password) {
      return sendError(res, 400, "Email and password are required", "VALIDATION_ERROR");
    }

    ensurePassword(password);
    ensurePublicSignupRole(role);

    const normalizedEmail = normalizeEmail(email);

    const existingUserResult = await client.query(
      `
      SELECT id
      FROM users
      WHERE email = $1
      `,
      [normalizedEmail]
    );

    if (existingUserResult.rows.length > 0) {
      return sendError(
        res,
        409,
        "An account with that email already exists",
        "EMAIL_ALREADY_EXISTS"
      );
    }

    await client.query("BEGIN");
    transactionStarted = true;

    const passwordHash = await hashPassword(password);
    const userResult = await client.query(
      `
      INSERT INTO users (email, password_hash, role)
      VALUES ($1, $2, $3)
      RETURNING id
      `,
      [normalizedEmail, passwordHash, role]
    );

    const userId = userResult.rows[0].id;

    await client.query(
      `
      INSERT INTO profiles (
        user_id,
        public_display_name,
        organization_name,
        studio_name,
        country,
        preferred_currency
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        userId,
        publicDisplayName || null,
        organizationName || null,
        studioName || null,
        country || null,
        preferredCurrency
      ]
    );

    await client.query(
      `
      INSERT INTO creator_settings (
        user_id,
        payout_onboarding_status
      )
      VALUES ($1, $2)
      `,
      [userId, role === "creator" ? "not_started" : "active"]
    );

    const verificationToken = await issueVerificationToken(client, userId);

    await client.query("COMMIT");
    transactionStarted = false;

    await sendVerificationEmail({
      email: normalizedEmail,
      token: verificationToken
    });

    sendSuccess(res, 201, "Account created. Check your email to verify your account.", {
      email: normalizedEmail,
      role,
      verificationRequired: true
    });
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }

    sendError(
      res,
      error.message.startsWith("role must be") ||
        error.message.startsWith("password must be")
        ? 400
        : 500,
      error.message.startsWith("role must be") ||
        error.message.startsWith("password must be")
        ? error.message.charAt(0).toUpperCase() + error.message.slice(1)
        : "Error creating account",
      error.message.startsWith("role must be")
        ? "INVALID_ROLE"
        : error.message.startsWith("password must be")
          ? "INVALID_PASSWORD"
          : "SIGNUP_FAILED",
      error.message.startsWith("role must be") || error.message.startsWith("password must be")
        ? undefined
        : error.message
    );
  } finally {
    client.release();
  }
};

export const logIn = async (req, res) => {
  const client = await pool.connect();

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 400, "Email and password are required", "VALIDATION_ERROR");
    }

    const normalizedEmail = normalizeEmail(email);
    const userResult = await client.query(
      `
      SELECT id, password_hash, email_verified, account_status
      FROM users
      WHERE email = $1
      LIMIT 1
      `,
      [normalizedEmail]
    );

    if (userResult.rows.length === 0) {
      return sendError(res, 401, "Invalid email or password", "INVALID_CREDENTIALS");
    }

    const user = userResult.rows[0];
    const validPassword = await verifyPassword(password, user.password_hash);

    if (!validPassword) {
      return sendError(res, 401, "Invalid email or password", "INVALID_CREDENTIALS");
    }

    if (CLOSED_ACCOUNT_STATUSES.has(user.account_status)) {
      return sendError(
        res,
        403,
        user.account_status === "closed"
          ? "This account has been closed and can no longer be used."
          : "This account is suspended and cannot sign in.",
        user.account_status === "closed" ? "ACCOUNT_CLOSED" : "ACCOUNT_SUSPENDED"
      );
    }

    if (user.account_status === "restricted") {
      return sendError(
        res,
        403,
        "This account is restricted and cannot sign in right now.",
        "ACCOUNT_RESTRICTED"
      );
    }

    if (!user.email_verified) {
      return sendError(
        res,
        403,
        "Verify your email before signing in.",
        "EMAIL_VERIFICATION_REQUIRED"
      );
    }

    const sessionToken = await createSession(client, user.id);
    const account = await fetchAccountByUserId(client, user.id);

    sendSuccess(res, 200, "Logged in successfully", {
      user: account,
      sessionToken
    });
  } catch (error) {
    sendError(res, 500, "Error logging in", "LOGIN_FAILED", error.message);
  } finally {
    client.release();
  }
};

export const logOut = async (req, res) => {
  try {
    const authorizationHeader = req.headers.authorization || "";
    const [, sessionToken] = authorizationHeader.split(" ");

    if (sessionToken) {
      await pool.query(
        `
        DELETE FROM user_sessions
        WHERE token_hash = $1
        `,
        [sha256(sessionToken)]
      );
    }

    sendSuccess(res, 200, "Logged out successfully", { success: true });
  } catch (error) {
    sendError(res, 500, "Error logging out", "LOGOUT_FAILED", error.message);
  }
};

export const getCurrentSession = async (req, res) => {
  if (!req.user) {
    return sendError(res, 401, "Authentication required", "AUTH_REQUIRED");
  }

  const account = await fetchAccountByUserId(pool, req.user.id);

  sendSuccess(res, 200, "Current session fetched successfully", account);
};

export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return sendError(res, 400, "Email is required", "VALIDATION_ERROR");
    }

    const normalizedEmail = normalizeEmail(email);
    const userResult = await pool.query(
      `
      SELECT id
      FROM users
      WHERE email = $1
      LIMIT 1
      `,
      [normalizedEmail]
    );

    if (userResult.rows.length > 0) {
      const userId = userResult.rows[0].id;

      await revokeTokensForUser(pool, "password_reset_tokens", userId);
      const resetToken = await createTokenRecord(pool, "password_reset_tokens", userId);

      await sendPasswordResetEmail({
        email: normalizedEmail,
        token: resetToken
      });
    }

    sendSuccess(
      res,
      200,
      "If an account exists for this email, we sent reset instructions.",
      { success: true }
    );
  } catch (error) {
    sendError(
      res,
      500,
      "Error requesting password reset",
      "PASSWORD_RESET_REQUEST_FAILED",
      error.message
    );
  }
};

export const resetPassword = async (req, res) => {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return sendError(
        res,
        400,
        "Reset token and new password are required",
        "VALIDATION_ERROR"
      );
    }

    ensurePassword(password);

    const tokenHash = sha256(token);
    const tokenResult = await client.query(
      `
      SELECT user_id
      FROM password_reset_tokens
      WHERE token_hash = $1
        AND expires_at > CURRENT_TIMESTAMP
      LIMIT 1
      `,
      [tokenHash]
    );

    if (tokenResult.rows.length === 0) {
      return sendError(
        res,
        400,
        "This reset link is invalid or has expired.",
        "INVALID_RESET_TOKEN"
      );
    }

    await client.query("BEGIN");
    transactionStarted = true;

    const passwordHash = await hashPassword(password);
    await client.query(
      `
      UPDATE users
      SET password_hash = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      `,
      [passwordHash, tokenResult.rows[0].user_id]
    );

    await revokeTokensForUser(client, "password_reset_tokens", tokenResult.rows[0].user_id);

    await client.query(
      `
      DELETE FROM user_sessions
      WHERE user_id = $1
      `,
      [tokenResult.rows[0].user_id]
    );
    await client.query("COMMIT");
    transactionStarted = false;

    sendSuccess(
      res,
      200,
      "Your password has been updated. Sign in with your new password.",
      { success: true }
    );
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }
    sendError(
      res,
      error.message.startsWith("password must be") ? 400 : 500,
      error.message.startsWith("password must be")
        ? error.message.charAt(0).toUpperCase() + error.message.slice(1)
        : "Error resetting password",
      error.message.startsWith("password must be")
        ? "INVALID_PASSWORD"
        : "PASSWORD_RESET_FAILED",
      error.message.startsWith("password must be") ? undefined : error.message
    );
  } finally {
    client.release();
  }
};

export const verifyEmail = async (req, res) => {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    const { token } = req.body;

    if (!token) {
      return sendError(res, 400, "Verification token is required", "VALIDATION_ERROR");
    }

    const tokenHash = sha256(token);
    const tokenResult = await client.query(
      `
      SELECT user_id
      FROM email_verification_tokens
      WHERE token_hash = $1
        AND expires_at > CURRENT_TIMESTAMP
      LIMIT 1
      `,
      [tokenHash]
    );

    if (tokenResult.rows.length === 0) {
      return sendError(
        res,
        400,
        "This verification link is invalid or has expired.",
        "INVALID_VERIFICATION_TOKEN"
      );
    }

    await client.query("BEGIN");
    transactionStarted = true;

    await client.query(
      `
      UPDATE users
      SET email_verified = true,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [tokenResult.rows[0].user_id]
    );

    await revokeTokensForUser(client, "email_verification_tokens", tokenResult.rows[0].user_id);

    await client.query("COMMIT");
    transactionStarted = false;

    sendSuccess(res, 200, "Email verified successfully. You can now sign in.", {
      success: true
    });
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }
    sendError(res, 500, "Error verifying email", "EMAIL_VERIFICATION_FAILED", error.message);
  } finally {
    client.release();
  }
};

export const resendVerificationEmail = async (req, res) => {
  try {
    const requestedEmail = req.body.email || req.user?.email;

    if (!requestedEmail) {
      return sendError(res, 400, "Email is required", "VALIDATION_ERROR");
    }

    const normalizedEmail = normalizeEmail(requestedEmail);
    const userResult = await pool.query(
      `
      SELECT id, email_verified
      FROM users
      WHERE email = $1
      LIMIT 1
      `,
      [normalizedEmail]
    );

    if (userResult.rows.length > 0 && !userResult.rows[0].email_verified) {
      const verificationToken = await issueVerificationToken(pool, userResult.rows[0].id);

      await sendVerificationEmail({
        email: normalizedEmail,
        token: verificationToken
      });
    }

    sendSuccess(
      res,
      200,
      "If the account exists and still needs verification, we sent a fresh verification link.",
      { success: true }
    );
  } catch (error) {
    sendError(
      res,
      500,
      "Error resending verification email",
      "RESEND_VERIFICATION_FAILED",
      error.message
    );
  }
};
