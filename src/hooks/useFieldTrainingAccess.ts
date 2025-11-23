import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useProject } from '../contexts/ProjectContext';
import { supabase } from '../lib/supabase';

export function useFieldTrainingAccess() {
  const { userProfile } = useAuth();
  const { currentProject, isProjectOwner } = useProject();
  const [hasAccess, setHasAccess] = useState(false);
  const [isPlanner, setIsPlanner] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAccess();
  }, [userProfile, currentProject]);

  const checkAccess = async () => {
    if (!userProfile || !currentProject) {
      setHasAccess(false);
      setIsPlanner(false);
      setPendingCount(0);
      setLoading(false);
      return;
    }

    const isAdmin = userProfile.role === 'admin' || userProfile.role === 'super_admin';

    if (isProjectOwner || isAdmin) {
      setHasAccess(true);
      setIsPlanner(true);
      await fetchPendingCount(true, true);
    } else {
      const { data: personnelData } = await supabase
        .from('personnel')
        .select('id, field_training_access, field_training_planner')
        .eq('user_id', userProfile.id)
        .eq('project_id', currentProject.id)
        .maybeSingle();

      if (personnelData && personnelData.field_training_access) {
        setHasAccess(true);
        setIsPlanner(personnelData.field_training_planner || false);
        await fetchPendingCount(
          personnelData.field_training_planner || false,
          false,
          personnelData.id
        );
      } else {
        setHasAccess(false);
        setIsPlanner(false);
        setPendingCount(0);
      }
    }

    setLoading(false);
  };

  const fetchPendingCount = async (
    userIsPlanner: boolean,
    isAdmin: boolean,
    personnelId?: string
  ) => {
    if (!currentProject || !userProfile) return;

    const { data: reports } = await supabase
      .from('field_training_reports')
      .select('id, status, organized_by_id, created_by')
      .eq('project_id', currentProject.id);

    if (!reports) {
      setPendingCount(0);
      return;
    }

    const pending = reports.filter(report => {
      // Stage 2: Organizer needs to execute training
      if (report.status === 'planned' && personnelId && report.organized_by_id === personnelId) {
        return true;
      }

      // Approval stage: Planners and admins can approve
      if (report.status === 'awaiting_approval' && (userIsPlanner || isAdmin)) {
        return true;
      }

      return false;
    });

    setPendingCount(pending.length);
  };

  return { hasAccess, isPlanner, pendingCount, loading };
}
