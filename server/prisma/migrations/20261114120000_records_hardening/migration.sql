-- Records hardening: evidence rows cannot be cascade-deleted, soft delete on users/properties/
-- listings, timestamptz everywhere, inet IPs, a hash-chained append-only audit log and an
-- append-only interest status history.

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_actor_id_fkey";

-- DropForeignKey
ALTER TABLE "character_reports" DROP CONSTRAINT "character_reports_interest_id_fkey";

-- DropForeignKey
ALTER TABLE "consents" DROP CONSTRAINT "consents_user_id_fkey";

-- DropForeignKey
ALTER TABLE "interests" DROP CONSTRAINT "interests_listing_id_fkey";

-- DropForeignKey
ALTER TABLE "interests" DROP CONSTRAINT "interests_seeker_id_fkey";

-- DropForeignKey
ALTER TABLE "landlord_terms" DROP CONSTRAINT "landlord_terms_listing_id_fkey";

-- DropForeignKey
ALTER TABLE "listings" DROP CONSTRAINT "listings_property_id_fkey";

-- DropForeignKey
ALTER TABLE "properties" DROP CONSTRAINT "properties_lister_id_fkey";

-- DropForeignKey
ALTER TABLE "report_access_logs" DROP CONSTRAINT "report_access_logs_accessed_by_fkey";

-- DropForeignKey
ALTER TABLE "report_access_logs" DROP CONSTRAINT "report_access_logs_report_id_fkey";

-- DropForeignKey
ALTER TABLE "terms_acceptances" DROP CONSTRAINT "terms_acceptances_terms_id_fkey";

-- DropForeignKey
ALTER TABLE "terms_acceptances" DROP CONSTRAINT "terms_acceptances_user_id_fkey";

