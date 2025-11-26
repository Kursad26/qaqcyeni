import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, Project } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface ProjectContextType {
  currentProject: Project | null;
  setCurrentProject: (project: Project | null) => void;
  userProjects: Project[];
  loading: boolean;
  isProjectOwner: boolean;
  isProjectMember: boolean;
  hasProjectAccess: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { userProfile } = useAuth();
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUserId, setLastUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserProjects = async () => {
      if (!userProfile) {
        setUserProjects([]);
        setCurrentProject(null);
        setLoading(false);
        setLastUserId(null);
        return;
      }

      // Sadece kullanıcı ID'si değiştiyse projeleri yeniden yükle
      if (userProfile.id === lastUserId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setLastUserId(userProfile.id);

      const projects: Project[] = [];

      if (userProfile.role === 'super_admin') {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          projects.push(...data);
        }
      } else {
        const { data: ownedProjects } = await supabase
          .from('projects')
          .select('*')
          .eq('admin_id', userProfile.id)
          .order('created_at', { ascending: false });

        if (ownedProjects) {
          projects.push(...ownedProjects);
        }

        // Get projects from project_users table
        const { data: userProjects } = await supabase
          .from('project_users')
          .select('project_id, projects(*)')
          .eq('user_id', userProfile.id);

        if (userProjects) {
          const userProjectsList = userProjects
            .filter(up => up.projects)
            .map(up => up.projects)
            .filter(p => !projects.some(ep => ep.id === p.id));

          projects.push(...userProjectsList);
        }

        // Also get projects from personnel table with dashboard_access
        const { data: personnelProjects } = await supabase
          .from('personnel')
          .select('project_id, projects(*)')
          .eq('user_id', userProfile.id)
          .eq('dashboard_access', true);

        if (personnelProjects) {
          const personnelProjectsList = personnelProjects
            .filter(pp => pp.projects)
            .map(pp => pp.projects)
            .filter(p => !projects.some(ep => ep.id === p.id));

          projects.push(...personnelProjectsList);
        }
      }

      setUserProjects(projects);

      const savedProjectId = localStorage.getItem('currentProjectId');
      if (savedProjectId) {
        const savedProject = projects.find(p => p.id === savedProjectId);
        if (savedProject) {
          setCurrentProject(savedProject);
        } else if (projects.length > 0) {
          setCurrentProject(projects[0]);
          localStorage.setItem('currentProjectId', projects[0].id);
        }
      } else if (projects.length > 0) {
        setCurrentProject(projects[0]);
        localStorage.setItem('currentProjectId', projects[0].id);
      }

      setLoading(false);
    };

    fetchUserProjects();
  }, [userProfile]);

  const handleSetCurrentProject = (project: Project | null) => {
    setCurrentProject(project);
    if (project) {
      localStorage.setItem('currentProjectId', project.id);
    } else {
      localStorage.removeItem('currentProjectId');
    }
  };

  const isProjectOwner = currentProject
    ? userProfile?.role === 'super_admin' || currentProject.admin_id === userProfile?.id
    : false;

  const isProjectMember = currentProject && userProfile
    ? userProjects.some(p => p.id === currentProject.id)
    : false;

  const hasProjectAccess = isProjectOwner || isProjectMember;

  return (
    <ProjectContext.Provider
      value={{
        currentProject,
        setCurrentProject: handleSetCurrentProject,
        userProjects,
        loading,
        isProjectOwner,
        isProjectMember,
        hasProjectAccess,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
