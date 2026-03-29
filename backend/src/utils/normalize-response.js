const toCamelCase = (key) =>
  key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

const normalizeRow = (row) => {
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    return row;
  }

  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [toCamelCase(key), value])
  );
};

export const normalizeResponseData = (data) => {
  if (Array.isArray(data)) {
    return data.map(normalizeRow);
  }

  return normalizeRow(data);
};
