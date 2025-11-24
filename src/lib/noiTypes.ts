// NOI (Notice of Inspection - Teslimat Talebi) Modülü Types ve Helper Functions

export type NoiStatus = 'pending_approval' | 'approved' | 'rejected' | 'cancelled' | 'resubmitted';

export type TimeLossGroup =
  | 'Kayıp Zaman Yok'
  | 'Ölçüm Aleti Bekleme'
  | 'Yardımcı Personel Bekleme'
  | 'İmalatın Sonlanmaması'
  | 'Ortam Şartları';

export type ApprovalDecision = 'Kabul' | 'Red';

export interface NoiRequest {
  id: string;
  project_id: string;
  noi_number: string;
  status: NoiStatus;
  date: string;
  time: string;
  company_id: string | null;
  const_personnel_id: string | null;
  qc_personnel_id: string | null;
  location: string | null;
  hold_point_id: string | null;
  manufacturing_unit_id: string | null;
  approval_decision: ApprovalDecision | null;
  delivery_time_minutes: number | null;
  time_loss_minutes: number | null;
  time_loss_group: TimeLossGroup | null;
  notes: string | null;
  postponed_date: string | null;
  revision_number: number;
  original_noi_number: string | null;
  created_by: string;
  created_at: string;
  approved_date: string | null;
  rejected_date: string | null;
  cancelled_date: string | null;
  updated_at: string;
}

export interface NoiRequestWithDetails extends NoiRequest {
  companies?: { name: string };
  const_personnel?: {
    first_name: string;
    last_name: string;
    user_profiles?: { full_name: string };
  };
  qc_personnel?: {
    first_name: string;
    last_name: string;
    user_profiles?: { full_name: string };
  };
  hold_point?: { name: string };
  manufacturing_unit?: { name: string };
  creator?: { full_name: string };
}

export interface NoiSettings {
  id: string;
  project_id: string;
  number_prefix: string;
  current_number: number;
  created_at: string;
  updated_at: string;
}

export interface NoiHistory {
  id: string;
  noi_id: string;
  user_id: string;
  action: string;
  old_status: string | null;
  new_status: string | null;
  notes: string | null;
  created_at: string;
}

export interface NoiCreateRow {
  tempId: string; // Temporary ID for UI tracking
  date: string;
  time: string;
  company_id: string;
  const_personnel_id: string;
  qc_personnel_id: string;
  location: string;
  hold_point_id: string;
  manufacturing_unit_id: string;
}

// Helper function to get status display name
export function getNoiStatusDisplay(status: NoiStatus): string {
  const statusMap: Record<NoiStatus, string> = {
    'pending_approval': 'Talep Aşaması',
    'approved': 'Onaylandı',
    'rejected': 'Reddedildi',
    'cancelled': 'İptal Edildi',
    'resubmitted': 'Tekrar Talep'
  };
  return statusMap[status] || status;
}

// Helper function to get status badge color
export function getNoiStatusColor(status: NoiStatus): string {
  const colorMap: Record<NoiStatus, string> = {
    'pending_approval': 'bg-yellow-100 text-yellow-800',
    'approved': 'bg-green-100 text-green-800',
    'rejected': 'bg-red-100 text-red-800',
    'cancelled': 'bg-gray-100 text-gray-800',
    'resubmitted': 'bg-blue-100 text-blue-800'
  };
  return colorMap[status] || 'bg-gray-100 text-gray-800';
}

// Helper function to format NOI number with revision
export function formatNoiNumber(baseNumber: string, revisionNumber: number): string {
  if (revisionNumber === 0) {
    return baseNumber;
  }
  return `${baseNumber}_r${String(revisionNumber).padStart(2, '0')}`;
}

// Helper function to extract base NOI number (without revision)
export function extractBaseNoiNumber(noiNumber: string): string {
  const parts = noiNumber.split('_r');
  return parts[0];
}

// Helper function to get next revision number from NOI number
export function getNextRevisionNumber(noiNumber: string): number {
  const match = noiNumber.match(/_r(\d+)$/);
  if (match) {
    return parseInt(match[1], 10) + 1;
  }
  return 1;
}

// Helper function to check if user should see NOI in "My Pending NOIs"
export function shouldShowInPending(
  noi: NoiRequest,
  userId: string,
  isApprover: boolean,
  isAdmin: boolean
): boolean {
  // Talep aşamasında - onaycılar ve adminler görür
  if (noi.status === 'pending_approval') {
    return isApprover || isAdmin;
  }

  // Reddedilmiş - NOI oluşturan ve adminler görür
  if (noi.status === 'rejected') {
    return noi.created_by === userId || isAdmin;
  }

  // Onaylandı veya iptal edildi - kimse görmez
  return false;
}

// Time loss groups
export const TIME_LOSS_GROUPS: TimeLossGroup[] = [
  'Kayıp Zaman Yok',
  'Ölçüm Aleti Bekleme',
  'Yardımcı Personel Bekleme',
  'İmalatın Sonlanmaması',
  'Ortam Şartları'
];

// Approval decisions
export const APPROVAL_DECISIONS: ApprovalDecision[] = ['Kabul', 'Red'];

// Validate NOI create row
export function validateNoiRow(row: NoiCreateRow): string | null {
  if (!row.date) return 'Tarih boş olamaz';
  if (!row.time) return 'Saat boş olamaz';
  if (!row.company_id) return 'Firma seçilmelidir';
  if (!row.const_personnel_id) return 'Const Personel seçilmelidir';
  if (!row.qc_personnel_id) return 'QC Personel seçilmelidir';
  if (!row.location || row.location.trim() === '') return 'Mahal boş olamaz';
  if (!row.hold_point_id) return 'Hold Point seçilmelidir';
  if (!row.manufacturing_unit_id) return 'İmalat Birimi seçilmelidir';
  return null;
}
