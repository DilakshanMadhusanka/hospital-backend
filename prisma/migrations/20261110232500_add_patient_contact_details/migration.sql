ALTER TABLE "patient_contacts"
ADD COLUMN "name" TEXT,
ADD COLUMN "relationship" TEXT,
ADD COLUMN "isEmergency" BOOLEAN NOT NULL DEFAULT false;
