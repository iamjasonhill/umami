-- CreateTable
CREATE TABLE "goal" (
    "goal_id" UUID NOT NULL,
    "website_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "value" VARCHAR(500) NOT NULL,
    "operator" VARCHAR(50),
    "property" VARCHAR(500),
    "target_value" DECIMAL(19,4),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "goal_pkey" PRIMARY KEY ("goal_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "goal_goal_id_key" ON "goal"("goal_id");

-- CreateIndex
CREATE INDEX "goal_website_id_idx" ON "goal"("website_id");
