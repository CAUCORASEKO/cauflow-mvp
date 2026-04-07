const formatDependencySegment = (count, singular, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`;

export const formatDependencySummary = (segments) => {
  if (segments.length === 0) {
    return "";
  }

  if (segments.length === 1) {
    return segments[0];
  }

  if (segments.length === 2) {
    return `${segments[0]} and ${segments[1]}`;
  }

  return `${segments.slice(0, -1).join(", ")}, and ${segments[segments.length - 1]}`;
};

export const buildAssetDeleteBlockMessage = ({
  packCoverCount,
  packInclusionCount,
  licenseCount,
  purchaseCount,
  grantCount
}) => {
  const segments = [];

  if (packCoverCount > 0) {
    segments.push(formatDependencySegment(packCoverCount, "pack cover"));
  }

  if (packInclusionCount > 0) {
    segments.push(formatDependencySegment(packInclusionCount, "pack inclusion"));
  }

  if (licenseCount > 0) {
    segments.push(formatDependencySegment(licenseCount, "linked license"));
  }

  if (purchaseCount > 0) {
    segments.push(formatDependencySegment(purchaseCount, "purchase record"));
  }

  if (grantCount > 0) {
    segments.push(formatDependencySegment(grantCount, "active or historical grant"));
  }

  return `This asset cannot be deleted because it is referenced by ${formatDependencySummary(
    segments
  )}. Remove the dependency before deleting.`;
};

export const buildPackDeleteBlockMessage = ({ purchaseCount, grantCount }) => {
  const segments = [];

  if (purchaseCount > 0) {
    segments.push(formatDependencySegment(purchaseCount, "purchase record"));
  }

  if (grantCount > 0) {
    segments.push(formatDependencySegment(grantCount, "license grant"));
  }

  return `This pack cannot be deleted because it is referenced by ${formatDependencySummary(
    segments
  )}. Commercial history must stay intact.`;
};

export const buildLicenseDeleteBlockMessage = ({
  packCount,
  purchaseCount,
  grantCount
}) => {
  const segments = [];

  if (packCount > 0) {
    segments.push(formatDependencySegment(packCount, "pack"));
  }

  if (purchaseCount > 0) {
    segments.push(formatDependencySegment(purchaseCount, "purchase record"));
  }

  if (grantCount > 0) {
    segments.push(formatDependencySegment(grantCount, "license grant"));
  }

  return `This license cannot be deleted because it is referenced by ${formatDependencySummary(
    segments
  )}. Remove the dependency before deleting.`;
};
