export type FieldTrainingStatus =
  | 'planned'
  | 'awaiting_approval'
  | 'completed'
  | 'cancelled';

export type TrainingType = 'internal' | 'external';

export interface FieldTrainingFormData {
  id?: string;
  project_id: string;
  report_number?: string;
  status: FieldTrainingStatus;

  // Stage 1 - Planning
  training_topic: string;
  manufacturing_unit_id: string | null;
  organized_by_id: string | null;
  trainer_name: string;
  recipient_company_1_id: string | null;
  recipient_company_2_id: string | null;
  training_type: TrainingType;
  deadline_date: string;

  // Stage 2 - Execution
  delivery_date: string;
  participant_count: number;
  training_duration: number;
  training_content: string;
  photos: string[];
  documents: string[];

  rejection_reason: string;

  // Completion and Cancellation
  completion_date?: string;
  cancellation_reason?: string;
  cancelled_at?: string;
  cancelled_by?: string;

  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export function getStageFromStatus(status: FieldTrainingStatus): number {
  switch (status) {
    case 'planned':
      return 2;
    case 'awaiting_approval':
    case 'completed':
      return 2;
    default:
      return 1;
  }
}

export function getCompletedStages(status: FieldTrainingStatus): number[] {
  const completed: number[] = [];

  if (['awaiting_approval', 'completed'].includes(status)) {
    completed.push(1, 2);
  }

  return completed;
}

export function canUserEditStage(
  stage: number,
  status: FieldTrainingStatus,
  isCreator: boolean,
  isOrganizer: boolean,
  isPlanner: boolean,
  isAdmin: boolean
): boolean {
  if (isAdmin) return true;

  if (status === 'completed' || status === 'cancelled') {
    return false;
  }

  switch (stage) {
    case 1:
      // Planning stage - creator, organizer, planner or admin can edit when status is 'planned'
      return status === 'planned' && (isCreator || isOrganizer || isPlanner);

    case 2:
      // Execution stage - organizer can edit when status is 'planned'
      // Planner or admin can approve/reject when status is 'awaiting_approval'
      if (status === 'planned' && isOrganizer) return true;
      if (status === 'awaiting_approval' && (isPlanner || isAdmin)) return true;
      return false;

    default:
      return false;
  }
}
