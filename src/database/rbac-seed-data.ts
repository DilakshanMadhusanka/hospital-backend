export const permissions = [
  // Hospitals
  { code: 'hospitals.read', description: 'View hospitals' },
  { code: 'hospitals.create', description: 'Create hospitals' },
  { code: 'hospitals.update', description: 'Update hospitals' },

  // Departments
  { code: 'departments.read', description: 'View departments' },
  { code: 'departments.create', description: 'Create departments' },
  { code: 'departments.update', description: 'Update departments' },
  { code: 'departments.delete', description: 'Delete departments' },

  // Wards and beds
  { code: 'wards.read', description: 'View wards' },
  { code: 'wards.manage', description: 'Manage wards' },
  { code: 'beds.read', description: 'View beds' },
  { code: 'beds.manage', description: 'Manage beds' },

  // Hospital services
  { code: 'services.read', description: 'View hospital services' },
  { code: 'services.manage', description: 'Manage hospital services' },

  // Patients
  { code: 'patients.read', description: 'View patient information' },
  { code: 'patients.create', description: 'Register patients' },
  { code: 'patients.update', description: 'Update patient information' },

  // Clinical records
  { code: 'medical_records.read', description: 'View medical records' },
  { code: 'medical_records.create', description: 'Create medical records' },
  { code: 'medical_records.update', description: 'Update medical records' },

  // Pharmacy
  { code: 'pharmacy.read', description: 'View pharmacy information' },
  { code: 'medicines.dispense', description: 'Dispense medicines' },
  { code: 'inventory.manage', description: 'Manage inventory' },

  // Laboratory
  { code: 'laboratory.read', description: 'View laboratory investigations' },
  {
    code: 'laboratory.manage',
    description: 'Manage laboratory investigations',
  },

  // Staff and administration
  { code: 'staff.read', description: 'View hospital staff' },
  { code: 'staff.manage', description: 'Manage hospital staff' },
  { code: 'roles.manage', description: 'Manage roles and permissions' },
  { code: 'billing.read', description: 'View billing information' },
  { code: 'billing.manage', description: 'Manage billing and payments' },

  // OPD management
  { code: 'opd.register', description: 'Register OPD visits' },
  { code: 'opd.queue.read', description: 'View OPD queues' },
  { code: 'opd.queue.manage', description: 'Manage OPD queues' },
  { code: 'opd.visits.read', description: 'View OPD visits' },

  // Doctor management
  { code: 'opd.doctor.assign', description: 'Assign doctors to OPD visits' },
  { code: 'opd.schedules.read', description: 'View doctor schedules' },
  { code: 'opd.schedules.manage', description: 'Manage doctor schedules' },

  // Clinical activities
  { code: 'opd.consultation.manage', description: 'Manage consultations' },
  { code: 'opd.vitals.create', description: 'Record vital signs' },
  { code: 'opd.prescriptions.create', description: 'Create prescriptions' },
  { code: 'opd.investigations.create', description: 'Request investigations' },
];

export const roles = [
  {
    name: 'SYSTEM_ADMIN',
    description: 'Platform-wide administrator',
    permissions: permissions.map((p) => p.code),
  },
  {
    name: 'HOSPITAL_ADMIN',
    description: 'Hospital-level administrator',
    permissions: [
      'hospitals.read',
      'departments.read',
      'departments.create',
      'departments.update',
      'departments.delete',
      'wards.read',
      'wards.manage',
      'beds.read',
      'beds.manage',
      'services.read',
      'services.manage',
      'patients.read',
      'patients.create',
      'patients.update',
      'staff.read',
      'staff.manage',
      'billing.read',
      'billing.manage',
      'opd.queue.read',
      'opd.visits.read',
      'opd.schedules.read',
      'opd.schedules.manage',
    ],
  },
  {
    name: 'DOCTOR',
    description: 'Medical doctor',
    permissions: [
      'patients.read',
      'medical_records.read',
      'medical_records.create',
      'medical_records.update',
      'wards.read',
      'beds.read',
      'laboratory.read',
      'opd.queue.read',
      'opd.visits.read',
      'opd.consultation.manage',
      'opd.prescriptions.create',
      'opd.investigations.create',
      'opd.schedules.read',
    ],
  },
  {
    name: 'NURSE',
    description: 'Nursing staff',
    permissions: [
      'patients.read',
      'medical_records.read',
      'wards.read',
      'beds.read',
      'opd.queue.read',
      'opd.visits.read',
      'opd.vitals.create',
    ],
  },
  {
    name: 'PHARMACIST',
    description: 'Pharmacy staff',
    permissions: [
      'patients.read',
      'pharmacy.read',
      'medicines.dispense',
      'inventory.manage',
    ],
  },
  {
    name: 'LAB_TECHNICIAN',
    description: 'Laboratory staff',
    permissions: ['patients.read', 'laboratory.read', 'laboratory.manage'],
  },
  {
    name: 'RECEPTIONIST',
    description: 'Patient registration staff',
    permissions: [
      'patients.read',
      'patients.create',
      'patients.update',
      'hospitals.read',
      'departments.read',
      'opd.register',
      'opd.queue.read',
      'opd.visits.read',
    ],
  },
  {
    name: 'CASHIER',
    description: 'Hospital cashier',
    permissions: ['patients.read', 'billing.read', 'billing.manage'],
  },
  {
    name: 'RECORDS_OFFICER',
    description: 'Medical records officer',
    permissions: ['patients.read', 'medical_records.read'],
  },
];
