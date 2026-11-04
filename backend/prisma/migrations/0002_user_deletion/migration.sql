-- A conta excluída sai da gestão de equipe; seus vínculos comerciais são preservados.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ(6);
CREATE INDEX IF NOT EXISTS "users_deleted_at_idx" ON "users"("deleted_at");
