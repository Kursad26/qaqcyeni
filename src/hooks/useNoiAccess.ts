import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useProject } from '../contexts/ProjectContext';
import { supabase } from '../lib/supabase';
import { shouldShowInPending, NoiRequest } from '../lib/noiTypes';

interface NoiAccessPermissions {
  hasAccess: boolean;
  isApprover: boolean;
  hasCreateAccess: boolean;
  personnelId: string | null;
  pendingCount: number;
  loading: boolean;
}

export function useNoiAccess(): NoiAccessPermissions {
  const { userProfile } = useAuth();
  const { currentProject } = useProject();
  const [hasAccess, setHasAccess] = useState(false);
  const [isApprover, setIsApprover] = useState(false);
  const [hasCreateAccess, setHasCreateAccess] = useState(false);
  const [personnelId, setPersonnelId] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAccess();
  }, [userProfile, currentProject]);

  const checkAccess = async () => {
    if (!userProfile || !currentProject) {
      setLoading(false);
      return;
    }

    // Admins and super admins have full access
    const isAdmin = userProfile.role === 'admin' || userProfile.role === 'super_admin';

    if (isAdmin) {
      setHasAccess(true);
      setIsApprover(true);
      setHasCreateAccess(true);
      await fetchPendingCount(isAdmin, true, null);
      setLoading(false);
      return;
    }

    // Check personnel permissions
    const { data: personnelData, error } = await supabase
      .from('personnel')
      .select('id, noi_access, noi_approver, noi_create')
      .eq('user_id', userProfile.id)
      .eq('project_id', currentProject.id)
      .maybeSingle();

    if (error) {
      console.error('Error checking NOI access:', error);
      setLoading(false);
      return;
    }

    if (personnelData) {
      setHasAccess(personnelData.noi_access);
      setIsApprover(personnelData.noi_approver);
      setHasCreateAccess(personnelData.noi_create || false);
      setPersonnelId(personnelData.id);
      await fetchPendingCount(isAdmin, personnelData.noi_approver, personnelData.id);
    }

    setLoading(false);
  };

  const fetchPendingCount = async (
    isAdmin: boolean,
    isApprover: boolean,
    personnelId: string | null
  ) => {
    if (!currentProject || !userProfile) return;

    const { data: nois, error } = await supabase
      .from('noi_requests')
      .select('id, status, created_by')
      .eq('project_id', currentProject.id);

    if (error || !nois) {
      setPendingCount(0);
      return;
    }

    const pending = nois.filter((noi: NoiRequest) =>
      shouldShowInPending(noi, userProfile.id, isApprover, isAdmin)
    );

    setPendingCount(pending.length);
  };

  return {
    hasAccess,
    isApprover,
    hasCreateAccess,
    personnelId,
    pendingCount,
    loading
  };
}
