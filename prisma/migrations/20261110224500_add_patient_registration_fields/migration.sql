ALTER TABLE "patients"
ADD COLUMN "patientNumber" TEXT,
ADD COLUMN "nic" TEXT,
ADD COLUMN "passportNumber" TEXT,
ADD COLUMN "phone" TEXT,
ADD COLUMN "email" TEXT;

UPDATE "patients"
SET "patientNumber" = 'HMS-LEGACY-' || "id"::TEXT
WHERE "patientNumber" IS NULL;

ALTER TABLE "patients"
ALTER COLUMN "patientNumber" SET NOT NULL;

CREATE UNIQUE INDEX "patients_patientNumber_key" ON "patients"("patientNumber");
CREATE UNIQUE INDEX "patients_nic_key" ON "patients"("nic");
CREATE UNIQUE INDEX "patients_passportNumber_key" ON "patients"("passportNumber");
