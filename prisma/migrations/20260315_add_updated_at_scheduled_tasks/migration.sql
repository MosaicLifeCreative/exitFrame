-- AlterTable
ALTER TABLE "ayden_scheduled_tasks" ADD COLUMN "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now();
