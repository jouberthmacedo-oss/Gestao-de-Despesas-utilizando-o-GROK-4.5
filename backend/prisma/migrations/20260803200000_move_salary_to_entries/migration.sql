/* Transfer the disconnected legacy salary before removing the column. */
INSERT INTO "Entry" ("id", "userId", "name", "amount", "type", "frequency", "date", "createdAt", "updatedAt")
SELECT
  md5('legacy-salary:' || "User"."id"),
  "User"."id",
  'Salario',
  "User"."salary",
  'salario'::"EntryType",
  'mensal'::"EntryFrequency",
  NULL,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "User"
WHERE "User"."salary" > 0
  AND NOT EXISTS (
    SELECT 1
    FROM "Entry"
    WHERE "Entry"."userId" = "User"."id"
      AND "Entry"."type" = 'salario'::"EntryType"
      AND "Entry"."frequency" = 'mensal'::"EntryFrequency"
  );

ALTER TABLE "User" DROP COLUMN "salary";
