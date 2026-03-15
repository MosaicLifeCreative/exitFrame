-- CreateTable
CREATE TABLE "ayden_architecture" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "system" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "details" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ayden_architecture_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ayden_architecture_system_key" ON "ayden_architecture"("system");
