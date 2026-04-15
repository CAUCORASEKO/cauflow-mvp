CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'buyer',
  account_status VARCHAR(50) NOT NULL DEFAULT 'active',
  email_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  public_display_name VARCHAR(255),
  avatar_url VARCHAR(500),
  organization_name VARCHAR(255),
  studio_name VARCHAR(255),
  country VARCHAR(100),
  preferred_currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  wallet_address VARCHAR(255),
  wallet_connection_status VARCHAR(50) NOT NULL DEFAULT 'disconnected',
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS creator_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  payout_onboarding_status VARCHAR(50) NOT NULL DEFAULT 'not_started',
  default_license_type VARCHAR(100),
  default_license_usage VARCHAR(100),
  default_price NUMERIC(10,2),
  tax_reference VARCHAR(255),
  stripe_connect_account_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assets (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url VARCHAR(500),
  visual_type VARCHAR(50) NOT NULL DEFAULT 'photography',
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE assets
ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);

ALTER TABLE assets
ADD COLUMN IF NOT EXISTS visual_type VARCHAR(50) NOT NULL DEFAULT 'photography';

ALTER TABLE assets
ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'draft';

ALTER TABLE assets
ADD COLUMN IF NOT EXISTS review_status VARCHAR(50) NOT NULL DEFAULT 'draft';

ALTER TABLE assets
ADD COLUMN IF NOT EXISTS review_note TEXT;

ALTER TABLE assets
ALTER COLUMN status SET DEFAULT 'draft';

ALTER TABLE assets
ADD COLUMN IF NOT EXISTS owner_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE assets
ADD COLUMN IF NOT EXISTS preview_image_url VARCHAR(500);

ALTER TABLE assets
ADD COLUMN IF NOT EXISTS preview_file_name VARCHAR(255);

ALTER TABLE assets
ADD COLUMN IF NOT EXISTS preview_mime_type VARCHAR(100);

ALTER TABLE assets
ADD COLUMN IF NOT EXISTS preview_file_size BIGINT;

ALTER TABLE assets
ADD COLUMN IF NOT EXISTS preview_width INTEGER;

ALTER TABLE assets
ADD COLUMN IF NOT EXISTS preview_height INTEGER;

ALTER TABLE assets
ADD COLUMN IF NOT EXISTS preview_aspect_ratio VARCHAR(50);

ALTER TABLE assets
ADD COLUMN IF NOT EXISTS preview_resolution_summary VARCHAR(100);

ALTER TABLE assets
ADD COLUMN IF NOT EXISTS master_file_url VARCHAR(500);

ALTER TABLE assets
ADD COLUMN IF NOT EXISTS master_file_name VARCHAR(255);

ALTER TABLE assets
ADD COLUMN IF NOT EXISTS master_mime_type VARCHAR(100);

ALTER TABLE assets
ADD COLUMN IF NOT EXISTS master_file_size BIGINT;

ALTER TABLE assets
ADD COLUMN IF NOT EXISTS master_width INTEGER;

ALTER TABLE assets
ADD COLUMN IF NOT EXISTS master_height INTEGER;

ALTER TABLE assets
ADD COLUMN IF NOT EXISTS master_aspect_ratio VARCHAR(50);

ALTER TABLE assets
ADD COLUMN IF NOT EXISTS master_resolution_summary VARCHAR(100);

UPDATE assets
SET preview_image_url = image_url
WHERE preview_image_url IS NULL AND image_url IS NOT NULL;

UPDATE assets
SET visual_type = 'photography'
WHERE visual_type IS NULL OR trim(visual_type) = '';

UPDATE assets
SET status = 'published'
WHERE status IS NULL OR trim(status) = '';

UPDATE assets
SET review_status = CASE
  WHEN status = 'published' THEN 'approved'
  ELSE 'draft'
END
WHERE review_status IS NULL OR trim(review_status) = '';

