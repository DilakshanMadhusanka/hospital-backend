-- CreateEnum
DO $$
BEGIN
    CREATE TYPE "IPDAdmissionStatus" AS ENUM ('ADMITTED', 'DISCHARGED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "IPDAdmission" (
    "id" TEXT NOT NULL,
    "admissionNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "admittedById" TEXT NOT NULL,
    "attendingDoctorId" TEXT,
    "admissionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dischargeDate" TIMESTAMP(3),
    "status" "IPDAdmissionStatus" NOT NULL DEFAULT 'ADMITTED',
    "admissionReason" TEXT NOT NULL,
    "admissionDiagnosis" TEXT,
    "clinicalNotes" TEXT,
    "dischargeSummary" TEXT,
    "dischargeInstructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dischargedAt" TIMESTAMP(3),
    "dischargedById" UUID,

    CONSTRAINT "IPDAdmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "IPDAdmission_admissionNumber_key" ON "IPDAdmission"("admissionNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IPDAdmission_hospitalId_status_idx" ON "IPDAdmission"("hospitalId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IPDAdmission_patientId_idx" ON "IPDAdmission"("patientId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IPDAdmission_departmentId_admissionDate_idx" ON "IPDAdmission"("departmentId", "admissionDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IPDAdmission_attendingDoctorId_idx" ON "IPDAdmission"("attendingDoctorId");
