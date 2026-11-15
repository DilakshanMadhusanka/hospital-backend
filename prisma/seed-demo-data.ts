import {
  BedStatus,
  HospitalType,
  Prisma,
  PrismaClient,
  WardType,
} from '@prisma/client';

const prisma = new PrismaClient();
const DEMO_HOSPITAL_CODE = 'DEMO-GH-001';

function dateOffset(days: number, hour = 0): Date {
  const date = new Date();
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() + days,
      hour,
    ),
  );
}

function sriLankaDay(): Date {
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  return new Date(`${day}T00:00:00.000Z`);
}

async function seedDemoData() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed demo data when NODE_ENV is production.');
  }

  const actor = await prisma.user.findFirst({
    where: { isActive: true, status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });

  if (!actor) {
    throw new Error(
      'An active user is required for sample records. Create or activate a user, then rerun the demo seed.',
    );
  }

  const now = new Date();
  const sampleCheckInAt = new Date(now.getTime() - 60 * 60 * 1000);
  const sampleShiftEndAt = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const sampleCollectedAt = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const sampleReceivedAt = new Date(now.getTime() - 90 * 60 * 1000);
  const sampleMaintenanceStartedAt = new Date(now.getTime() - 60 * 60 * 1000);
  const sampleMaintenanceAssignedAt = new Date(now.getTime() - 90 * 60 * 1000);
  const sampleMaintenanceReportedAt = new Date(
    now.getTime() - 2 * 60 * 60 * 1000,
  );

  await prisma.$transaction(
    async (tx) => {
      const hospital = await tx.hospital.upsert({
        where: { code: DEMO_HOSPITAL_CODE },
        update: {
          name: 'Demo District General Hospital',
          type: HospitalType.DISTRICT_GENERAL,
          status: 'ACTIVE',
          address: '100 Sample Hospital Road',
          district: 'Gampaha',
          province: 'Western',
          phone: '0110000000',
          email: 'demo-hospital@example.invalid',
        },
        create: {
          code: DEMO_HOSPITAL_CODE,
          name: 'Demo District General Hospital',
          type: HospitalType.DISTRICT_GENERAL,
          address: '100 Sample Hospital Road',
          district: 'Gampaha',
          province: 'Western',
          phone: '0110000000',
          email: 'demo-hospital@example.invalid',
        },
      });

      const departmentData = [
        { code: 'DEMO-OPD', name: 'Sample Outpatient Department' },
        { code: 'DEMO-MED', name: 'Sample Medical Department' },
        { code: 'DEMO-LAB', name: 'Sample Laboratory' },
        { code: 'DEMO-PHARM', name: 'Sample Pharmacy' },
        { code: 'DEMO-RAD', name: 'Sample Radiology' },
        { code: 'DEMO-EMG', name: 'Sample Emergency Department' },
      ];

      const departments = new Map<string, { id: string }>();
      for (const data of departmentData) {
        const department = await tx.department.upsert({
          where: {
            hospitalId_code: { hospitalId: hospital.id, code: data.code },
          },
          update: { name: data.name, status: 'ACTIVE' },
          create: { ...data, hospitalId: hospital.id },
          select: { id: true },
        });
        departments.set(data.code, department);
      }

      const medicalDepartment = departments.get('DEMO-MED')!;
      const labDepartment = departments.get('DEMO-LAB')!;
      const pharmacyDepartment = departments.get('DEMO-PHARM')!;
      const radiologyDepartment = departments.get('DEMO-RAD')!;
      const emergencyDepartment = departments.get('DEMO-EMG')!;
      const opdDepartment = departments.get('DEMO-OPD')!;

      const ward = await tx.ward.upsert({
        where: {
          hospitalId_code: {
            hospitalId: hospital.id,
            code: 'DEMO-MED-WARD',
          },
        },
        update: {
          departmentId: medicalDepartment.id,
          name: 'Sample Medical Ward',
          type: WardType.MEDICAL,
        },
        create: {
          hospitalId: hospital.id,
          departmentId: medicalDepartment.id,
          code: 'DEMO-MED-WARD',
          name: 'Sample Medical Ward',
          type: WardType.MEDICAL,
          description: 'Synthetic data for demonstration and testing.',
        },
        select: { id: true },
      });

      for (const bedNumber of [
        'DEMO-BED-001',
        'DEMO-BED-002',
        'DEMO-BED-003',
      ]) {
        await tx.bed.upsert({
          where: { wardId_bedNumber: { wardId: ward.id, bedNumber } },
          update: {
            hospitalId: hospital.id,
            status:
              bedNumber === 'DEMO-BED-001'
                ? BedStatus.OCCUPIED
                : bedNumber === 'DEMO-BED-003'
                  ? BedStatus.MAINTENANCE
                  : BedStatus.AVAILABLE,
          },
          create: {
            hospitalId: hospital.id,
            wardId: ward.id,
            bedNumber,
            status:
              bedNumber === 'DEMO-BED-001'
                ? BedStatus.OCCUPIED
                : bedNumber === 'DEMO-BED-003'
                  ? BedStatus.MAINTENANCE
                  : BedStatus.AVAILABLE,
          },
        });
      }
      const occupiedBed = await tx.bed.findUniqueOrThrow({
        where: {
          wardId_bedNumber: {
            wardId: ward.id,
            bedNumber: 'DEMO-BED-001',
          },
        },
        select: { id: true },
      });

      const serviceData = [
        {
          code: 'DEMO-OPD-SVC',
          name: 'Sample outpatient consultation',
          departmentId: opdDepartment.id,
        },
        {
          code: 'DEMO-LAB-SVC',
          name: 'Sample laboratory investigations',
          departmentId: labDepartment.id,
        },
        {
          code: 'DEMO-PHARM-SVC',
          name: 'Sample medicine dispensing',
          departmentId: pharmacyDepartment.id,
        },
        {
          code: 'DEMO-RAD-SVC',
          name: 'Sample radiology investigations',
          departmentId: radiologyDepartment.id,
        },
      ];
      for (const service of serviceData) {
        await tx.hospitalService.upsert({
          where: {
            hospitalId_code: { hospitalId: hospital.id, code: service.code },
          },
          update: {
            name: service.name,
            departmentId: service.departmentId,
            status: 'ACTIVE',
          },
          create: { ...service, hospitalId: hospital.id },
        });
      }

      const patient = await tx.patient.upsert({
        where: { patientNumber: 'DEMO-PAT-0001' },
        update: {
          firstName: 'Sample',
          lastName: 'Patient',
          dateOfBirth: new Date('1985-06-15T00:00:00.000Z'),
          gender: 'FEMALE',
          bloodGroup: 'O_POSITIVE',
          phone: '+94110000001',
          email: 'sample.patient@example.invalid',
        },
        create: {
          patientNumber: 'DEMO-PAT-0001',
          firstName: 'Sample',
          lastName: 'Patient',
          dateOfBirth: new Date('1985-06-15T00:00:00.000Z'),
          gender: 'FEMALE',
          bloodGroup: 'O_POSITIVE',
          phone: '+94110000001',
          email: 'sample.patient@example.invalid',
        },
        select: { id: true },
      });

      await tx.hospitalPatient.upsert({
        where: {
          patientId_hospitalId: {
            patientId: patient.id,
            hospitalId: hospital.id,
          },
        },
        update: {
          registrationNumber: 'DEMO-REG-0001',
          status: 'ACTIVE',
        },
        create: {
          patientId: patient.id,
          hospitalId: hospital.id,
          registrationNumber: 'DEMO-REG-0001',
          status: 'ACTIVE',
        },
      });

      const visitDate = new Date(
        `${sriLankaDay().toISOString().slice(0, 10)}T03:00:00.000Z`,
      );
      const visit = await tx.oPDVisit.upsert({
        where: { visitNumber: 'DEMO-OPD-0001' },
        update: {
          patientId: patient.id,
          hospitalId: hospital.id,
          departmentId: opdDepartment.id,
          doctorId: actor.id,
          visitDate,
          tokenNumber: 9001,
          status: 'WAITING',
          chiefComplaint: 'Sample outpatient visit for demonstration.',
          registeredBy: actor.id,
        },
        create: {
          visitNumber: 'DEMO-OPD-0001',
          tokenNumber: 9001,
          patientId: patient.id,
          hospitalId: hospital.id,
          departmentId: opdDepartment.id,
          doctorId: actor.id,
          visitDate,
          status: 'WAITING',
          chiefComplaint: 'Sample outpatient visit for demonstration.',
          registeredBy: actor.id,
        },
        select: { id: true },
      });
      const schedule = await tx.doctorSchedule.findFirst({
        where: {
          doctorId: actor.id,
          hospitalId: hospital.id,
          departmentId: opdDepartment.id,
          dayOfWeek: new Date().getDay(),
          startTime: '08:00',
          endTime: '16:00',
          slotMinutes: 20,
          isActive: true,
        },
        select: { id: true },
      });
      if (!schedule) {
        await tx.doctorSchedule.create({
          data: {
            doctorId: actor.id,
            hospitalId: hospital.id,
            departmentId: opdDepartment.id,
            dayOfWeek: new Date().getDay(),
            startTime: '08:00',
            endTime: '16:00',
            slotMinutes: 20,
            isActive: true,
          },
        });
      }

      let consultation = await tx.consultation.findUnique({
        where: { visitId: visit.id },
        select: { id: true },
      });
      if (consultation) {
        consultation = await tx.consultation.update({
          where: { visitId: visit.id },
          data: {
            doctorId: actor.id,
            symptoms: 'Sample symptoms.',
            diagnosis: 'Sample clinical assessment',
            status: 'IN_PROGRESS',
            completedAt: null,
          },
          select: { id: true },
        });
      } else {
        consultation = await tx.consultation.create({
          data: {
            visitId: visit.id,
            doctorId: actor.id,
            symptoms: 'Sample symptoms.',
            diagnosis: 'Sample clinical assessment',
            clinicalNotes: 'Synthetic clinical record for demonstration.',
            treatmentPlan: 'Routine follow-up.',
            status: 'IN_PROGRESS',
          },
          select: { id: true },
        });
      }

      const existingVitals = await tx.vitalSigns.findFirst({
        where: { visitId: visit.id },
        select: { id: true },
      });
      if (existingVitals) {
        await tx.vitalSigns.update({
          where: { id: existingVitals.id },
          data: {
            temperature: 36.8,
            systolicBP: 120,
            diastolicBP: 78,
            pulseRate: 72,
          },
        });
      } else {
        await tx.vitalSigns.create({
          data: {
            visitId: visit.id,
            temperature: 36.8,
            systolicBP: 120,
            diastolicBP: 78,
            pulseRate: 72,
            respiratoryRate: 16,
            oxygenSaturation: 98,
            weightKg: 64,
            heightCm: 162,
            recordedBy: actor.id,
          },
        });
      }

      const existingPrescription = await tx.prescription.findFirst({
        where: { visitId: visit.id },
        select: { id: true },
      });
      let prescriptionId = existingPrescription?.id;
      if (prescriptionId) {
        await tx.prescription.update({
          where: { id: prescriptionId },
          data: { doctorId: actor.id, status: 'ACTIVE' },
        });
      } else {
        const prescription = await tx.prescription.create({
          data: {
            visitId: visit.id,
            doctorId: actor.id,
            status: 'ACTIVE',
            notes: 'Synthetic prescription for demonstration.',
          },
          select: { id: true },
        });
        prescriptionId = prescription.id;
      }
      const prescriptionItem = await tx.prescriptionItem.findFirst({
        where: { prescriptionId },
        select: { id: true },
      });
      if (!prescriptionItem) {
        await tx.prescriptionItem.create({
          data: {
            prescriptionId,
            medicineName: 'Sample paracetamol',
            dosage: '500 mg',
            frequency: 'Every 8 hours as needed',
            duration: '3 days',
            quantity: 9,
            instructions: 'Synthetic sample; follow clinician directions.',
          },
        });
      }

      const existingInvestigation = await tx.investigationRequest.findFirst({
        where: { visitId: visit.id, investigationCode: 'DEMO-CBC' },
        select: { id: true },
      });
      if (existingInvestigation) {
        await tx.investigationRequest.update({
          where: { id: existingInvestigation.id },
          data: { status: 'REQUESTED' },
        });
      } else {
        await tx.investigationRequest.create({
          data: {
            visitId: visit.id,
            doctorId: actor.id,
            investigationCode: 'DEMO-CBC',
            investigationName: 'Sample full blood count',
            clinicalReason: 'Synthetic investigation for demonstration.',
            status: 'REQUESTED',
          },
        });
      }

      const admission = await tx.iPDAdmission.upsert({
        where: { admissionNumber: 'DEMO-IPD-0001' },
        update: {
          patientId: patient.id,
          hospitalId: hospital.id,
          departmentId: medicalDepartment.id,
          admittedById: actor.id,
          attendingDoctorId: actor.id,
          admissionDate: dateOffset(-1, 4),
          status: 'ADMITTED',
          admissionReason: 'Synthetic inpatient admission.',
          admissionDiagnosis: 'Sample diagnosis',
        },
        create: {
          admissionNumber: 'DEMO-IPD-0001',
          patientId: patient.id,
          hospitalId: hospital.id,
          departmentId: medicalDepartment.id,
          admittedById: actor.id,
          attendingDoctorId: actor.id,
          admissionDate: dateOffset(-1, 4),
          status: 'ADMITTED',
          admissionReason: 'Synthetic inpatient admission.',
          admissionDiagnosis: 'Sample diagnosis',
        },
        select: { id: true },
      });

      const allocation = await tx.iPDBedAllocation.findFirst({
        where: {
          admissionId: admission.id,
          bedId: occupiedBed.id,
          releasedAt: null,
        },
        select: { id: true },
      });
      if (!allocation) {
        await tx.iPDBedAllocation.create({
          data: {
            admissionId: admission.id,
            bedId: occupiedBed.id,
            allocatedById: actor.id,
          },
        });
      }

      const existingObservation = await tx.iPDObservation.findFirst({
        where: { admissionId: admission.id },
        select: { id: true },
      });
      if (!existingObservation) {
        await tx.iPDObservation.create({
          data: {
            admissionId: admission.id,
            type: 'ROUTINE',
            temperature: 36.7,
            systolicBP: 118,
            diastolicBP: 76,
            pulseRate: 70,
            oxygenSaturation: 98,
            notes: 'Synthetic routine observation.',
            recordedById: actor.id,
          },
        });
      }

      const existingNursingNote = await tx.iPDNursingNote.findFirst({
        where: { admissionId: admission.id },
        select: { id: true },
      });
      if (!existingNursingNote) {
        await tx.iPDNursingNote.create({
          data: {
            admissionId: admission.id,
            note: 'Synthetic nursing progress note.',
            careProvided: 'Routine inpatient care.',
            recordedById: actor.id,
          },
        });
      }

      const labTest = await tx.labTest.upsert({
        where: {
          hospitalId_code: { hospitalId: hospital.id, code: 'DEMO-CBC' },
        },
        update: { name: 'Sample complete blood count', isActive: true },
        create: {
          hospitalId: hospital.id,
          code: 'DEMO-CBC',
          name: 'Sample complete blood count',
          description: 'Synthetic test catalogue entry.',
          specimenType: 'Whole blood',
          unit: '10^9/L',
          referenceRange: '4.0-11.0',
          price: new Prisma.Decimal(1200),
        },
        select: { id: true },
      });

      const labRequest = await tx.labRequest.upsert({
        where: { requestNumber: 'DEMO-LAB-0001' },
        update: {
          patientId: patient.id,
          hospitalId: hospital.id,
          departmentId: labDepartment.id,
          opdVisitId: visit.id,
          requestedById: actor.id,
          priority: 'ROUTINE',
          status: 'COMPLETED',
        },
        create: {
          requestNumber: 'DEMO-LAB-0001',
          patientId: patient.id,
          hospitalId: hospital.id,
          departmentId: labDepartment.id,
          opdVisitId: visit.id,
          requestedById: actor.id,
          priority: 'ROUTINE',
          status: 'COMPLETED',
          clinicalNotes: 'Synthetic laboratory request.',
        },
        select: { id: true },
      });
      let labItem = await tx.labRequestItem.findFirst({
        where: { requestId: labRequest.id, testId: labTest.id },
        select: { id: true },
      });
      if (labItem) {
        labItem = await tx.labRequestItem.update({
          where: { id: labItem.id },
          data: { status: 'VERIFIED' },
          select: { id: true },
        });
      } else {
        labItem = await tx.labRequestItem.create({
          data: {
            requestId: labRequest.id,
            testId: labTest.id,
            status: 'VERIFIED',
          },
          select: { id: true },
        });
      }
      await tx.labSample.upsert({
        where: { requestItemId: labItem.id },
        update: {
          status: 'PROCESSED',
          collectedAt: sampleCollectedAt,
          receivedAt: sampleReceivedAt,
        },
        create: {
          sampleNumber: 'DEMO-SAMPLE-0001',
          requestItemId: labItem.id,
          specimenType: 'Whole blood',
          status: 'PROCESSED',
          collectedById: actor.id,
          collectedAt: sampleCollectedAt,
          receivedAt: sampleReceivedAt,
        },
      });
      await tx.labResult.upsert({
        where: { requestItemId: labItem.id },
        update: {
          resultValue: '7.2',
          status: 'VERIFIED',
          verifiedById: actor.id,
          verifiedAt: dateOffset(0, 5),
        },
        create: {
          requestItemId: labItem.id,
          resultValue: '7.2',
          unit: '10^9/L',
          referenceRange: '4.0-11.0',
          interpretation: 'Within sample reference range.',
          status: 'VERIFIED',
          enteredById: actor.id,
          verifiedById: actor.id,
          verifiedAt: dateOffset(0, 5),
        },
      });

      const medicineLow = await tx.medicine.upsert({
        where: {
          hospitalId_code: { hospitalId: hospital.id, code: 'DEMO-MED-LOW' },
        },
        update: {
          name: 'Sample medicine - low stock',
          status: 'ACTIVE',
          reorderLevel: 10,
        },
        create: {
          hospitalId: hospital.id,
          departmentId: pharmacyDepartment.id,
          code: 'DEMO-MED-LOW',
          name: 'Sample medicine - low stock',
          genericName: 'Demo ingredient A',
          strength: '500 mg',
          dosageForm: 'Tablet',
          unit: 'tablet',
          reorderLevel: 10,
        },
        select: { id: true },
      });
      const medicineStocked = await tx.medicine.upsert({
        where: {
          hospitalId_code: { hospitalId: hospital.id, code: 'DEMO-MED-STOCK' },
        },
        update: {
          name: 'Sample medicine - in stock',
          status: 'ACTIVE',
          reorderLevel: 10,
        },
        create: {
          hospitalId: hospital.id,
          departmentId: pharmacyDepartment.id,
          code: 'DEMO-MED-STOCK',
          name: 'Sample medicine - in stock',
          genericName: 'Demo ingredient B',
          strength: '250 mg',
          dosageForm: 'Capsule',
          unit: 'capsule',
          reorderLevel: 10,
        },
        select: { id: true },
      });

      const batchLow = await tx.medicineBatch.upsert({
        where: {
          hospitalId_medicineId_batchNumber: {
            hospitalId: hospital.id,
            medicineId: medicineLow.id,
            batchNumber: 'DEMO-BATCH-LOW',
          },
        },
        update: {
          quantity: 3,
          expiryDate: dateOffset(30),
          unitCost: new Prisma.Decimal(2.5),
        },
        create: {
          hospitalId: hospital.id,
          departmentId: pharmacyDepartment.id,
          medicineId: medicineLow.id,
          batchNumber: 'DEMO-BATCH-LOW',
          quantity: 3,
          expiryDate: dateOffset(30),
          unitCost: new Prisma.Decimal(2.5),
        },
        select: { id: true },
      });
      await tx.medicineBatch.upsert({
        where: {
          hospitalId_medicineId_batchNumber: {
            hospitalId: hospital.id,
            medicineId: medicineStocked.id,
            batchNumber: 'DEMO-BATCH-STOCK',
          },
        },
        update: {
          quantity: 80,
          expiryDate: dateOffset(240),
          unitCost: new Prisma.Decimal(5),
        },
        create: {
          hospitalId: hospital.id,
          departmentId: pharmacyDepartment.id,
          medicineId: medicineStocked.id,
          batchNumber: 'DEMO-BATCH-STOCK',
          quantity: 80,
          expiryDate: dateOffset(240),
          unitCost: new Prisma.Decimal(5),
        },
      });
      await tx.stockMovement.upsert({
        where: { id: '00000000-0000-4000-8000-000000000001' },
        update: { quantity: 3, balanceAfter: 3, type: 'ADJUSTMENT_IN' },
        create: {
          id: '00000000-0000-4000-8000-000000000001',
          hospitalId: hospital.id,
          departmentId: pharmacyDepartment.id,
          medicineId: medicineLow.id,
          batchId: batchLow.id,
          type: 'ADJUSTMENT_IN',
          quantity: 3,
          balanceAfter: 3,
          reference: 'DEMO-SEED',
          reason: 'Synthetic opening stock.',
          performedById: actor.id,
        },
      });

      const supplier = await tx.supplier.upsert({
        where: {
          hospitalId_code: { hospitalId: hospital.id, code: 'DEMO-SUP-001' },
        },
        update: { name: 'Sample Medical Supplier', isActive: true },
        create: {
          hospitalId: hospital.id,
          departmentId: pharmacyDepartment.id,
          code: 'DEMO-SUP-001',
          name: 'Sample Medical Supplier',
          contactPerson: 'Sample Contact',
          phone: '0110000002',
          email: 'supplier@example.invalid',
          address: 'Sample supplier address',
        },
        select: { id: true },
      });
      const order = await tx.purchaseOrder.upsert({
        where: { orderNumber: 'DEMO-PO-0001' },
        update: {
          status: 'ORDERED',
          supplierId: supplier.id,
          createdById: actor.id,
        },
        create: {
          orderNumber: 'DEMO-PO-0001',
          hospitalId: hospital.id,
          departmentId: pharmacyDepartment.id,
          supplierId: supplier.id,
          status: 'ORDERED',
          createdById: actor.id,
          expectedDate: dateOffset(7),
          notes: 'Synthetic purchase order.',
        },
        select: { id: true },
      });
      await tx.purchaseOrderItem.upsert({
        where: {
          purchaseOrderId_medicineId: {
            purchaseOrderId: order.id,
            medicineId: medicineLow.id,
          },
        },
        update: { orderedQuantity: 50, unitCost: new Prisma.Decimal(2.5) },
        create: {
          purchaseOrderId: order.id,
          medicineId: medicineLow.id,
          orderedQuantity: 50,
          receivedQuantity: 0,
          unitCost: new Prisma.Decimal(2.5),
        },
      });

      const procedure = await tx.radiologyProcedure.upsert({
        where: {
          hospitalId_code: { hospitalId: hospital.id, code: 'DEMO-XRAY-001' },
        },
        update: { name: 'Sample chest radiograph', status: 'ACTIVE' },
        create: {
          hospitalId: hospital.id,
          departmentId: radiologyDepartment.id,
          code: 'DEMO-XRAY-001',
          name: 'Sample chest radiograph',
          modality: 'XRAY',
          description: 'Synthetic procedure catalogue entry.',
          estimatedDurationMinutes: 20,
        },
        select: { id: true },
      });
      const equipment = await tx.imagingEquipment.upsert({
        where: {
          hospitalId_assetCode: {
            hospitalId: hospital.id,
            assetCode: 'DEMO-XR-EQUIP-001',
          },
        },
        update: { name: 'Sample X-ray equipment', status: 'OPERATIONAL' },
        create: {
          hospitalId: hospital.id,
          departmentId: radiologyDepartment.id,
          assetCode: 'DEMO-XR-EQUIP-001',
          name: 'Sample X-ray equipment',
          modality: 'XRAY',
          manufacturer: 'Sample Manufacturer',
          location: 'Radiology room 1',
          status: 'OPERATIONAL',
        },
        select: { id: true },
      });
      const radiologyRequest = await tx.radiologyRequest.upsert({
        where: {
          hospitalId_requestNumber: {
            hospitalId: hospital.id,
            requestNumber: 'DEMO-RAD-0001',
          },
        },
        update: {
          patientId: patient.id,
          departmentId: radiologyDepartment.id,
          procedureId: procedure.id,
          opdVisitId: visit.id,
          requestedById: actor.id,
          status: 'SCHEDULED',
        },
        create: {
          hospitalId: hospital.id,
          departmentId: radiologyDepartment.id,
          requestNumber: 'DEMO-RAD-0001',
          patientId: patient.id,
          procedureId: procedure.id,
          opdVisitId: visit.id,
          requestedById: actor.id,
          clinicalIndication: 'Synthetic imaging request.',
          priority: 'ROUTINE',
          status: 'SCHEDULED',
        },
        select: { id: true },
      });
      const appointment = await tx.radiologyAppointment.findFirst({
        where: {
          hospitalId: hospital.id,
          requestId: radiologyRequest.id,
          equipmentId: equipment.id,
        },
        select: { id: true },
      });
      if (appointment) {
        await tx.radiologyAppointment.update({
          where: { id: appointment.id },
          data: {
            scheduledStart: dateOffset(1, 5),
            scheduledEnd: dateOffset(1, 6),
            status: 'SCHEDULED',
          },
        });
      } else {
        await tx.radiologyAppointment.create({
          data: {
            hospitalId: hospital.id,
            requestId: radiologyRequest.id,
            equipmentId: equipment.id,
            createdById: actor.id,
            scheduledStart: dateOffset(1, 5),
            scheduledEnd: dateOffset(1, 6),
            status: 'SCHEDULED',
          },
        });
      }

      const encounter = await tx.emergencyEncounter.upsert({
        where: {
          hospitalId_encounterNumber: {
            hospitalId: hospital.id,
            encounterNumber: 'DEMO-ER-0001',
          },
        },
        update: {
          departmentId: emergencyDepartment.id,
          patientId: patient.id,
          registeredById: actor.id,
          status: 'WAITING',
          chiefComplaint: 'Sample emergency presentation.',
        },
        create: {
          hospitalId: hospital.id,
          departmentId: emergencyDepartment.id,
          patientId: patient.id,
          encounterNumber: 'DEMO-ER-0001',
          arrivalMode: 'WALK_IN',
          chiefComplaint: 'Sample emergency presentation.',
          registeredById: actor.id,
          status: 'WAITING',
        },
        select: { id: true },
      });
      const triage = await tx.emergencyTriage.findFirst({
        where: { encounterId: encounter.id },
        select: { id: true },
      });
      if (!triage) {
        await tx.emergencyTriage.create({
          data: {
            encounterId: encounter.id,
            category: 'LESS_URGENT',
            chiefComplaint: 'Sample emergency presentation.',
            symptoms: 'Synthetic sample symptoms.',
            temperatureC: 36.9,
            systolicBP: 122,
            diastolicBP: 80,
            pulseRate: 76,
            painScore: 2,
            assessedById: actor.id,
          },
        });
      }

      const shift = await tx.hospitalShift.upsert({
        where: {
          hospitalId_code: { hospitalId: hospital.id, code: 'DEMO-DAY' },
        },
        update: { name: 'Sample day shift', isActive: true },
        create: {
          hospitalId: hospital.id,
          departmentId: medicalDepartment.id,
          code: 'DEMO-DAY',
          name: 'Sample day shift',
          startTime: '08:00',
          endTime: '16:00',
          isActive: true,
        },
        select: { id: true },
      });
      const staffAssignment = await tx.hospitalStaffAssignment.upsert({
        where: {
          hospitalId_employeeNumber: {
            hospitalId: hospital.id,
            employeeNumber: 'DEMO-STAFF-001',
          },
        },
        update: {
          userId: actor.id,
          departmentId: medicalDepartment.id,
          jobTitle: 'Sample clinical staff member',
          isPrimary: true,
        },
        create: {
          userId: actor.id,
          hospitalId: hospital.id,
          departmentId: medicalDepartment.id,
          employeeNumber: 'DEMO-STAFF-001',
          jobTitle: 'Sample clinical staff member',
          startDate: dateOffset(-365),
          isPrimary: true,
        },
        select: { id: true },
      });
      const dutyDate = dateOffset(0);
      let duty = await tx.staffDutyAssignment.findFirst({
        where: {
          hospitalId: hospital.id,
          staffAssignmentId: staffAssignment.id,
          shiftId: shift.id,
          dutyDate,
        },
        select: { id: true },
      });
      if (duty) {
        duty = await tx.staffDutyAssignment.update({
          where: { id: duty.id },
          data: {
            departmentId: medicalDepartment.id,
            startsAt: sampleCheckInAt,
            endsAt: sampleShiftEndAt,
            status: 'SCHEDULED',
            assignedById: actor.id,
          },
          select: { id: true },
        });
      } else {
        duty = await tx.staffDutyAssignment.create({
          data: {
            hospitalId: hospital.id,
            departmentId: medicalDepartment.id,
            staffAssignmentId: staffAssignment.id,
            shiftId: shift.id,
            dutyDate,
            startsAt: sampleCheckInAt,
            endsAt: sampleShiftEndAt,
            status: 'SCHEDULED',
            assignedById: actor.id,
          },
          select: { id: true },
        });
      }
      await tx.staffAttendance.upsert({
        where: { dutyAssignmentId: duty.id },
        update: {
          hospitalId: hospital.id,
          status: 'PRESENT',
          checkInAt: sampleCheckInAt,
          checkOutAt: null,
          recordedById: actor.id,
          minutesLate: 0,
        },
        create: {
          hospitalId: hospital.id,
          dutyAssignmentId: duty.id,
          status: 'PRESENT',
          checkInAt: sampleCheckInAt,
          recordedById: actor.id,
          minutesLate: 0,
        },
      });
      const leaveType = await tx.staffLeaveType.upsert({
        where: {
          hospitalId_code: { hospitalId: hospital.id, code: 'DEMO-ANNUAL' },
        },
        update: { name: 'Sample annual leave', isActive: true },
        create: {
          hospitalId: hospital.id,
          code: 'DEMO-ANNUAL',
          name: 'Sample annual leave',
          category: 'ANNUAL',
          description: 'Synthetic leave type for demonstration.',
          isPaid: true,
          requiresApproval: true,
        },
        select: { id: true },
      });
      const leaveApplication = await tx.staffLeaveApplication.findFirst({
        where: {
          hospitalId: hospital.id,
          staffAssignmentId: staffAssignment.id,
          leaveTypeId: leaveType.id,
          reason: 'Synthetic sample leave application.',
        },
        select: { id: true },
      });
      if (leaveApplication) {
        await tx.staffLeaveApplication.update({
          where: { id: leaveApplication.id },
          data: {
            startDate: dateOffset(14),
            endDate: dateOffset(15),
            numberOfDays: new Prisma.Decimal(2),
            status: 'PENDING',
            applicantId: actor.id,
          },
        });
      } else {
        await tx.staffLeaveApplication.create({
          data: {
            hospitalId: hospital.id,
            staffAssignmentId: staffAssignment.id,
            leaveTypeId: leaveType.id,
            startDate: dateOffset(14),
            endDate: dateOffset(15),
            numberOfDays: new Prisma.Decimal(2),
            reason: 'Synthetic sample leave application.',
            status: 'PENDING',
            applicantId: actor.id,
          },
        });
      }

      const assetCategory = await tx.assetCategory.upsert({
        where: {
          hospitalId_code: { hospitalId: hospital.id, code: 'DEMO-MED-EQUIP' },
        },
        update: { name: 'Sample medical equipment', isActive: true },
        create: {
          hospitalId: hospital.id,
          code: 'DEMO-MED-EQUIP',
          name: 'Sample medical equipment',
          description: 'Synthetic asset category.',
        },
        select: { id: true },
      });
      const asset = await tx.hospitalAsset.upsert({
        where: {
          hospitalId_assetCode: {
            hospitalId: hospital.id,
            assetCode: 'DEMO-ASSET-0001',
          },
        },
        update: {
          categoryId: assetCategory.id,
          name: 'Sample patient monitor',
          condition: 'FAIR',
          status: 'UNDER_MAINTENANCE',
          registeredById: actor.id,
        },
        create: {
          hospitalId: hospital.id,
          categoryId: assetCategory.id,
          assetCode: 'DEMO-ASSET-0001',
          name: 'Sample patient monitor',
          manufacturer: 'Sample Manufacturer',
          modelNumber: 'DEMO-MON-1',
          serialNumber: 'DEMO-SERIAL-0001',
          purchaseDate: dateOffset(-180),
          purchasePrice: new Prisma.Decimal(125000),
          condition: 'FAIR',
          status: 'UNDER_MAINTENANCE',
          departmentId: medicalDepartment.id,
          wardId: ward.id,
          registeredById: actor.id,
          locationDescription: 'Sample Medical Ward',
        },
        select: { id: true },
      });

      const maintenanceRequest = await tx.maintenanceRequest.upsert({
        where: {
          hospitalId_requestNumber: {
            hospitalId: hospital.id,
            requestNumber: 'DEMO-MAINT-0001',
          },
        },
        update: {
          assetId: asset.id,
          departmentId: medicalDepartment.id,
          reportedById: actor.id,
          status: 'IN_PROGRESS',
          assignedToId: actor.id,
          reportedAt: sampleMaintenanceReportedAt,
          assignedAt: sampleMaintenanceAssignedAt,
          startedAt: sampleMaintenanceStartedAt,
        },
        create: {
          hospitalId: hospital.id,
          requestNumber: 'DEMO-MAINT-0001',
          requestType: 'ASSET',
          assetId: asset.id,
          departmentId: medicalDepartment.id,
          wardId: ward.id,
          title: 'Sample monitor inspection',
          description: 'Synthetic maintenance request for demonstration.',
          locationDescription: 'Sample Medical Ward',
          priority: 'MEDIUM',
          status: 'IN_PROGRESS',
          reportedById: actor.id,
          assignedToId: actor.id,
          reportedAt: sampleMaintenanceReportedAt,
          assignedAt: sampleMaintenanceAssignedAt,
          startedAt: sampleMaintenanceStartedAt,
        },
        select: { id: true },
      });

      const maintenanceLog = await tx.maintenanceWorkLog.findFirst({
        where: {
          maintenanceRequestId: maintenanceRequest.id,
          description: 'Synthetic inspection work log.',
        },
        select: { id: true },
      });
      if (!maintenanceLog) {
        await tx.maintenanceWorkLog.create({
          data: {
            maintenanceRequestId: maintenanceRequest.id,
            performedById: actor.id,
            workType: 'INSPECTION',
            description: 'Synthetic inspection work log.',
            findings: 'Inspection is in progress.',
            hoursSpent: new Prisma.Decimal(1),
          },
        });
      }
    },
    { maxWait: 10_000, timeout: 60_000 },
  );

  console.log(
    `Demo data is ready for ${DEMO_HOSPITAL_CODE}. Existing non-demo records were not modified.`,
  );
}

seedDemoData()
  .catch((error: unknown) => {
    console.error('Demo data seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
