const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:5173";
const NODE_ENV = process.env.NODE_ENV || "development";

const buildUrl = (pathname, token) => {
  const url = new URL(pathname, APP_BASE_URL);
  url.searchParams.set("token", token);
  return url.toString();
};

const logEmailPreview = ({ type, email, subject, actionUrl }) => {
  console.info(
    [
      "[auth-email]",
      `type=${type}`,
      `to=${email}`,
      `subject="${subject}"`,
      `url=${actionUrl}`
    ].join(" ")
  );
};

const sendAuthEmail = async ({ type, email, subject, actionUrl }) => {
  if (NODE_ENV !== "production" || !process.env.AUTH_EMAIL_PROVIDER) {
    logEmailPreview({ type, email, subject, actionUrl });
    return {
      delivered: false,
      mode: "console"
    };
  }

  logEmailPreview({ type, email, subject, actionUrl });

  return {
    delivered: false,
    mode: "unconfigured"
  };
};

export const sendPasswordResetEmail = async ({ email, token }) => {
  const actionUrl = buildUrl("/reset-password", token);

  return sendAuthEmail({
    type: "password_reset",
    email,
    subject: "Reset your CauFlow password",
    actionUrl
  });
};

export const sendVerificationEmail = async ({ email, token }) => {
  const actionUrl = buildUrl("/verify-email", token);

  return sendAuthEmail({
    type: "email_verification",
    email,
    subject: "Verify your CauFlow account",
    actionUrl
  });
};
