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

const getCountValue = (result, key = "value") => Number(result.rows[0]?.[key] || 0);

export const getAssetDeleteDependencyState = async (db, assetId) => {
  const [
    packCoverResult,
    packInclusionResult,
    publishedPackInclusionResult,
    solePackMembershipResult,
    linkedLicenseResult,
    commercialLicenseResult,
    purchaseResult,
    grantResult,
    paymentRecordResult
  ] = await Promise.all([
    db.query(
      `
      SELECT COUNT(*)::int AS value
      FROM packs
      WHERE cover_asset_id = $1
      `,
      [assetId]
    ),
    db.query(
      `
      SELECT COUNT(*)::int AS value
      FROM pack_assets
      WHERE asset_id = $1
      `,
      [assetId]
    ),
    db.query(
      `
      SELECT COUNT(DISTINCT pa.pack_id)::int AS value
      FROM pack_assets pa
      JOIN packs p
        ON p.id = pa.pack_id
      WHERE pa.asset_id = $1
        AND p.status = 'published'
      `,
      [assetId]
    ),
    db.query(
      `
      SELECT COUNT(*)::int AS value
      FROM (
        SELECT pa.pack_id
        FROM pack_assets pa
        WHERE pa.asset_id = $1
        GROUP BY pa.pack_id
        HAVING COUNT(*) FILTER (WHERE pa.asset_id = $1) > 0
           AND COUNT(*) = 1
      ) AS sole_pack_memberships
      `,
      [assetId]
    ),
    db.query(
      `
      SELECT COUNT(*)::int AS value
      FROM licenses
      WHERE COALESCE(source_asset_id, asset_id) = $1
      `,
      [assetId]
    ),
    db.query(
      `
      SELECT COUNT(*)::int AS value
      FROM licenses l
      WHERE COALESCE(l.source_asset_id, l.asset_id) = $1
        AND (
          EXISTS (SELECT 1 FROM purchases p WHERE p.license_id = l.id)
          OR EXISTS (SELECT 1 FROM license_grants lg WHERE lg.license_id = l.id)
          OR EXISTS (SELECT 1 FROM payment_records pr WHERE pr.license_id = l.id)
        )
      `,
      [assetId]
    ),
    db.query(
      `
      SELECT COUNT(*)::int AS value
      FROM purchases
      WHERE asset_id = $1
         OR license_id IN (
           SELECT id
           FROM licenses
           WHERE COALESCE(source_asset_id, asset_id) = $1
         )
      `,
      [assetId]
    ),
    db.query(
      `
      SELECT COUNT(*)::int AS value
      FROM license_grants
      WHERE asset_id = $1
         OR license_id IN (
           SELECT id
           FROM licenses
           WHERE COALESCE(source_asset_id, asset_id) = $1
         )
      `,
      [assetId]
    ),
    db.query(
      `
      SELECT COUNT(*)::int AS value
      FROM payment_records
      WHERE asset_id = $1
         OR license_id IN (
           SELECT id
           FROM licenses
           WHERE COALESCE(source_asset_id, asset_id) = $1
         )
      `,
      [assetId]
    )
  ]);

  const state = {
    packCoverCount: getCountValue(packCoverResult),
    packInclusionCount: getCountValue(packInclusionResult),
    publishedPackInclusionCount: getCountValue(publishedPackInclusionResult),
    solePackMembershipCount: getCountValue(solePackMembershipResult),
    linkedLicenseCount: getCountValue(linkedLicenseResult),
    commerciallyUsedLicenseCount: getCountValue(commercialLicenseResult),
    purchaseCount: getCountValue(purchaseResult),
    grantCount: getCountValue(grantResult),
    paymentRecordCount: getCountValue(paymentRecordResult)
  };

  return {
    ...state,
    hasCommercialHistory:
      state.purchaseCount > 0 ||
      state.grantCount > 0 ||
      state.paymentRecordCount > 0 ||
      state.commerciallyUsedLicenseCount > 0,
    hasUnsafePackDependency:
      state.packCoverCount > 0 ||
      state.publishedPackInclusionCount > 0 ||
      state.solePackMembershipCount > 0,
    canDelete:
      state.purchaseCount === 0 &&
      state.grantCount === 0 &&
      state.paymentRecordCount === 0 &&
      state.commerciallyUsedLicenseCount === 0 &&
      state.packCoverCount === 0 &&
      state.publishedPackInclusionCount === 0 &&
      state.solePackMembershipCount === 0
  };
};

export const getPackDeleteDependencyState = async (db, packId) => {
  const [licenseResult, purchaseResult, grantResult, paymentRecordResult, commercialLicenseResult] =
    await Promise.all([
      db.query(
        `
        SELECT COUNT(*)::int AS value
        FROM licenses
        WHERE source_pack_id = $1
        `,
        [packId]
      ),
      db.query(
        `
        SELECT COUNT(*)::int AS value
        FROM purchases
        WHERE pack_id = $1
           OR license_id IN (
             SELECT id
             FROM licenses
             WHERE source_pack_id = $1
           )
        `,
        [packId]
      ),
      db.query(
        `
        SELECT COUNT(*)::int AS value
        FROM license_grants
        WHERE pack_id = $1
           OR license_id IN (
             SELECT id
             FROM licenses
             WHERE source_pack_id = $1
           )
        `,
        [packId]
      ),
      db.query(
        `
        SELECT COUNT(*)::int AS value
        FROM payment_records
        WHERE pack_id = $1
           OR license_id IN (
             SELECT id
             FROM licenses
             WHERE source_pack_id = $1
           )
        `,
        [packId]
      ),
      db.query(
        `
        SELECT COUNT(*)::int AS value
        FROM licenses l
        WHERE l.source_pack_id = $1
          AND (
            EXISTS (SELECT 1 FROM purchases p WHERE p.license_id = l.id)
            OR EXISTS (SELECT 1 FROM license_grants lg WHERE lg.license_id = l.id)
            OR EXISTS (SELECT 1 FROM payment_records pr WHERE pr.license_id = l.id)
          )
        `,
        [packId]
      )
    ]);

  const state = {
    licenseCount: getCountValue(licenseResult),
    commerciallyUsedLicenseCount: getCountValue(commercialLicenseResult),
    purchaseCount: getCountValue(purchaseResult),
    grantCount: getCountValue(grantResult),
    paymentRecordCount: getCountValue(paymentRecordResult)
  };

  return {
    ...state,
    canDelete:
      state.purchaseCount === 0 &&
      state.grantCount === 0 &&
      state.paymentRecordCount === 0 &&
      state.commerciallyUsedLicenseCount === 0
  };
};

