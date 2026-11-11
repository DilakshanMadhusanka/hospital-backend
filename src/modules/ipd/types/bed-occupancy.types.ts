
export type BedOccupancyState =
  | 'OCCUPIED'
  | 'AVAILABLE'
  | 'RESERVED'
  | 'MAINTENANCE'
  | 'OUT_OF_SERVICE'
  | 'INCONSISTENT';

export interface BedOccupancyItem {
  bedId: string;
  bedNumber: string;
  wardId: string;
  wardName: string;
  recordedStatus: string;
  calculatedStatus: BedOccupancyState;
  activeAdmissionId: string | null;
  hasInconsistency: boolean;
}

export interface BedOccupancySummary {
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  reservedBeds: number;
  maintenanceBeds: number;
  outOfServiceBeds: number;
  inconsistentBeds: number;
  usableCapacity: number;
  occupancyRate: number;
}