-- DropForeignKey
ALTER TABLE "verifications" DROP CONSTRAINT "verifications_submitted_by_fkey";

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "hash" TEXT,
ADD COLUMN     "prev_hash" TEXT,
ADD COLUMN     "request_id" TEXT,
ADD COLUMN     "seq" BIGINT,
ADD COLUMN     "user_agent" TEXT,
ALTER COLUMN "ip" SET DATA TYPE INET USING NULLIF("ip", '')::inet,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "character_reports" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "consents" ALTER COLUMN "accepted_at" SET DATA TYPE TIMESTAMPTZ(3) USING "accepted_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "interests" ALTER COLUMN "terms_accepted_at" SET DATA TYPE TIMESTAMPTZ(3) USING "terms_accepted_at" AT TIME ZONE 'UTC',
ALTER COLUMN "decided_at" SET DATA TYPE TIMESTAMPTZ(3) USING "decided_at" AT TIME ZONE 'UTC',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "landlord_terms" ALTER COLUMN "effective_at" SET DATA TYPE TIMESTAMPTZ(3) USING "effective_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "deleted_at" TIMESTAMPTZ(3),
ALTER COLUMN "published_at" SET DATA TYPE TIMESTAMPTZ(3) USING "published_at" AT TIME ZONE 'UTC',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "notifications" ALTER COLUMN "read_at" SET DATA TYPE TIMESTAMPTZ(3) USING "read_at" AT TIME ZONE 'UTC',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "otp_codes" ALTER COLUMN "expires_at" SET DATA TYPE TIMESTAMPTZ(3) USING "expires_at" AT TIME ZONE 'UTC',
ALTER COLUMN "consumed_at" SET DATA TYPE TIMESTAMPTZ(3) USING "consumed_at" AT TIME ZONE 'UTC',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "deleted_at" TIMESTAMPTZ(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "report_access_logs" ALTER COLUMN "accessed_at" SET DATA TYPE TIMESTAMPTZ(3) USING "accessed_at" AT TIME ZONE 'UTC',
ALTER COLUMN "ip" SET DATA TYPE INET USING NULLIF("ip", '')::inet;

-- AlterTable
ALTER TABLE "saved_listings" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "terms_acceptances" ALTER COLUMN "accepted_at" SET DATA TYPE TIMESTAMPTZ(3) USING "accepted_at" AT TIME ZONE 'UTC',
ALTER COLUMN "ip" SET DATA TYPE INET USING NULLIF("ip", '')::inet;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deleted_at" TIMESTAMPTZ(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "verifications" ALTER COLUMN "reviewed_at" SET DATA TYPE TIMESTAMPTZ(3) USING "reviewed_at" AT TIME ZONE 'UTC',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

-- CreateTable
CREATE TABLE "interest_status_history" (
    "id" UUID NOT NULL,
    "seq" BIGSERIAL NOT NULL,
    "interest_id" UUID NOT NULL,
    "from_status" "InterestStatus",
    "to_status" "InterestStatus" NOT NULL,
    "actor_id" UUID,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interest_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "interest_status_history_seq_key" ON "interest_status_history"("seq");

-- CreateIndex
CREATE INDEX "interest_status_history_interest_id_created_at_idx" ON "interest_status_history"("interest_id", "created_at");


-- AddForeignKey
ALTER TABLE "consents" ADD CONSTRAINT "consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_lister_id_fkey" FOREIGN KEY ("lister_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landlord_terms" ADD CONSTRAINT "landlord_terms_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terms_acceptances" ADD CONSTRAINT "terms_acceptances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terms_acceptances" ADD CONSTRAINT "terms_acceptances_terms_id_fkey" FOREIGN KEY ("terms_id") REFERENCES "landlord_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interests" ADD CONSTRAINT "interests_seeker_id_fkey" FOREIGN KEY ("seeker_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interests" ADD CONSTRAINT "interests_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interest_status_history" ADD CONSTRAINT "interest_status_history_interest_id_fkey" FOREIGN KEY ("interest_id") REFERENCES "interests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interest_status_history" ADD CONSTRAINT "interest_status_history_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_reports" ADD CONSTRAINT "character_reports_interest_id_fkey" FOREIGN KEY ("interest_id") REFERENCES "interests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_access_logs" ADD CONSTRAINT "report_access_logs_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "character_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_access_logs" ADD CONSTRAINT "report_access_logs_accessed_by_fkey" FOREIGN KEY ("accessed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Audit log hash chain
-- ---------------------------------------------------------------------------

-- The hash covers every column except hash itself, chained to the previous row's hash.
CREATE FUNCTION audit_row_hash(prev TEXT, r audit_logs) RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
  SELECT encode(sha256(convert_to(concat_ws('|',
    coalesce(prev, ''),
    r.seq::text,
    r.id::text,
    coalesce(r.actor_id::text, ''),
    r.action,
    r.entity_type,
    r.entity_id,
    coalesce(r.before::text, ''),
    coalesce(r.after::text, ''),
    coalesce(host(r.ip), ''),
    coalesce(r.request_id, ''),
    coalesce(r.user_agent, ''),
    (extract(epoch FROM date_trunc('milliseconds', r.created_at)) * 1000)::bigint::text
  ), 'UTF8')), 'hex')
$$;

-- Number and chain the existing rows in insertion order.
CREATE SEQUENCE "audit_logs_seq_seq" AS BIGINT;

DO $$
DECLARE
  r audit_logs;
  prev TEXT := NULL;
BEGIN
  FOR r IN SELECT * FROM audit_logs ORDER BY created_at, ctid LOOP
    r.seq := nextval('audit_logs_seq_seq');
    r.prev_hash := prev;
    r.hash := audit_row_hash(prev, r);
    UPDATE audit_logs SET seq = r.seq, prev_hash = r.prev_hash, hash = r.hash WHERE id = r.id;
    prev := r.hash;
  END LOOP;
END $$;

ALTER TABLE "audit_logs" ALTER COLUMN "seq" SET DEFAULT nextval('audit_logs_seq_seq'),
ALTER COLUMN "seq" SET NOT NULL;
ALTER SEQUENCE "audit_logs_seq_seq" OWNED BY "audit_logs"."seq";
CREATE UNIQUE INDEX "audit_logs_seq_key" ON "audit_logs"("seq");

-- Inserts are serialised with a transaction-level lock, and seq is taken after the lock, so
-- seq order is commit order and each row chains onto the one committed before it.
CREATE FUNCTION audit_logs_chain() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  prev TEXT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('rentrust.audit_logs'));
  NEW.seq := nextval('audit_logs_seq_seq');
  SELECT hash INTO prev FROM audit_logs ORDER BY seq DESC LIMIT 1;
  NEW.prev_hash := prev;
  NEW.hash := audit_row_hash(prev, NEW);
  RETURN NEW;
END $$;

CREATE TRIGGER audit_logs_chain BEFORE INSERT ON audit_logs
FOR EACH ROW EXECUTE FUNCTION audit_logs_chain();

-- Returns every row whose link or hash doesn't match. An empty result means the chain is intact.
CREATE FUNCTION audit_chain_breaks() RETURNS TABLE (seq BIGINT, problem TEXT)
LANGUAGE sql STABLE AS $$
  WITH c AS (
    SELECT a.seq, a.hash, a.prev_hash,
           lag(a.hash) OVER (ORDER BY a.seq) AS expected_prev,
           a AS row
    FROM audit_logs a
  )
  SELECT c.seq,
         CASE WHEN c.prev_hash IS DISTINCT FROM c.expected_prev THEN 'prev_hash does not match the previous row'
              ELSE 'hash does not match the row contents' END
  FROM c
  WHERE c.prev_hash IS DISTINCT FROM c.expected_prev
     OR c.hash IS DISTINCT FROM audit_row_hash(c.expected_prev, c.row)
  ORDER BY c.seq
$$;

-- ---------------------------------------------------------------------------
-- Append-only tables
-- ---------------------------------------------------------------------------

CREATE FUNCTION forbid_change() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only: % is not allowed', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'insufficient_privilege';
END $$;

CREATE TRIGGER audit_logs_append_only BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION forbid_change();
CREATE TRIGGER audit_logs_no_truncate BEFORE TRUNCATE ON audit_logs
FOR EACH STATEMENT EXECUTE FUNCTION forbid_change();

CREATE TRIGGER report_access_logs_append_only BEFORE UPDATE OR DELETE ON report_access_logs
FOR EACH ROW EXECUTE FUNCTION forbid_change();
CREATE TRIGGER report_access_logs_no_truncate BEFORE TRUNCATE ON report_access_logs
FOR EACH STATEMENT EXECUTE FUNCTION forbid_change();

-- Backfill interest history from the audit trail, then lock it.
INSERT INTO interest_status_history (id, interest_id, from_status, to_status, actor_id, created_at)
SELECT gen_random_uuid(),
       a.entity_id::uuid,
       (a.before ->> 'status')::"InterestStatus",
       (a.after ->> 'status')::"InterestStatus",
       a.actor_id,
       a.created_at
FROM audit_logs a
WHERE a.entity_type = 'Interest'
  AND a.action LIKE 'interest.%'
  AND a.after ->> 'status' IS NOT NULL
  AND EXISTS (SELECT 1 FROM interests i WHERE i.id::text = a.entity_id)
ORDER BY a.seq;

CREATE TRIGGER interest_status_history_append_only BEFORE UPDATE OR DELETE ON interest_status_history
FOR EACH ROW EXECUTE FUNCTION forbid_change();
CREATE TRIGGER interest_status_history_no_truncate BEFORE TRUNCATE ON interest_status_history
FOR EACH STATEMENT EXECUTE FUNCTION forbid_change();
