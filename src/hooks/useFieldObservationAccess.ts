import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useProject } from '../contexts/ProjectContext';
import { supabase } from '../lib/supabase';

export function useFieldObservationAccess() {
  const { userProfile } = useAuth();
  const { currentProject, isProjectOwner } = useProject();
  const [hasAccess, setHasAccess] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAccess();
  }, [userProfile, currentProject]);

  const checkAccess = async () => {
    if (!userProfile || !currentProject) {
      setHasAccess(false);
      setPendingCount(0);
      setLoading(false);
      return;
    }

    const isAdmin = userProfile.role === 'admin' || userProfile.role === 'super_admin';

    if (isProjectOwner || isAdmin) {
      setHasAccess(true);
      await fetchPendingCount(true, true);
    } else {
      const { data: personnelData } = await supabase
        .from('personnel')
        .select('id, field_observation_access, field_observation_approver')
        .eq('user_id', userProfile.id)
        .eq('project_id', currentProject.id)
        .maybeSingle();

      if (personnelData && personnelData.field_observation_access) {
        setHasAccess(true);
        await fetchPendingCount(
          personnelData.field_observation_approver,
          false,
          personnelData.id
        );
      } else {
        setHasAccess(false);
        setPendingCount(0);
      }
    }

    setLoading(false);
  };

  const fetchPendingCount = async (
    isApprover: boolean,
    isAdmin: boolean,
    personnelId?: string
  ) => {
    if (!currentProject || !userProfile) return;

    const { data: reports } = await supabase
      .from('field_observation_reports')
      .select('id, status, responsible_person_1_id, responsible_person_2_id, created_by')
      .eq('project_id', currentProject.id);

    if (!reports) {
      setPendingCount(0);
      return;
    }

    const pending = reports.filter(report => {
      if (report.status === 'pre_approval' && (isApprover || isAdmin)) {
        return true;
      }

      if (report.status === 'waiting_data_entry') {
        if (isAdmin) return true;
        if (personnelId && (report.responsible_person_1_id === personnelId || report.responsible_person_2_id === personnelId)) {
          return true;
        }
      }

      if (report.status === 'open') {
        if (isAdmin) return true;
        if (personnelId && (report.responsible_person_1_id === personnelId || report.responsible_person_2_id === personnelId)) {
          return true;
        }
      }

      if (report.status === 'waiting_close_approval' && (report.created_by === userProfile.id || isAdmin)) {
        return true;
      }

      return false;
    });

    setPendingCount(pending.length);
  };

  return { hasAccess, pendingCount, loading };
}
