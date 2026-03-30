const POLICY_DEFAULTS = {
  commercialUse: false,
  aiTraining: "not_allowed",
  derivativeWorks: "not_allowed",
  attribution: "not_required",
  licenseScope: "non_exclusive",
  redistribution: "not_allowed",
  usageType: "commercial",
  policyVersion: "v1",
  summary: null
};

const POLICY_ALLOWED_VALUES = {
  aiTraining: ["allowed", "not_allowed"],
  derivativeWorks: ["allowed", "restricted", "not_allowed"],
  attribution: ["required", "optional", "not_required"],
  licenseScope: ["non_exclusive", "exclusive"],
  redistribution: ["allowed", "not_allowed"],
  usageType: ["personal", "commercial", "ai", "editorial"]
};

const LABELS = {
  commercialUse: {
    true: "Commercial use allowed.",
    false: "Commercial use not allowed."
  },
  aiTraining: {
    allowed: "AI training allowed.",
    not_allowed: "AI training not allowed."
  },
  derivativeWorks: {
    allowed: "Derivative works allowed.",
    restricted: "Derivative works restricted.",
    not_allowed: "Derivative works not allowed."
  },
  attribution: {
    required: "Attribution required.",
    optional: "Attribution optional.",
    not_required: "Attribution not required."
  },
  redistribution: {
    allowed: "Redistribution allowed.",
    not_allowed: "Redistribution not allowed."
  },
  licenseScope: {
    exclusive: "Exclusive license.",
    non_exclusive: "Non-exclusive license."
  }
};

export const generatePolicySummary = (policy) =>
  [
    LABELS.commercialUse[String(policy.commercialUse)],
    LABELS.aiTraining[policy.aiTraining],
    LABELS.derivativeWorks[policy.derivativeWorks],
    LABELS.attribution[policy.attribution],
    LABELS.redistribution[policy.redistribution],
    LABELS.licenseScope[policy.licenseScope]
  ].join(" ");

export const getDefaultLicensePolicy = () => ({ ...POLICY_DEFAULTS });

export const validateAndBuildPolicy = (policy, basePolicy = POLICY_DEFAULTS) => {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new Error("policy must be a valid object");
  }

  const mergedPolicy = {
    ...POLICY_DEFAULTS,
    ...basePolicy,
    ...policy
  };

  if (typeof mergedPolicy.commercialUse !== "boolean") {
    throw new Error("policy.commercialUse must be a boolean");
  }

  for (const [field, allowedValues] of Object.entries(POLICY_ALLOWED_VALUES)) {
    if (!allowedValues.includes(mergedPolicy[field])) {
      throw new Error(
        `policy.${field} must be one of: ${allowedValues.join(", ")}`
      );
    }
  }

  mergedPolicy.policyVersion = "v1";
  mergedPolicy.summary = generatePolicySummary(mergedPolicy);

  return mergedPolicy;
};
