-- CreateEnum
CREATE TYPE "MaintenanceRequestType" AS ENUM ('ASSET', 'FACILITY');

-- CreateEnum
CREATE TYPE "MaintenancePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('REPORTED', 'UNDER_REVIEW', 'APPROVED', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MaintenanceWorkType" AS ENUM ('INSPECTION', 'REPAIR', 'PREVENTIVE', 'REPLACEMENT', 'TESTING');

-- CreateEnum
CREATE TYPE "MaintenancePartType" AS ENUM ('SPARE_PART', 'CONSUMABLE', 'OTHER');

-- CreateEnum
CREATE TYPE "HospitalAssetStatus" AS ENUM ('AVAILABLE', 'IN_USE', 'UNDER_MAINTENANCE', 'OUT_OF_SERVICE', 'LOST', 'DISPOSED');

-- CreateEnum
CREATE TYPE "HospitalAssetCondition" AS ENUM ('NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED');

-- CreateEnum
CREATE TYPE "AssetMovementType" AS ENUM ('INITIAL_REGISTRATION', 'ASSIGNMENT', 'TRANSFER', 'RETURN', 'MAINTENANCE', 'MAINTENANCE_COMPLETED', 'DISPOSAL');

-- CreateEnum
CREATE TYPE "StaffLeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StaffLeaveCategory" AS ENUM ('ANNUAL', 'CASUAL', 'MEDICAL', 'MATERNITY', 'NO_PAY', 'OTHER');

-- CreateEnum
CREATE TYPE "StaffAttendanceStatus" AS ENUM ('PRESENT', 'LATE', 'ABSENT');

-- CreateEnum
CREATE TYPE "StaffDutyStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EmergencyDispositionType" AS ENUM ('ADMITTED', 'TRANSFERRED', 'DISCHARGED', 'DECEASED', 'LEFT_WITHOUT_BEING_SEEN');

-- CreateEnum
CREATE TYPE "EmergencyAssessmentType" AS ENUM ('INITIAL', 'REASSESSMENT');

-- CreateEnum
CREATE TYPE "EmergencyArrivalMode" AS ENUM ('WALK_IN', 'AMBULANCE', 'POLICE', 'HOSPITAL_REFERRAL', 'OTHER');