CREATE TABLE IF NOT EXISTS licenses (
  id SERIAL PRIMARY KEY,
  asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  usage VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'published',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE licenses
ADD COLUMN IF NOT EXISTS owner_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE licenses
ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'published';

ALTER TABLE licenses
ALTER COLUMN asset_id DROP NOT NULL;

UPDATE licenses
SET status = 'published'
WHERE status IS NULL OR trim(status) = '';

CREATE TABLE IF NOT EXISTS license_policies (
  id SERIAL PRIMARY KEY,
  license_id INTEGER NOT NULL UNIQUE REFERENCES licenses(id) ON DELETE CASCADE,
  commercial_use BOOLEAN NOT NULL DEFAULT false,
  ai_training VARCHAR(50) NOT NULL DEFAULT 'not_allowed',
  derivative_works VARCHAR(50) NOT NULL DEFAULT 'not_allowed',
  attribution VARCHAR(50) NOT NULL DEFAULT 'not_required',
  license_scope VARCHAR(50) NOT NULL DEFAULT 'non_exclusive',
  redistribution VARCHAR(50) NOT NULL DEFAULT 'not_allowed',
  usage_type VARCHAR(50) NOT NULL DEFAULT 'commercial',
  policy_version VARCHAR(20) NOT NULL DEFAULT 'v1',
  summary TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchases (
  id SERIAL PRIMARY KEY,
  license_id INTEGER NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  buyer_email VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE purchases
ADD COLUMN IF NOT EXISTS buyer_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE purchases
ADD COLUMN IF NOT EXISTS creator_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE purchases
ADD COLUMN IF NOT EXISTS asset_id INTEGER REFERENCES assets(id) ON DELETE SET NULL;

ALTER TABLE purchases
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) NOT NULL DEFAULT 'paid';

CREATE TABLE IF NOT EXISTS packs (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  cover_asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
  price NUMERIC(10,2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  category VARCHAR(50) NOT NULL DEFAULT 'visual',
  license_id INTEGER REFERENCES licenses(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE packs
ALTER COLUMN category SET DEFAULT 'mixed_visuals';

ALTER TABLE packs
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE packs
ADD COLUMN IF NOT EXISTS owner_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE purchases
ADD COLUMN IF NOT EXISTS pack_id INTEGER REFERENCES packs(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS pack_assets (
  id SERIAL PRIMARY KEY,
  pack_id INTEGER NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(pack_id, asset_id)
);

ALTER TABLE licenses
ADD COLUMN IF NOT EXISTS source_type VARCHAR(20);

ALTER TABLE licenses
ADD COLUMN IF NOT EXISTS source_asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE;

ALTER TABLE licenses
ADD COLUMN IF NOT EXISTS source_pack_id INTEGER REFERENCES packs(id) ON DELETE CASCADE;

UPDATE licenses
SET source_type = CASE
  WHEN source_pack_id IS NOT NULL THEN 'pack'
  ELSE 'asset'
END
WHERE source_type IS NULL OR trim(source_type) = '';

UPDATE licenses
SET source_asset_id = asset_id
WHERE source_asset_id IS NULL AND asset_id IS NOT NULL;

UPDATE licenses
SET asset_id = source_asset_id
WHERE source_type = 'asset'
  AND source_asset_id IS NOT NULL
  AND asset_id IS DISTINCT FROM source_asset_id;

UPDATE licenses
SET asset_id = NULL
WHERE source_type = 'pack'
  AND asset_id IS NOT NULL;

DO $$
BEGIN
  ALTER TABLE licenses
  ADD CONSTRAINT licenses_source_type_check
  CHECK (source_type IN ('asset', 'pack'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE licenses
  ADD CONSTRAINT licenses_exact_source_target_check
  CHECK (
    (
      CASE WHEN source_asset_id IS NOT NULL THEN 1 ELSE 0 END
      +
      CASE WHEN source_pack_id IS NOT NULL THEN 1 ELSE 0 END
    ) = 1
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE licenses
  ADD CONSTRAINT licenses_source_type_target_match_check
  CHECK (
    (source_type = 'asset' AND source_asset_id IS NOT NULL AND source_pack_id IS NULL)
    OR
    (source_type = 'pack' AND source_pack_id IS NOT NULL AND source_asset_id IS NULL)
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS payment_records (
  id SERIAL PRIMARY KEY,
  buyer_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  creator_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  asset_id INTEGER REFERENCES assets(id) ON DELETE SET NULL,
  pack_id INTEGER REFERENCES packs(id) ON DELETE SET NULL,
  license_id INTEGER REFERENCES licenses(id) ON DELETE SET NULL,
  purchase_id INTEGER REFERENCES purchases(id) ON DELETE SET NULL,
  provider VARCHAR(50) NOT NULL DEFAULT 'stripe_connect',
  provider_session_id VARCHAR(255) NOT NULL UNIQUE,
  amount NUMERIC(10,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  receipt_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS license_grants (
  id SERIAL PRIMARY KEY,
  purchase_id INTEGER NOT NULL UNIQUE REFERENCES purchases(id) ON DELETE CASCADE,
  buyer_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  creator_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  license_id INTEGER NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  asset_id INTEGER REFERENCES assets(id) ON DELETE SET NULL,
  pack_id INTEGER REFERENCES packs(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  download_access BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
