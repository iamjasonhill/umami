-- AlterTable
ALTER TABLE "session"
  ADD COLUMN "raw_source" VARCHAR(128),
  ADD COLUMN "raw_medium" VARCHAR(64),
  ADD COLUMN "raw_campaign" VARCHAR(128),
  ADD COLUMN "raw_content" VARCHAR(128),
  ADD COLUMN "raw_term" VARCHAR(128),
  ADD COLUMN "raw_referrer_domain" VARCHAR(255),
  ADD COLUMN "raw_referrer_path" VARCHAR(512),
  ADD COLUMN "user_agent" VARCHAR(512),
  ADD COLUMN "attribution_version" INTEGER,
  ADD COLUMN "channel_first" VARCHAR(32),
  ADD COLUMN "channel_last" VARCHAR(32),
  ADD COLUMN "channel_strength_first" SMALLINT,
  ADD COLUMN "channel_strength_last" SMALLINT,
  ADD COLUMN "channel_reason" JSONB;

-- CreateIndex
CREATE INDEX "session_website_id_channel_last_idx"
  ON "session"("website_id", "channel_last");

-- CreateIndex
CREATE INDEX "session_website_id_attribution_version_idx"
  ON "session"("website_id", "attribution_version");

-- CreateTable
CREATE TABLE "attribution_config" (
  "id" SERIAL PRIMARY KEY,
  "version" INTEGER NOT NULL,
  "yaml" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "attribution_config_version_key" ON "attribution_config"("version");

-- CreateIndex
CREATE INDEX "attribution_config_active_idx" ON "attribution_config"("active");

-- CreateTable
CREATE TABLE "link_registry" (
  "link_registry_id" BIGSERIAL PRIMARY KEY,
  "short_id" VARCHAR(16) NOT NULL,
  "url" TEXT NOT NULL,
  "owner" VARCHAR(100),
  "tags" TEXT[] NOT NULL DEFAULT '{}',
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "link_registry_short_id_key" ON "link_registry"("short_id");

-- CreateIndex
CREATE INDEX "link_registry_owner_idx" ON "link_registry"("owner");