-- CreateEnum
CREATE TYPE "EmergencyEncounterStatus" AS ENUM ('REGISTERED', 'TRIAGED', 'WAITING', 'CALLED', 'IN_TREATMENT', 'ADMITTED', 'TRANSFERRED', 'DISCHARGED', 'LEFT_WITHOUT_BEING_SEEN', 'DECEASED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EmergencyTriageCategory" AS ENUM ('RESUSCITATION', 'EMERGENCY', 'URGENT', 'LESS_URGENT', 'NON_URGENT');

-- CreateEnum
CREATE TYPE "IPDDischargeStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "IPDTransferStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ImagingModality" AS ENUM ('XRAY', 'ULTRASOUND', 'CT', 'MRI', 'MAMMOGRAPHY', 'FLUOROSCOPY', 'DEXA', 'OTHER');

-- CreateEnum
CREATE TYPE "RadiologyProcedureStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ImagingEquipmentStatus" AS ENUM ('OPERATIONAL', 'MAINTENANCE', 'OUT_OF_SERVICE');

-- CreateEnum
CREATE TYPE "RadiologyRequestStatus" AS ENUM ('REQUESTED', 'ACCEPTED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RadiologyPriority" AS ENUM ('ROUTINE', 'URGENT', 'STAT');

-- CreateEnum
CREATE TYPE "RadiologyAppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "RadiologyReportStatus" AS ENUM ('DRAFT', 'VERIFIED', 'AMENDED');

-- CreateEnum
CREATE TYPE "MedicineStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('PURCHASE', 'DISPENSE', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'EXPIRED', 'RETURN');

-- CreateEnum
CREATE TYPE "PharmacyDispenseStatus" AS ENUM ('COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LabRequestStatus" AS ENUM ('REQUESTED', 'ACCEPTED', 'IN_PROGRESS', 'PARTIALLY_COMPLETED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LabRequestItemStatus" AS ENUM ('REQUESTED', 'SAMPLE_COLLECTED', 'PROCESSING', 'RESULT_ENTERED', 'VERIFIED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LabSampleStatus" AS ENUM ('COLLECTED', 'RECEIVED', 'REJECTED', 'PROCESSED');

-- CreateEnum
CREATE TYPE "LabResultStatus" AS ENUM ('DRAFT', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LabPriority" AS ENUM ('ROUTINE', 'URGENT', 'STAT');

-- CreateEnum
CREATE TYPE "IPDObservationType" AS ENUM ('ROUTINE', 'DOCTOR_REVIEW', 'EMERGENCY');

-- DropForeignKey
ALTER TABLE "Prescription" DROP CONSTRAINT "Prescription_visitId_fkey";

-- AlterTable
ALTER TABLE "IPDAdmission"
ALTER COLUMN "patientId" TYPE UUID USING "patientId"::uuid,
ALTER COLUMN "hospitalId" TYPE UUID USING "hospitalId"::uuid,
ALTER COLUMN "departmentId" TYPE UUID USING "departmentId"::uuid,
ALTER COLUMN "admittedById" TYPE UUID USING "admittedById"::uuid,
ALTER COLUMN "attendingDoctorId" TYPE UUID USING "attendingDoctorId"::uuid;

-- AlterTable
ALTER TABLE "Prescription" ADD COLUMN     "emergencyEncounterId" UUID,
ALTER COLUMN "visitId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "PrescriptionItem" ADD COLUMN     "medicineId" TEXT;

-- CreateTable
CREATE TABLE "IPDBedAllocation" (
    "id" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "bedId" UUID NOT NULL,
    "allocatedById" UUID NOT NULL,
    "releasedById" UUID,
    "allocatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),

    CONSTRAINT "IPDBedAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IPDObservation" (
    "id" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "type" "IPDObservationType" NOT NULL DEFAULT 'ROUTINE',
    "temperature" DOUBLE PRECISION,
    "systolicBP" INTEGER,
    "diastolicBP" INTEGER,
    "pulseRate" INTEGER,
    "respiratoryRate" INTEGER,
    "oxygenSaturation" DOUBLE PRECISION,
    "weightKg" DOUBLE PRECISION,
    "notes" TEXT,
    "recordedById" UUID NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IPDObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IPDNursingNote" (
    "id" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "careProvided" TEXT,
    "recordedById" UUID NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IPDNursingNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabTest" (
    "id" TEXT NOT NULL,
    "hospitalId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "specimenType" TEXT NOT NULL,
    "unit" TEXT,
    "referenceRange" TEXT,
    "price" DECIMAL(10,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabRequest" (
    "id" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "patientId" UUID NOT NULL,
    "hospitalId" UUID NOT NULL,
    "departmentId" UUID NOT NULL,
    "opdVisitId" TEXT,
    "ipdAdmissionId" TEXT,
    "requestedById" UUID NOT NULL,
    "priority" "LabPriority" NOT NULL DEFAULT 'ROUTINE',
    "status" "LabRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "clinicalNotes" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" UUID,
    "emergencyEncounterId" UUID,

    CONSTRAINT "LabRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabRequestItem" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "status" "LabRequestItemStatus" NOT NULL DEFAULT 'REQUESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabSample" (
    "id" TEXT NOT NULL,
    "sampleNumber" TEXT NOT NULL,
    "requestItemId" TEXT NOT NULL,
    "specimenType" TEXT NOT NULL,
    "status" "LabSampleStatus" NOT NULL DEFAULT 'COLLECTED',
    "collectedById" UUID NOT NULL,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "userId" UUID,

    CONSTRAINT "LabSample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabResult" (
    "id" TEXT NOT NULL,
    "requestItemId" TEXT NOT NULL,
    "resultValue" TEXT NOT NULL,
    "unit" TEXT,
    "referenceRange" TEXT,
    "interpretation" TEXT,
    "remarks" TEXT,
    "status" "LabResultStatus" NOT NULL DEFAULT 'DRAFT',
    "enteredById" UUID NOT NULL,
    "verifiedById" UUID,
    "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),
    "userId" UUID,

    CONSTRAINT "LabResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medicine" (
    "id" TEXT NOT NULL,
    "hospitalId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "genericName" TEXT,
    "brandName" TEXT,
    "strength" TEXT,
    "dosageForm" TEXT,
    "unit" TEXT NOT NULL,
    "reorderLevel" INTEGER NOT NULL DEFAULT 10,
    "status" "MedicineStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "departmentId" UUID,

    CONSTRAINT "Medicine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "hospitalId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "departmentId" UUID,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "hospitalId" UUID NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "departmentId" UUID,
    "userId" UUID,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderItem" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "orderedQuantity" INTEGER NOT NULL,
    "receivedQuantity" INTEGER NOT NULL DEFAULT 0,
    "unitCost" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicineBatch" (
    "id" TEXT NOT NULL,
    "hospitalId" UUID NOT NULL,
    "medicineId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "expiryDate" DATE NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "unitCost" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "departmentId" UUID,

    CONSTRAINT "MedicineBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "hospitalId" UUID NOT NULL,
    "medicineId" TEXT NOT NULL,
    "batchId" TEXT,
    "type" "StockMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reference" TEXT,
    "reason" TEXT,
    "performedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "departmentId" UUID,
    "userId" UUID,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PharmacyDispense" (
    "id" TEXT NOT NULL,
    "dispenseNumber" TEXT NOT NULL,
    "hospitalId" UUID NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "dispensedById" UUID NOT NULL,
    "status" "PharmacyDispenseStatus" NOT NULL DEFAULT 'COMPLETED',
    "notes" TEXT,
    "dispensedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "departmentId" UUID,
    "userId" UUID,

    CONSTRAINT "PharmacyDispense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PharmacyDispenseItem" (
    "id" TEXT NOT NULL,
    "dispenseId" TEXT NOT NULL,
    "prescriptionItemId" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "PharmacyDispenseItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "radiology_procedures" (
    "id" UUID NOT NULL,
    "hospitalId" UUID NOT NULL,
    "departmentId" UUID,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "modality" "ImagingModality" NOT NULL,
    "description" TEXT,
    "preparationInstructions" TEXT,
    "estimatedDurationMinutes" INTEGER NOT NULL DEFAULT 15,
    "status" "RadiologyProcedureStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "radiology_procedures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imaging_equipment" (
    "id" UUID NOT NULL,
    "hospitalId" UUID NOT NULL,
    "departmentId" UUID,
    "assetCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "modality" "ImagingModality" NOT NULL,
    "manufacturer" TEXT,
    "modelNumber" TEXT,
    "serialNumber" TEXT,
    "location" TEXT,
    "status" "ImagingEquipmentStatus" NOT NULL DEFAULT 'OPERATIONAL',
    "lastMaintenanceAt" TIMESTAMP(3),
    "nextMaintenanceAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "imaging_equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "radiology_requests" (
    "id" UUID NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "hospitalId" UUID NOT NULL,
    "departmentId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "procedureId" UUID NOT NULL,
    "opdVisitId" TEXT,
    "ipdAdmissionId" TEXT,
    "requestedById" UUID NOT NULL,
    "clinicalIndication" TEXT NOT NULL,
    "priority" "RadiologyPriority" NOT NULL DEFAULT 'ROUTINE',
    "status" "RadiologyRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "notes" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emergencyEncounterId" UUID,

    CONSTRAINT "radiology_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "radiology_appointments" (
    "id" UUID NOT NULL,
    "hospitalId" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "equipmentId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3) NOT NULL,
    "status" "RadiologyAppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "arrivedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "radiology_appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "radiology_reports" (
    "id" UUID NOT NULL,
    "hospitalId" UUID NOT NULL,
    "appointmentId" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "technique" TEXT,
    "clinicalHistory" TEXT,
    "findings" TEXT NOT NULL,
    "impression" TEXT NOT NULL,
    "recommendations" TEXT,
    "status" "RadiologyReportStatus" NOT NULL DEFAULT 'DRAFT',
    "radiologistId" UUID NOT NULL,
    "verifiedById" UUID,
    "verifiedAt" TIMESTAMP(3),
    "amendedAt" TIMESTAMP(3),
    "previousReportId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "radiology_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "radiology_images" (
    "id" UUID NOT NULL,
    "hospitalId" UUID NOT NULL,
    "reportId" UUID NOT NULL,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "checksum" TEXT,
    "description" TEXT,
    "uploadedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "radiology_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ipd_transfers" (
    "id" UUID NOT NULL,
    "admissionId" TEXT NOT NULL,
    "hospitalId" UUID NOT NULL,
    "fromWardId" UUID NOT NULL,
    "toWardId" UUID NOT NULL,
    "fromBedId" UUID NOT NULL,
    "toBedId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "clinicalNotes" TEXT,
    "status" "IPDTransferStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestedById" UUID NOT NULL,
    "approvedById" UUID,
    "completedById" UUID,
    "rejectionReason" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "wardId" UUID,
    "bedId" UUID,
    "userId" UUID,

    CONSTRAINT "ipd_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ipd_discharge_requests" (
    "id" UUID NOT NULL,
    "admissionId" TEXT NOT NULL,
    "hospitalId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "clinicalNotes" TEXT,
    "status" "IPDDischargeStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestedById" UUID NOT NULL,
    "reviewedById" UUID,
    "rejectionReason" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ipd_discharge_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ipd_discharge_summaries" (
    "id" UUID NOT NULL,
    "dischargeRequestId" UUID NOT NULL,
    "hospitalId" UUID NOT NULL,
    "finalDiagnosis" TEXT NOT NULL,
    "secondaryDiagnoses" TEXT,
    "treatmentProvided" TEXT NOT NULL,
    "proceduresPerformed" TEXT,
    "conditionAtDischarge" TEXT NOT NULL,
    "dischargeMedications" TEXT NOT NULL,
    "medicationInstructions" TEXT,
    "followUpInstructions" TEXT NOT NULL,
    "followUpDate" TIMESTAMP(3),
    "warningSigns" TEXT,
    "preparedById" UUID NOT NULL,
    "preparedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ipd_discharge_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_encounters" (
    "id" UUID NOT NULL,
    "hospitalId" UUID NOT NULL,
    "departmentId" UUID NOT NULL,
    "patientId" UUID,
    "encounterNumber" TEXT NOT NULL,
    "arrivalMode" "EmergencyArrivalMode" NOT NULL DEFAULT 'WALK_IN',
    "arrivalSource" TEXT,
    "referralHospital" TEXT,
    "isUnknownPatient" BOOLEAN NOT NULL DEFAULT false,
    "temporaryPatientName" TEXT,
    "temporaryAge" INTEGER,
    "temporaryGender" TEXT,
    "identifyingNotes" TEXT,
    "chiefComplaint" TEXT,
    "arrivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registeredById" UUID NOT NULL,
    "status" "EmergencyEncounterStatus" NOT NULL DEFAULT 'REGISTERED',
    "assignedDoctorId" UUID,
    "assignedNurseId" UUID,
    "calledAt" TIMESTAMP(3),
    "treatmentStartedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" UUID,

    CONSTRAINT "emergency_encounters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_triages" (
    "id" UUID NOT NULL,
    "encounterId" UUID NOT NULL,
    "category" "EmergencyTriageCategory" NOT NULL,
    "chiefComplaint" TEXT NOT NULL,
    "symptoms" TEXT,
    "triageNotes" TEXT,
    "temperatureC" DOUBLE PRECISION,
    "systolicBP" INTEGER,
    "diastolicBP" INTEGER,
    "pulseRate" INTEGER,
    "respiratoryRate" INTEGER,
    "oxygenSaturation" DOUBLE PRECISION,
    "painScore" INTEGER,
    "assessedById" UUID NOT NULL,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID,

    CONSTRAINT "emergency_triages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_clinical_assessments" (
    "id" UUID NOT NULL,
    "hospitalId" UUID NOT NULL,
    "encounterId" UUID NOT NULL,
    "assessedById" UUID NOT NULL,
    "assessmentType" "EmergencyAssessmentType" NOT NULL DEFAULT 'INITIAL',
    "presentingComplaint" TEXT NOT NULL,
    "historyOfPresentIllness" TEXT,
    "relevantMedicalHistory" TEXT,
    "examinationFindings" TEXT,
    "provisionalDiagnosis" TEXT NOT NULL,
    "differentialDiagnosis" TEXT,
    "treatmentPlan" TEXT NOT NULL,
    "clinicalNotes" TEXT,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emergency_clinical_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_observations" (
    "id" UUID NOT NULL,
    "hospitalId" UUID NOT NULL,
    "encounterId" UUID NOT NULL,
    "recordedById" UUID NOT NULL,
    "temperatureC" DOUBLE PRECISION,
    "systolicBP" INTEGER,
    "diastolicBP" INTEGER,
    "pulseRate" INTEGER,
    "respiratoryRate" INTEGER,
    "oxygenSaturation" DOUBLE PRECISION,
    "painScore" INTEGER,
    "bloodGlucoseMmol" DOUBLE PRECISION,
    "consciousnessLevel" TEXT,
    "notes" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emergency_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_dispositions" (
    "id" UUID NOT NULL,
    "hospitalId" UUID NOT NULL,
    "encounterId" UUID NOT NULL,
    "outcome" "EmergencyDispositionType" NOT NULL,
    "ipdAdmissionId" TEXT,
    "receivingHospitalName" TEXT,
    "receivingHospitalContact" TEXT,
    "transferReason" TEXT,
    "transferNotes" TEXT,
    "dischargeInstructions" TEXT,
    "followUpInstructions" TEXT,
    "followUpDate" TIMESTAMP(3),
    "deathAt" TIMESTAMP(3),
    "deathDocumentation" TEXT,
    "recordedById" UUID NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emergency_dispositions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospital_shifts" (
    "id" UUID NOT NULL,
    "hospitalId" UUID NOT NULL,
    "departmentId" UUID,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "crossesMidnight" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lateGraceMinutes" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hospital_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_duty_assignments" (
    "id" UUID NOT NULL,
    "hospitalId" UUID NOT NULL,
    "departmentId" UUID,
    "staffAssignmentId" UUID NOT NULL,
    "shiftId" UUID NOT NULL,
    "dutyDate" DATE NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "StaffDutyStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "assignedById" UUID NOT NULL,
    "cancelledById" UUID,
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" UUID,

    CONSTRAINT "staff_duty_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_attendances" (
    "id" UUID NOT NULL,
    "hospitalId" UUID NOT NULL,
    "dutyAssignmentId" UUID NOT NULL,
    "status" "StaffAttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "checkInAt" TIMESTAMP(3),
    "checkOutAt" TIMESTAMP(3),
    "minutesLate" INTEGER NOT NULL DEFAULT 0,
    "minutesWorked" INTEGER,
    "notes" TEXT,
    "correctionReason" TEXT,
    "recordedById" UUID NOT NULL,
    "modifiedById" UUID,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" UUID,

    CONSTRAINT "staff_attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_leave_types" (
    "id" UUID NOT NULL,
    "hospitalId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "StaffLeaveCategory" NOT NULL,
    "description" TEXT,
    "isPaid" BOOLEAN NOT NULL DEFAULT true,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_leave_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_leave_balances" (
    "id" UUID NOT NULL,
    "hospitalId" UUID NOT NULL,
    "staffAssignmentId" UUID NOT NULL,
    "leaveTypeId" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "entitledDays" DECIMAL(7,2) NOT NULL DEFAULT 0,
    "usedDays" DECIMAL(7,2) NOT NULL DEFAULT 0,
    "availableDays" DECIMAL(7,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_leave_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_leave_applications" (
    "id" UUID NOT NULL,
    "hospitalId" UUID NOT NULL,
    "staffAssignmentId" UUID NOT NULL,
    "leaveTypeId" UUID NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "numberOfDays" DECIMAL(7,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "attachmentKey" TEXT,
    "status" "StaffLeaveStatus" NOT NULL DEFAULT 'PENDING',
    "applicantId" UUID NOT NULL,
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMP(3),
    "reviewComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" UUID,

    CONSTRAINT "staff_leave_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_categories" (
    "id" UUID NOT NULL,
    "hospitalId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospital_assets" (
    "id" UUID NOT NULL,
    "hospitalId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "assetCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "manufacturer" TEXT,
    "modelNumber" TEXT,
    "serialNumber" TEXT,
    "purchaseDate" DATE,
    "purchasePrice" DECIMAL(14,2),
    "supplierName" TEXT,
    "warrantyExpiryDate" DATE,
    "condition" "HospitalAssetCondition" NOT NULL DEFAULT 'GOOD',
    "status" "HospitalAssetStatus" NOT NULL DEFAULT 'AVAILABLE',
    "departmentId" UUID,
    "wardId" UUID,
    "assignedStaffAssignmentId" UUID,
    "locationDescription" TEXT,
    "notes" TEXT,
    "registeredById" UUID NOT NULL,
    "disposedAt" TIMESTAMP(3),
    "disposalReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" UUID,

    CONSTRAINT "hospital_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_movements" (
    "id" UUID NOT NULL,
    "hospitalId" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "movementType" "AssetMovementType" NOT NULL,
    "fromDepartmentId" UUID,
    "toDepartmentId" UUID,
    "fromWardId" UUID,
    "toWardId" UUID,
    "fromStaffAssignmentId" UUID,
    "toStaffAssignmentId" UUID,
    "reason" TEXT,
    "notes" TEXT,
    "performedById" UUID NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID,

    CONSTRAINT "asset_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_requests" (
    "id" UUID NOT NULL,
    "hospitalId" UUID NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "requestType" "MaintenanceRequestType" NOT NULL,
    "assetId" UUID,
    "departmentId" UUID,
    "wardId" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "locationDescription" TEXT,
    "priority" "MaintenancePriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'REPORTED',
    "reportedById" UUID NOT NULL,
    "assignedToId" UUID,
    "reviewedById" UUID,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "resolutionSummary" TEXT,
    "estimatedCost" DECIMAL(14,2),
    "actualCost" DECIMAL(14,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" UUID,

    CONSTRAINT "maintenance_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_work_logs" (
    "id" UUID NOT NULL,
    "maintenanceRequestId" UUID NOT NULL,
    "performedById" UUID NOT NULL,
    "workType" "MaintenanceWorkType" NOT NULL,
    "description" TEXT NOT NULL,
    "findings" TEXT,
    "hoursSpent" DECIMAL(8,2),
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID,

    CONSTRAINT "maintenance_work_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_parts" (
    "id" UUID NOT NULL,
    "maintenanceRequestId" UUID NOT NULL,
    "partName" TEXT NOT NULL,
    "partType" "MaintenancePartType" NOT NULL DEFAULT 'SPARE_PART',
    "quantity" DECIMAL(12,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "unitCost" DECIMAL(14,2) NOT NULL,
    "totalCost" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_status_history" (
    "id" UUID NOT NULL,
    "maintenanceRequestId" UUID NOT NULL,
    "previousStatus" "MaintenanceStatus",
    "newStatus" "MaintenanceStatus" NOT NULL,
    "changedById" UUID NOT NULL,
    "reason" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID,

    CONSTRAINT "maintenance_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IPDBedAllocation_admissionId_releasedAt_idx" ON "IPDBedAllocation"("admissionId", "releasedAt");

-- CreateIndex
CREATE INDEX "IPDBedAllocation_bedId_releasedAt_idx" ON "IPDBedAllocation"("bedId", "releasedAt");

-- CreateIndex
CREATE INDEX "IPDObservation_admissionId_recordedAt_idx" ON "IPDObservation"("admissionId", "recordedAt");

-- CreateIndex
CREATE INDEX "IPDNursingNote_admissionId_recordedAt_idx" ON "IPDNursingNote"("admissionId", "recordedAt");

-- CreateIndex
CREATE INDEX "LabTest_hospitalId_isActive_idx" ON "LabTest"("hospitalId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "LabTest_hospitalId_code_key" ON "LabTest"("hospitalId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "LabRequest_requestNumber_key" ON "LabRequest"("requestNumber");

-- CreateIndex
CREATE INDEX "LabRequest_hospitalId_status_requestedAt_idx" ON "LabRequest"("hospitalId", "status", "requestedAt");

-- CreateIndex
CREATE INDEX "LabRequest_patientId_requestedAt_idx" ON "LabRequest"("patientId", "requestedAt");

-- CreateIndex
CREATE INDEX "LabRequest_opdVisitId_idx" ON "LabRequest"("opdVisitId");

-- CreateIndex
CREATE INDEX "LabRequest_ipdAdmissionId_idx" ON "LabRequest"("ipdAdmissionId");

-- CreateIndex
CREATE INDEX "LabRequest_emergencyEncounterId_idx" ON "LabRequest"("emergencyEncounterId");

-- CreateIndex
CREATE INDEX "LabRequestItem_requestId_status_idx" ON "LabRequestItem"("requestId", "status");

-- CreateIndex
CREATE INDEX "LabRequestItem_testId_idx" ON "LabRequestItem"("testId");

-- CreateIndex
CREATE UNIQUE INDEX "LabSample_sampleNumber_key" ON "LabSample"("sampleNumber");

-- CreateIndex
CREATE UNIQUE INDEX "LabSample_requestItemId_key" ON "LabSample"("requestItemId");

-- CreateIndex
CREATE INDEX "LabSample_status_collectedAt_idx" ON "LabSample"("status", "collectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LabResult_requestItemId_key" ON "LabResult"("requestItemId");

-- CreateIndex
CREATE INDEX "LabResult_status_enteredAt_idx" ON "LabResult"("status", "enteredAt");

-- CreateIndex
CREATE INDEX "Medicine_hospitalId_status_idx" ON "Medicine"("hospitalId", "status");

-- CreateIndex
CREATE INDEX "Medicine_hospitalId_name_idx" ON "Medicine"("hospitalId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Medicine_hospitalId_code_key" ON "Medicine"("hospitalId", "code");

-- CreateIndex
CREATE INDEX "Supplier_hospitalId_isActive_idx" ON "Supplier"("hospitalId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_hospitalId_code_key" ON "Supplier"("hospitalId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_orderNumber_key" ON "PurchaseOrder"("orderNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrder_hospitalId_status_idx" ON "PurchaseOrder"("hospitalId", "status");

-- CreateIndex
CREATE INDEX "PurchaseOrder_supplierId_idx" ON "PurchaseOrder"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrderItem_purchaseOrderId_medicineId_key" ON "PurchaseOrderItem"("purchaseOrderId", "medicineId");

-- CreateIndex
CREATE INDEX "MedicineBatch_hospitalId_expiryDate_idx" ON "MedicineBatch"("hospitalId", "expiryDate");

-- CreateIndex
CREATE INDEX "MedicineBatch_medicineId_expiryDate_idx" ON "MedicineBatch"("medicineId", "expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "MedicineBatch_hospitalId_medicineId_batchNumber_key" ON "MedicineBatch"("hospitalId", "medicineId", "batchNumber");

-- CreateIndex
CREATE INDEX "StockMovement_hospitalId_medicineId_createdAt_idx" ON "StockMovement"("hospitalId", "medicineId", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_batchId_createdAt_idx" ON "StockMovement"("batchId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PharmacyDispense_dispenseNumber_key" ON "PharmacyDispense"("dispenseNumber");

-- CreateIndex
CREATE INDEX "PharmacyDispense_hospitalId_dispensedAt_idx" ON "PharmacyDispense"("hospitalId", "dispensedAt");

-- CreateIndex
CREATE INDEX "PharmacyDispense_prescriptionId_idx" ON "PharmacyDispense"("prescriptionId");

-- CreateIndex
CREATE INDEX "PharmacyDispenseItem_prescriptionItemId_idx" ON "PharmacyDispenseItem"("prescriptionItemId");

-- CreateIndex
CREATE INDEX "PharmacyDispenseItem_batchId_idx" ON "PharmacyDispenseItem"("batchId");

-- CreateIndex
CREATE INDEX "radiology_procedures_hospitalId_modality_status_idx" ON "radiology_procedures"("hospitalId", "modality", "status");

-- CreateIndex
CREATE INDEX "radiology_procedures_departmentId_idx" ON "radiology_procedures"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "radiology_procedures_hospitalId_code_key" ON "radiology_procedures"("hospitalId", "code");

-- CreateIndex
CREATE INDEX "imaging_equipment_hospitalId_modality_status_idx" ON "imaging_equipment"("hospitalId", "modality", "status");

-- CreateIndex
CREATE INDEX "imaging_equipment_departmentId_idx" ON "imaging_equipment"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "imaging_equipment_hospitalId_assetCode_key" ON "imaging_equipment"("hospitalId", "assetCode");

-- CreateIndex
CREATE INDEX "radiology_requests_hospitalId_status_requestedAt_idx" ON "radiology_requests"("hospitalId", "status", "requestedAt");

-- CreateIndex
CREATE INDEX "radiology_requests_hospitalId_patientId_idx" ON "radiology_requests"("hospitalId", "patientId");

-- CreateIndex
CREATE INDEX "radiology_requests_hospitalId_departmentId_requestedAt_idx" ON "radiology_requests"("hospitalId", "departmentId", "requestedAt");

-- CreateIndex
CREATE INDEX "radiology_requests_procedureId_status_idx" ON "radiology_requests"("procedureId", "status");

-- CreateIndex
CREATE INDEX "radiology_requests_opdVisitId_idx" ON "radiology_requests"("opdVisitId");

-- CreateIndex
CREATE INDEX "radiology_requests_ipdAdmissionId_idx" ON "radiology_requests"("ipdAdmissionId");

-- CreateIndex
CREATE INDEX "radiology_requests_emergencyEncounterId_idx" ON "radiology_requests"("emergencyEncounterId");

-- CreateIndex
CREATE UNIQUE INDEX "radiology_requests_hospitalId_requestNumber_key" ON "radiology_requests"("hospitalId", "requestNumber");

-- CreateIndex
CREATE INDEX "radiology_appointments_hospitalId_scheduledStart_idx" ON "radiology_appointments"("hospitalId", "scheduledStart");

-- CreateIndex
CREATE INDEX "radiology_appointments_equipmentId_scheduledStart_scheduled_idx" ON "radiology_appointments"("equipmentId", "scheduledStart", "scheduledEnd");

-- CreateIndex
CREATE INDEX "radiology_appointments_requestId_status_idx" ON "radiology_appointments"("requestId", "status");

-- CreateIndex
CREATE INDEX "radiology_appointments_status_scheduledStart_idx" ON "radiology_appointments"("status", "scheduledStart");

-- CreateIndex
CREATE INDEX "radiology_reports_hospitalId_status_createdAt_idx" ON "radiology_reports"("hospitalId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "radiology_reports_radiologistId_createdAt_idx" ON "radiology_reports"("radiologistId", "createdAt");

-- CreateIndex
CREATE INDEX "radiology_reports_appointmentId_idx" ON "radiology_reports"("appointmentId");

-- CreateIndex
CREATE INDEX "radiology_reports_previousReportId_idx" ON "radiology_reports"("previousReportId");

-- CreateIndex
CREATE UNIQUE INDEX "radiology_reports_appointmentId_version_key" ON "radiology_reports"("appointmentId", "version");

-- CreateIndex
CREATE INDEX "radiology_images_hospitalId_reportId_idx" ON "radiology_images"("hospitalId", "reportId");

-- CreateIndex
CREATE INDEX "radiology_images_uploadedById_createdAt_idx" ON "radiology_images"("uploadedById", "createdAt");

-- CreateIndex
CREATE INDEX "ipd_transfers_hospitalId_status_requestedAt_idx" ON "ipd_transfers"("hospitalId", "status", "requestedAt");

-- CreateIndex
CREATE INDEX "ipd_transfers_admissionId_requestedAt_idx" ON "ipd_transfers"("admissionId", "requestedAt");

-- CreateIndex
CREATE INDEX "ipd_transfers_fromWardId_idx" ON "ipd_transfers"("fromWardId");

-- CreateIndex
CREATE INDEX "ipd_transfers_toWardId_idx" ON "ipd_transfers"("toWardId");

-- CreateIndex
CREATE INDEX "ipd_transfers_requestedById_requestedAt_idx" ON "ipd_transfers"("requestedById", "requestedAt");

-- CreateIndex
CREATE INDEX "ipd_discharge_requests_hospitalId_status_requestedAt_idx" ON "ipd_discharge_requests"("hospitalId", "status", "requestedAt");

-- CreateIndex
CREATE INDEX "ipd_discharge_requests_admissionId_requestedAt_idx" ON "ipd_discharge_requests"("admissionId", "requestedAt");

-- CreateIndex
CREATE INDEX "ipd_discharge_requests_requestedById_idx" ON "ipd_discharge_requests"("requestedById");

-- CreateIndex
CREATE UNIQUE INDEX "ipd_discharge_summaries_dischargeRequestId_key" ON "ipd_discharge_summaries"("dischargeRequestId");

-- CreateIndex
CREATE INDEX "ipd_discharge_summaries_hospitalId_preparedAt_idx" ON "ipd_discharge_summaries"("hospitalId", "preparedAt");

-- CreateIndex
CREATE INDEX "ipd_discharge_summaries_preparedById_idx" ON "ipd_discharge_summaries"("preparedById");

-- CreateIndex
CREATE INDEX "emergency_encounters_hospitalId_status_arrivedAt_idx" ON "emergency_encounters"("hospitalId", "status", "arrivedAt");

-- CreateIndex
CREATE INDEX "emergency_encounters_hospitalId_departmentId_arrivedAt_idx" ON "emergency_encounters"("hospitalId", "departmentId", "arrivedAt");

-- CreateIndex
CREATE INDEX "emergency_encounters_hospitalId_status_assignedDoctorId_idx" ON "emergency_encounters"("hospitalId", "status", "assignedDoctorId");

-- CreateIndex
CREATE INDEX "emergency_encounters_hospitalId_status_assignedNurseId_idx" ON "emergency_encounters"("hospitalId", "status", "assignedNurseId");

-- CreateIndex
CREATE INDEX "emergency_encounters_patientId_arrivedAt_idx" ON "emergency_encounters"("patientId", "arrivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "emergency_encounters_hospitalId_encounterNumber_key" ON "emergency_encounters"("hospitalId", "encounterNumber");

-- CreateIndex
CREATE INDEX "emergency_triages_encounterId_assessedAt_idx" ON "emergency_triages"("encounterId", "assessedAt");

-- CreateIndex
CREATE INDEX "emergency_triages_category_assessedAt_idx" ON "emergency_triages"("category", "assessedAt");

-- CreateIndex
CREATE INDEX "emergency_triages_assessedById_assessedAt_idx" ON "emergency_triages"("assessedById", "assessedAt");

-- CreateIndex
CREATE INDEX "emergency_clinical_assessments_hospitalId_encounterId_asses_idx" ON "emergency_clinical_assessments"("hospitalId", "encounterId", "assessedAt");

-- CreateIndex
CREATE INDEX "emergency_clinical_assessments_assessedById_assessedAt_idx" ON "emergency_clinical_assessments"("assessedById", "assessedAt");

-- CreateIndex
CREATE INDEX "emergency_observations_hospitalId_encounterId_recordedAt_idx" ON "emergency_observations"("hospitalId", "encounterId", "recordedAt");

-- CreateIndex
CREATE INDEX "emergency_observations_recordedById_recordedAt_idx" ON "emergency_observations"("recordedById", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "emergency_dispositions_encounterId_key" ON "emergency_dispositions"("encounterId");

-- CreateIndex
CREATE UNIQUE INDEX "emergency_dispositions_ipdAdmissionId_key" ON "emergency_dispositions"("ipdAdmissionId");

-- CreateIndex
CREATE INDEX "emergency_dispositions_hospitalId_outcome_recordedAt_idx" ON "emergency_dispositions"("hospitalId", "outcome", "recordedAt");

-- CreateIndex
CREATE INDEX "emergency_dispositions_recordedById_recordedAt_idx" ON "emergency_dispositions"("recordedById", "recordedAt");

-- CreateIndex
CREATE INDEX "hospital_shifts_hospitalId_departmentId_isActive_idx" ON "hospital_shifts"("hospitalId", "departmentId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "hospital_shifts_hospitalId_code_key" ON "hospital_shifts"("hospitalId", "code");

-- CreateIndex
CREATE INDEX "staff_duty_assignments_hospitalId_dutyDate_status_idx" ON "staff_duty_assignments"("hospitalId", "dutyDate", "status");

-- CreateIndex
CREATE INDEX "staff_duty_assignments_departmentId_dutyDate_idx" ON "staff_duty_assignments"("departmentId", "dutyDate");

-- CreateIndex
CREATE INDEX "staff_duty_assignments_staffAssignmentId_startsAt_endsAt_idx" ON "staff_duty_assignments"("staffAssignmentId", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "staff_duty_assignments_shiftId_dutyDate_idx" ON "staff_duty_assignments"("shiftId", "dutyDate");

-- CreateIndex
CREATE UNIQUE INDEX "staff_attendances_dutyAssignmentId_key" ON "staff_attendances"("dutyAssignmentId");

-- CreateIndex
CREATE INDEX "staff_attendances_hospitalId_checkInAt_idx" ON "staff_attendances"("hospitalId", "checkInAt");

-- CreateIndex
CREATE INDEX "staff_attendances_hospitalId_status_checkInAt_idx" ON "staff_attendances"("hospitalId", "status", "checkInAt");

-- CreateIndex
CREATE INDEX "staff_attendances_recordedById_recordedAt_idx" ON "staff_attendances"("recordedById", "recordedAt");

-- CreateIndex
CREATE INDEX "staff_leave_types_hospitalId_isActive_idx" ON "staff_leave_types"("hospitalId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "staff_leave_types_hospitalId_code_key" ON "staff_leave_types"("hospitalId", "code");

-- CreateIndex
CREATE INDEX "staff_leave_balances_hospitalId_year_idx" ON "staff_leave_balances"("hospitalId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "staff_leave_balances_staffAssignmentId_leaveTypeId_year_key" ON "staff_leave_balances"("staffAssignmentId", "leaveTypeId", "year");

-- CreateIndex
CREATE INDEX "staff_leave_applications_hospitalId_status_startDate_idx" ON "staff_leave_applications"("hospitalId", "status", "startDate");

-- CreateIndex
CREATE INDEX "staff_leave_applications_staffAssignmentId_startDate_endDat_idx" ON "staff_leave_applications"("staffAssignmentId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "staff_leave_applications_applicantId_createdAt_idx" ON "staff_leave_applications"("applicantId", "createdAt");

-- CreateIndex
CREATE INDEX "asset_categories_hospitalId_isActive_idx" ON "asset_categories"("hospitalId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "asset_categories_hospitalId_code_key" ON "asset_categories"("hospitalId", "code");

-- CreateIndex
CREATE INDEX "hospital_assets_hospitalId_status_idx" ON "hospital_assets"("hospitalId", "status");

-- CreateIndex
CREATE INDEX "hospital_assets_hospitalId_categoryId_idx" ON "hospital_assets"("hospitalId", "categoryId");

-- CreateIndex
CREATE INDEX "hospital_assets_hospitalId_departmentId_idx" ON "hospital_assets"("hospitalId", "departmentId");

-- CreateIndex
CREATE INDEX "hospital_assets_hospitalId_serialNumber_idx" ON "hospital_assets"("hospitalId", "serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "hospital_assets_hospitalId_assetCode_key" ON "hospital_assets"("hospitalId", "assetCode");

-- CreateIndex
CREATE INDEX "asset_movements_hospitalId_performedAt_idx" ON "asset_movements"("hospitalId", "performedAt");

-- CreateIndex
CREATE INDEX "asset_movements_assetId_performedAt_idx" ON "asset_movements"("assetId", "performedAt");

-- CreateIndex
CREATE INDEX "asset_movements_performedById_performedAt_idx" ON "asset_movements"("performedById", "performedAt");

-- CreateIndex
CREATE INDEX "maintenance_requests_hospitalId_status_priority_idx" ON "maintenance_requests"("hospitalId", "status", "priority");

-- CreateIndex
CREATE INDEX "maintenance_requests_hospitalId_reportedAt_idx" ON "maintenance_requests"("hospitalId", "reportedAt");

-- CreateIndex
CREATE INDEX "maintenance_requests_assetId_reportedAt_idx" ON "maintenance_requests"("assetId", "reportedAt");

-- CreateIndex
CREATE INDEX "maintenance_requests_assignedToId_status_idx" ON "maintenance_requests"("assignedToId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_requests_hospitalId_requestNumber_key" ON "maintenance_requests"("hospitalId", "requestNumber");

-- CreateIndex
CREATE INDEX "maintenance_work_logs_maintenanceRequestId_performedAt_idx" ON "maintenance_work_logs"("maintenanceRequestId", "performedAt");

-- CreateIndex
CREATE INDEX "maintenance_parts_maintenanceRequestId_idx" ON "maintenance_parts"("maintenanceRequestId");

-- CreateIndex
CREATE INDEX "maintenance_status_history_maintenanceRequestId_changedAt_idx" ON "maintenance_status_history"("maintenanceRequestId", "changedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IPDAdmission_hospitalId_status_idx" ON "IPDAdmission"("hospitalId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IPDAdmission_patientId_idx" ON "IPDAdmission"("patientId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IPDAdmission_departmentId_admissionDate_idx" ON "IPDAdmission"("departmentId", "admissionDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IPDAdmission_attendingDoctorId_idx" ON "IPDAdmission"("attendingDoctorId");

-- CreateIndex
CREATE INDEX "Prescription_emergencyEncounterId_idx" ON "Prescription"("emergencyEncounterId");

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "OPDVisit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_emergencyEncounterId_fkey" FOREIGN KEY ("emergencyEncounterId") REFERENCES "emergency_encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionItem" ADD CONSTRAINT "PrescriptionItem_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IPDAdmission" ADD CONSTRAINT "IPDAdmission_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IPDAdmission" ADD CONSTRAINT "IPDAdmission_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IPDAdmission" ADD CONSTRAINT "IPDAdmission_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IPDAdmission" ADD CONSTRAINT "IPDAdmission_admittedById_fkey" FOREIGN KEY ("admittedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IPDAdmission" ADD CONSTRAINT "IPDAdmission_attendingDoctorId_fkey" FOREIGN KEY ("attendingDoctorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IPDAdmission" ADD CONSTRAINT "IPDAdmission_dischargedById_fkey" FOREIGN KEY ("dischargedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IPDBedAllocation" ADD CONSTRAINT "IPDBedAllocation_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "IPDAdmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IPDBedAllocation" ADD CONSTRAINT "IPDBedAllocation_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES "beds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IPDBedAllocation" ADD CONSTRAINT "IPDBedAllocation_allocatedById_fkey" FOREIGN KEY ("allocatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IPDBedAllocation" ADD CONSTRAINT "IPDBedAllocation_releasedById_fkey" FOREIGN KEY ("releasedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IPDObservation" ADD CONSTRAINT "IPDObservation_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "IPDAdmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IPDObservation" ADD CONSTRAINT "IPDObservation_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IPDNursingNote" ADD CONSTRAINT "IPDNursingNote_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "IPDAdmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IPDNursingNote" ADD CONSTRAINT "IPDNursingNote_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabTest" ADD CONSTRAINT "LabTest_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabRequest" ADD CONSTRAINT "LabRequest_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabRequest" ADD CONSTRAINT "LabRequest_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabRequest" ADD CONSTRAINT "LabRequest_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabRequest" ADD CONSTRAINT "LabRequest_opdVisitId_fkey" FOREIGN KEY ("opdVisitId") REFERENCES "OPDVisit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabRequest" ADD CONSTRAINT "LabRequest_ipdAdmissionId_fkey" FOREIGN KEY ("ipdAdmissionId") REFERENCES "IPDAdmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabRequest" ADD CONSTRAINT "LabRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabRequest" ADD CONSTRAINT "LabRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabRequest" ADD CONSTRAINT "LabRequest_emergencyEncounterId_fkey" FOREIGN KEY ("emergencyEncounterId") REFERENCES "emergency_encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabRequestItem" ADD CONSTRAINT "LabRequestItem_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "LabRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabRequestItem" ADD CONSTRAINT "LabRequestItem_testId_fkey" FOREIGN KEY ("testId") REFERENCES "LabTest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabSample" ADD CONSTRAINT "LabSample_requestItemId_fkey" FOREIGN KEY ("requestItemId") REFERENCES "LabRequestItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabSample" ADD CONSTRAINT "LabSample_collectedById_fkey" FOREIGN KEY ("collectedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabSample" ADD CONSTRAINT "LabSample_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_requestItemId_fkey" FOREIGN KEY ("requestItemId") REFERENCES "LabRequestItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_enteredById_fkey" FOREIGN KEY ("enteredById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medicine" ADD CONSTRAINT "Medicine_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medicine" ADD CONSTRAINT "Medicine_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineBatch" ADD CONSTRAINT "MedicineBatch_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineBatch" ADD CONSTRAINT "MedicineBatch_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineBatch" ADD CONSTRAINT "MedicineBatch_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "MedicineBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacyDispense" ADD CONSTRAINT "PharmacyDispense_dispensedById_fkey" FOREIGN KEY ("dispensedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacyDispense" ADD CONSTRAINT "PharmacyDispense_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacyDispense" ADD CONSTRAINT "PharmacyDispense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacyDispense" ADD CONSTRAINT "PharmacyDispense_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacyDispenseItem" ADD CONSTRAINT "PharmacyDispenseItem_dispenseId_fkey" FOREIGN KEY ("dispenseId") REFERENCES "PharmacyDispense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacyDispenseItem" ADD CONSTRAINT "PharmacyDispenseItem_prescriptionItemId_fkey" FOREIGN KEY ("prescriptionItemId") REFERENCES "PrescriptionItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacyDispenseItem" ADD CONSTRAINT "PharmacyDispenseItem_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacyDispenseItem" ADD CONSTRAINT "PharmacyDispenseItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "MedicineBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_procedures" ADD CONSTRAINT "radiology_procedures_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_procedures" ADD CONSTRAINT "radiology_procedures_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imaging_equipment" ADD CONSTRAINT "imaging_equipment_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imaging_equipment" ADD CONSTRAINT "imaging_equipment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_requests" ADD CONSTRAINT "radiology_requests_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_requests" ADD CONSTRAINT "radiology_requests_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_requests" ADD CONSTRAINT "radiology_requests_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_requests" ADD CONSTRAINT "radiology_requests_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "radiology_procedures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_requests" ADD CONSTRAINT "radiology_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_requests" ADD CONSTRAINT "radiology_requests_opdVisitId_fkey" FOREIGN KEY ("opdVisitId") REFERENCES "OPDVisit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_requests" ADD CONSTRAINT "radiology_requests_ipdAdmissionId_fkey" FOREIGN KEY ("ipdAdmissionId") REFERENCES "IPDAdmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_requests" ADD CONSTRAINT "radiology_requests_emergencyEncounterId_fkey" FOREIGN KEY ("emergencyEncounterId") REFERENCES "emergency_encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_appointments" ADD CONSTRAINT "radiology_appointments_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_appointments" ADD CONSTRAINT "radiology_appointments_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "radiology_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_appointments" ADD CONSTRAINT "radiology_appointments_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "imaging_equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_appointments" ADD CONSTRAINT "radiology_appointments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_reports" ADD CONSTRAINT "radiology_reports_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_reports" ADD CONSTRAINT "radiology_reports_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "radiology_appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_reports" ADD CONSTRAINT "radiology_reports_radiologistId_fkey" FOREIGN KEY ("radiologistId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_reports" ADD CONSTRAINT "radiology_reports_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_reports" ADD CONSTRAINT "radiology_reports_previousReportId_fkey" FOREIGN KEY ("previousReportId") REFERENCES "radiology_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_images" ADD CONSTRAINT "radiology_images_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "radiology_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_images" ADD CONSTRAINT "radiology_images_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_transfers" ADD CONSTRAINT "ipd_transfers_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "IPDAdmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_transfers" ADD CONSTRAINT "ipd_transfers_fromWardId_fkey" FOREIGN KEY ("fromWardId") REFERENCES "wards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_transfers" ADD CONSTRAINT "ipd_transfers_toWardId_fkey" FOREIGN KEY ("toWardId") REFERENCES "wards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_transfers" ADD CONSTRAINT "ipd_transfers_fromBedId_fkey" FOREIGN KEY ("fromBedId") REFERENCES "beds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_transfers" ADD CONSTRAINT "ipd_transfers_toBedId_fkey" FOREIGN KEY ("toBedId") REFERENCES "beds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_transfers" ADD CONSTRAINT "ipd_transfers_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_transfers" ADD CONSTRAINT "ipd_transfers_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_transfers" ADD CONSTRAINT "ipd_transfers_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_transfers" ADD CONSTRAINT "ipd_transfers_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "wards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_transfers" ADD CONSTRAINT "ipd_transfers_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES "beds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_transfers" ADD CONSTRAINT "ipd_transfers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_discharge_requests" ADD CONSTRAINT "ipd_discharge_requests_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "IPDAdmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_discharge_requests" ADD CONSTRAINT "ipd_discharge_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_discharge_requests" ADD CONSTRAINT "ipd_discharge_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_discharge_summaries" ADD CONSTRAINT "ipd_discharge_summaries_dischargeRequestId_fkey" FOREIGN KEY ("dischargeRequestId") REFERENCES "ipd_discharge_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_discharge_summaries" ADD CONSTRAINT "ipd_discharge_summaries_preparedById_fkey" FOREIGN KEY ("preparedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_encounters" ADD CONSTRAINT "emergency_encounters_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_encounters" ADD CONSTRAINT "emergency_encounters_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_encounters" ADD CONSTRAINT "emergency_encounters_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_encounters" ADD CONSTRAINT "emergency_encounters_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_encounters" ADD CONSTRAINT "emergency_encounters_assignedDoctorId_fkey" FOREIGN KEY ("assignedDoctorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_encounters" ADD CONSTRAINT "emergency_encounters_assignedNurseId_fkey" FOREIGN KEY ("assignedNurseId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_encounters" ADD CONSTRAINT "emergency_encounters_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_triages" ADD CONSTRAINT "emergency_triages_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "emergency_encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_triages" ADD CONSTRAINT "emergency_triages_assessedById_fkey" FOREIGN KEY ("assessedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_triages" ADD CONSTRAINT "emergency_triages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_clinical_assessments" ADD CONSTRAINT "emergency_clinical_assessments_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "emergency_encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_clinical_assessments" ADD CONSTRAINT "emergency_clinical_assessments_assessedById_fkey" FOREIGN KEY ("assessedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_observations" ADD CONSTRAINT "emergency_observations_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "emergency_encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_observations" ADD CONSTRAINT "emergency_observations_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_dispositions" ADD CONSTRAINT "emergency_dispositions_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "emergency_encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_dispositions" ADD CONSTRAINT "emergency_dispositions_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_dispositions" ADD CONSTRAINT "emergency_dispositions_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_dispositions" ADD CONSTRAINT "emergency_dispositions_ipdAdmissionId_fkey" FOREIGN KEY ("ipdAdmissionId") REFERENCES "IPDAdmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital_shifts" ADD CONSTRAINT "hospital_shifts_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital_shifts" ADD CONSTRAINT "hospital_shifts_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_duty_assignments" ADD CONSTRAINT "staff_duty_assignments_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_duty_assignments" ADD CONSTRAINT "staff_duty_assignments_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_duty_assignments" ADD CONSTRAINT "staff_duty_assignments_staffAssignmentId_fkey" FOREIGN KEY ("staffAssignmentId") REFERENCES "hospital_staff_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_duty_assignments" ADD CONSTRAINT "staff_duty_assignments_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "hospital_shifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_duty_assignments" ADD CONSTRAINT "staff_duty_assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_duty_assignments" ADD CONSTRAINT "staff_duty_assignments_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_duty_assignments" ADD CONSTRAINT "staff_duty_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_attendances" ADD CONSTRAINT "staff_attendances_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_attendances" ADD CONSTRAINT "staff_attendances_dutyAssignmentId_fkey" FOREIGN KEY ("dutyAssignmentId") REFERENCES "staff_duty_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_attendances" ADD CONSTRAINT "staff_attendances_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_attendances" ADD CONSTRAINT "staff_attendances_modifiedById_fkey" FOREIGN KEY ("modifiedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_attendances" ADD CONSTRAINT "staff_attendances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_leave_types" ADD CONSTRAINT "staff_leave_types_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_leave_balances" ADD CONSTRAINT "staff_leave_balances_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_leave_balances" ADD CONSTRAINT "staff_leave_balances_staffAssignmentId_fkey" FOREIGN KEY ("staffAssignmentId") REFERENCES "hospital_staff_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_leave_balances" ADD CONSTRAINT "staff_leave_balances_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "staff_leave_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_leave_applications" ADD CONSTRAINT "staff_leave_applications_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_leave_applications" ADD CONSTRAINT "staff_leave_applications_staffAssignmentId_fkey" FOREIGN KEY ("staffAssignmentId") REFERENCES "hospital_staff_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_leave_applications" ADD CONSTRAINT "staff_leave_applications_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "staff_leave_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_leave_applications" ADD CONSTRAINT "staff_leave_applications_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_leave_applications" ADD CONSTRAINT "staff_leave_applications_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_leave_applications" ADD CONSTRAINT "staff_leave_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_categories" ADD CONSTRAINT "asset_categories_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital_assets" ADD CONSTRAINT "hospital_assets_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital_assets" ADD CONSTRAINT "hospital_assets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "asset_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital_assets" ADD CONSTRAINT "hospital_assets_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital_assets" ADD CONSTRAINT "hospital_assets_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "wards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital_assets" ADD CONSTRAINT "hospital_assets_assignedStaffAssignmentId_fkey" FOREIGN KEY ("assignedStaffAssignmentId") REFERENCES "hospital_staff_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital_assets" ADD CONSTRAINT "hospital_assets_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital_assets" ADD CONSTRAINT "hospital_assets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_movements" ADD CONSTRAINT "asset_movements_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "hospital_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_movements" ADD CONSTRAINT "asset_movements_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_movements" ADD CONSTRAINT "asset_movements_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_movements" ADD CONSTRAINT "asset_movements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "hospital_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "wards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_work_logs" ADD CONSTRAINT "maintenance_work_logs_maintenanceRequestId_fkey" FOREIGN KEY ("maintenanceRequestId") REFERENCES "maintenance_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_work_logs" ADD CONSTRAINT "maintenance_work_logs_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_work_logs" ADD CONSTRAINT "maintenance_work_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_parts" ADD CONSTRAINT "maintenance_parts_maintenanceRequestId_fkey" FOREIGN KEY ("maintenanceRequestId") REFERENCES "maintenance_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_status_history" ADD CONSTRAINT "maintenance_status_history_maintenanceRequestId_fkey" FOREIGN KEY ("maintenanceRequestId") REFERENCES "maintenance_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_status_history" ADD CONSTRAINT "maintenance_status_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_status_history" ADD CONSTRAINT "maintenance_status_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
