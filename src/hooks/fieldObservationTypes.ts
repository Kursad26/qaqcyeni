export type FieldObservationStatus =
  | 'pre_approval'
  | 'waiting_data_entry'
  | 'open'
  | 'waiting_close_approval'
  | 'closed_on_time'
  | 'closed_late';

export interface FieldObservationFormData {
  id?: string;
  project_id: string;
  report_number?: string;
  status: FieldObservationStatus;

  company_id: string | null;
  responsible_person_1_id: string | null;
  responsible_person_2_id: string | null;
  building_id: string | null;
  block_id: string | null;
  floor_id: string | null;
  manufacturing_unit_id: string | null;
  activity_id: string | null;
  location_description: string;
  observation_description: string;
  severity: 'major' | 'minor';
  reference_document: string;
  photos: string[];

  root_cause: string;
  suggested_action: string;
  corrective_action_required: boolean;
  planned_close_date: string;

  closing_action: string;
  closing_photos: string[];

  rejection_reason: string;

  created_by?: string;
  created_at?: string;
  data_entry_date?: string;
  closing_date?: string;
  approved_date?: string;
  updated_at?: string;
}

export function getStageFromStatus(status: FieldObservationStatus): number {
  switch (status) {
    case 'pre_approval':
      return 2;
    case 'waiting_data_entry':
      return 3;
    case 'open':
      return 4;
    case 'waiting_close_approval':
      return 5;
    case 'closed_on_time':
    case 'closed_late':
      return 5;
    default:
      return 1;
  }
}

export function getCompletedStages(status: FieldObservationStatus): number[] {
  const completed: number[] = [];

  if (['waiting_data_entry', 'open', 'waiting_close_approval', 'closed_on_time', 'closed_late'].includes(status)) {
    completed.push(1, 2);
  }

  if (['open', 'waiting_close_approval', 'closed_on_time', 'closed_late'].includes(status)) {
    completed.push(3);
  }

  if (['waiting_close_approval', 'closed_on_time', 'closed_late'].includes(status)) {
    completed.push(4);
  }

  if (['closed_on_time', 'closed_late'].includes(status)) {
    completed.push(5);
  }

  return completed;
}

export function canUserEditStage(
  stage: number,
  status: FieldObservationStatus,
  userRole: string | undefined,
  isCreator: boolean,
  isApprover: boolean,
  isResponsible: boolean,
  isAdmin: boolean
): boolean {
  if (isAdmin) return true;

  if (['closed_on_time', 'closed_late'].includes(status)) {
    return false;
  }

  switch (stage) {
    case 1:
      return status === 'pre_approval' && isCreator;

    case 2:
      return status === 'pre_approval' && (isApprover || isAdmin);

    case 3:
      return status === 'waiting_data_entry' && isResponsible;

    case 4:
      return status === 'open' && isResponsible;

    case 5:
      return status === 'waiting_close_approval' && (isCreator || isAdmin);

    default:
      return false;
  }
}
