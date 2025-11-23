import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useProject } from '../contexts/ProjectContext';
import { supabase } from '../lib/supabase';

export function useTaskManagementAccess() {
  const { userProfile } = useAuth();
  const { currentProject, isProjectOwner } = useProject();
  const [hasAccess, setHasAccess] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [openTaskCount, setOpenTaskCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAccess();
  }, [userProfile, currentProject]);

  const checkAccess = async () => {
    if (!userProfile || !currentProject) {
      setHasAccess(false);
      setIsAdmin(false);
      setOpenTaskCount(0);
      setLoading(false);
      return;
    }

    const isSystemAdmin = userProfile.role === 'admin' || userProfile.role === 'super_admin';

    if (isProjectOwner || isSystemAdmin) {
      setHasAccess(true);
      setIsAdmin(true);
      await fetchOpenTaskCount(true);
    } else {
      const { data: personnelData } = await supabase
        .from('personnel')
        .select('id, task_management_access, task_management_admin')
        .eq('user_id', userProfile.id)
        .eq('project_id', currentProject.id)
        .maybeSingle();

      if (personnelData && personnelData.task_management_access) {
        setHasAccess(true);
        setIsAdmin(personnelData.task_management_admin || false);
        await fetchOpenTaskCount(
          personnelData.task_management_admin || false,
          personnelData.id
        );
      } else {
        setHasAccess(false);
        setIsAdmin(false);
        setOpenTaskCount(0);
      }
    }

    setLoading(false);
  };

  const fetchOpenTaskCount = async (
    userIsAdmin: boolean,
    personnelId?: string
  ) => {
    if (!currentProject || !userProfile) return;

    if (userIsAdmin) {
      const { data: tasks, error } = await supabase
        .from('task_management_tasks')
        .select('id')
        .eq('project_id', currentProject.id)
        .in('status', ['open', 'in_progress', 'pending_approval']);

      if (!error && tasks) {
        setOpenTaskCount(tasks.length);
      }
    } else if (personnelId) {
      const { data: assignments, error } = await supabase
        .from('task_management_assignments')
        .select('task_id, task_management_tasks!inner(id, status)')
        .eq('personnel_id', personnelId);

      if (!error && assignments) {
        const openTasks = assignments.filter(
          (a: any) =>
            a.task_management_tasks &&
            ['open', 'in_progress', 'pending_approval'].includes(
              a.task_management_tasks.status
            )
        );
        setOpenTaskCount(openTasks.length);
      }
    } else {
      const { data: tasks, error } = await supabase
        .from('task_management_tasks')
        .select('id')
        .eq('project_id', currentProject.id)
        .eq('task_owner_id', userProfile.id)
        .in('status', ['open', 'in_progress', 'pending_approval']);

      if (!error && tasks) {
        setOpenTaskCount(tasks.length);
      }
    }
  };

  return { hasAccess, isAdmin, openTaskCount, loading };
}
