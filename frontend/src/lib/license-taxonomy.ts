import { humanizeLabel } from "@/lib/utils";

export type LicenseTaxonomyOption = {
  value: string;
  label: string;
};

export const LICENSE_TYPE_OPTIONS: LicenseTaxonomyOption[] = [
  { value: "Standard", label: "Standard" },
  { value: "Commercial", label: "Commercial" },
  { value: "Premium", label: "Premium" },
  { value: "Editorial", label: "Editorial" },
  { value: "Exclusive", label: "Exclusive" }
];

export const LICENSE_USAGE_OPTIONS: LicenseTaxonomyOption[] = [
  { value: "Web", label: "Web" },
  { value: "Social", label: "Social" },
  { value: "Campaign", label: "Campaign" },
  { value: "Editorial", label: "Editorial" },
  { value: "Print", label: "Print" },
  { value: "Brand use", label: "Brand use" },
  { value: "Internal use", label: "Internal use" }
];

const normalizeTaxonomyValue = (value: string) =>
  value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");

const findMatchingOption = (
  value: string,
  options: LicenseTaxonomyOption[]
) => options.find((option) => normalizeTaxonomyValue(option.value) === normalizeTaxonomyValue(value));

export const getTaxonomySelectionValue = (
  value: string,
  options: LicenseTaxonomyOption[]
) => findMatchingOption(value, options)?.value || "__custom__";

const formatTaxonomyValue = (
  value: string,
  options: LicenseTaxonomyOption[]
) => findMatchingOption(value, options)?.label || humanizeLabel(value);

export const formatLicenseType = (value: string) =>
  formatTaxonomyValue(value, LICENSE_TYPE_OPTIONS);

export const formatLicenseUsage = (value: string) =>
  formatTaxonomyValue(value, LICENSE_USAGE_OPTIONS);

export const formatLicenseSourceType = (value: "asset" | "pack") =>
  value === "pack" ? "Pack" : "Asset";
