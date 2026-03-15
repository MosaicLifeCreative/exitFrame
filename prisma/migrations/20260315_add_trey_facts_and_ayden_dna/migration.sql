-- CreateTable: trey_facts
CREATE TABLE "trey_facts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "detail" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "trey_facts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "trey_facts_key_key" ON "trey_facts"("key");

-- CreateTable: ayden_dna
CREATE TABLE "ayden_dna" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category" TEXT NOT NULL,
    "trait" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "low_label" TEXT NOT NULL,
    "high_label" TEXT NOT NULL,
    "expression" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "ayden_dna_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ayden_dna_trait_key" ON "ayden_dna"("trait");
