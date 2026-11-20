-- Track whether each listing's description is the complete posting.
ALTER TABLE "Job" ADD COLUMN "descriptionFull" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Job" ADD COLUMN "descriptionCheckedAt" TIMESTAMP(3);
ALTER TABLE "Job" ADD COLUMN "descriptionTries" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Job_descriptionFull_lastSeenAt_idx" ON "Job"("descriptionFull", "lastSeenAt");

-- Existing listings: feeds that publish the whole posting are already complete;
-- snippet feeds (Adzuna, Jooble) are complete only where the original posting was found.
UPDATE "Job" SET "descriptionFull" = true
WHERE "source" NOT IN ('adzuna', 'jooble', 'demo') AND length("description") >= 400;

UPDATE "Job" SET "descriptionFull" = true, "description" = ("enrichment"::jsonb ->> 'fullDescription')
WHERE "enrichment" IS NOT NULL
  AND "enrichment" LIKE '{%'
  AND ("enrichment"::jsonb ->> 'fullDescription') IS NOT NULL
  AND length("enrichment"::jsonb ->> 'fullDescription') > length("description");
