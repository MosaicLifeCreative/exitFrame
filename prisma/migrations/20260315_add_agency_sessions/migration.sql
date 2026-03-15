-- CreateTable
CREATE TABLE "ayden_agency_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "trigger" TEXT,
    "tool_calls" JSONB NOT NULL DEFAULT '[]',
    "final_text" TEXT NOT NULL,
    "tools_used" TEXT[] NOT NULL DEFAULT '{}',
    "rounds" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "ayden_agency_sessions_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "ayden_agency_actions" ADD COLUMN "session_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "ayden_agency_actions_session_id_key" ON "ayden_agency_actions"("session_id");

-- AddForeignKey
ALTER TABLE "ayden_agency_actions" ADD CONSTRAINT "ayden_agency_actions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "ayden_agency_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
