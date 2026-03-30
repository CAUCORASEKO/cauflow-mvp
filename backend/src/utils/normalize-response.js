const isPlainObject = (value) => {
  if (value === null || typeof value !== "object") return false;
  return Object.getPrototypeOf(value) === Object.prototype;
};

const toCamelCase = (str) =>
  str.replace(/_([a-z])/g, (_, char) => char.toUpperCase());

export const normalizeResponseData = (value) => {
  if (value === null || value === undefined) return value;

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(normalizeResponseData);
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [
        toCamelCase(key),
        normalizeResponseData(val),
      ])
    );
  }

  return value;
};
