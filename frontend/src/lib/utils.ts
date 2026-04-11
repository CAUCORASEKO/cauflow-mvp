export const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(value);

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));

export const formatFileSize = (value: number | null | undefined) => {
  if (!value || value <= 0) {
    return "Unknown size";
  }

  const units = ["B", "KB", "MB", "GB"];
  let normalizedValue = value;
  let unitIndex = 0;

  while (normalizedValue >= 1024 && unitIndex < units.length - 1) {
    normalizedValue /= 1024;
    unitIndex += 1;
  }

  return `${normalizedValue.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

export const humanizeLabel = (value: string) =>
  value
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