export const getLicenseDeleteDependencyState = async (db, licenseId) => {
  const [packResult, purchaseResult, grantResult, paymentRecordResult] = await Promise.all([
    db.query(
      `
      SELECT COUNT(*)::int AS value
      FROM packs
      WHERE license_id = $1
      `,
      [licenseId]
    ),
    db.query(
      `
      SELECT COUNT(*)::int AS value
      FROM purchases
      WHERE license_id = $1
      `,
      [licenseId]
    ),
    db.query(
      `
      SELECT COUNT(*)::int AS value
      FROM license_grants
      WHERE license_id = $1
      `,
      [licenseId]
    ),
    db.query(
      `
      SELECT COUNT(*)::int AS value
      FROM payment_records
      WHERE license_id = $1
      `,
      [licenseId]
    )
  ]);

  const state = {
    packCount: getCountValue(packResult),
    purchaseCount: getCountValue(purchaseResult),
    grantCount: getCountValue(grantResult),
    paymentRecordCount: getCountValue(paymentRecordResult)
  };

  return {
    ...state,
    canDelete:
      state.purchaseCount === 0 &&
      state.grantCount === 0 &&
      state.paymentRecordCount === 0
  };
};

export const buildAssetDeleteBlockMessage = ({
  packCoverCount,
  publishedPackInclusionCount,
  solePackMembershipCount,
  commerciallyUsedLicenseCount,
  purchaseCount,
  grantCount,
  paymentRecordCount
}) => {
  const commercialSegments = [];
  const structureSegments = [];

  if (purchaseCount > 0) {
    commercialSegments.push(formatDependencySegment(purchaseCount, "purchase record"));
  }

  if (grantCount > 0) {
    commercialSegments.push(formatDependencySegment(grantCount, "license grant"));
  }

  if (paymentRecordCount > 0) {
    commercialSegments.push(formatDependencySegment(paymentRecordCount, "payment record"));
  }

  if (commerciallyUsedLicenseCount > 0) {
    commercialSegments.push(
      formatDependencySegment(commerciallyUsedLicenseCount, "commercially used license")
    );
  }

  if (packCoverCount > 0) {
    structureSegments.push(formatDependencySegment(packCoverCount, "pack cover"));
  }

  if (publishedPackInclusionCount > 0) {
    structureSegments.push(
      formatDependencySegment(publishedPackInclusionCount, "published pack dependency")
    );
  }

  if (solePackMembershipCount > 0) {
    structureSegments.push(
      formatDependencySegment(solePackMembershipCount, "single-asset pack dependency")
    );
  }

  if (commercialSegments.length > 0) {
    return `This asset has already been used in commercial activity and can no longer be deleted. CauFlow found ${formatDependencySummary(
      commercialSegments
    )}. Archive or unpublish it instead.`;
  }

  return `This asset cannot be hard-deleted yet because it is still required by ${formatDependencySummary(
    structureSegments
  )}. Update the pack relationship first, then delete the asset.`;
};

export const buildPackDeleteBlockMessage = ({
  purchaseCount,
  grantCount,
  paymentRecordCount,
  commerciallyUsedLicenseCount
}) => {
  const segments = [];

  if (purchaseCount > 0) {
    segments.push(formatDependencySegment(purchaseCount, "purchase record"));
  }

  if (grantCount > 0) {
    segments.push(formatDependencySegment(grantCount, "license grant"));
  }

  if (paymentRecordCount > 0) {
    segments.push(formatDependencySegment(paymentRecordCount, "payment record"));
  }

  if (commerciallyUsedLicenseCount > 0) {
    segments.push(formatDependencySegment(commerciallyUsedLicenseCount, "commercially used license"));
  }

  return `This pack is tied to commercial history through ${formatDependencySummary(
    segments
  )} and can no longer be deleted. Archive or unpublish it instead.`;
};

export const buildLicenseDeleteBlockMessage = ({
  purchaseCount,
  grantCount,
  paymentRecordCount
}) => {
  const segments = [];

  if (purchaseCount > 0) {
    segments.push(formatDependencySegment(purchaseCount, "purchase record"));
  }

  if (grantCount > 0) {
    segments.push(formatDependencySegment(grantCount, "granted right"));
  }

  if (paymentRecordCount > 0) {
    segments.push(formatDependencySegment(paymentRecordCount, "payment record"));
  }

  return `This license is preserved because buyers already acquired rights through ${formatDependencySummary(
    segments
  )}. Archive or unpublish it instead of deleting it.`;
};
