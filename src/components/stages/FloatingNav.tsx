import { LayoutDashboard, FolderKanban, Shield, ChevronDown, ClipboardList, GraduationCap, CheckSquare, FileCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useProject } from '../contexts/ProjectContext';
import { useFieldObservationAccess } from '../hooks/useFieldObservationAccess';
import { useFieldTrainingAccess } from '../hooks/useFieldTrainingAccess';
import { useTaskManagementAccess } from '../hooks/useTaskManagementAccess';
import { useNoiAccess } from '../hooks/useNoiAccess';
import { useState } from 'react';

export function FloatingNav() {
  const { userProfile } = useAuth();
  const { currentProject, userProjects, setCurrentProject, isProjectOwner } = useProject();
  const { hasAccess: hasFieldObservationAccess, pendingCount: observationPendingCount } = useFieldObservationAccess();
  const { hasAccess: hasFieldTrainingAccess, pendingCount: trainingPendingCount } = useFieldTrainingAccess();
  const { hasAccess: hasTaskManagementAccess, openTaskCount } = useTaskManagementAccess();
  const { hasAccess: hasNoiAccess, pendingCount: noiPendingCount } = useNoiAccess();
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const currentPath = window.location.pathname;

  const navItems: Array<{
    name: string;
    href: string;
    icon: any;
    roles: string[];
    requiresProject?: boolean;
    checkOwner?: boolean;
    showIfHasProjects?: boolean;
    badgeCount?: number;
    checkFieldObservationAccess?: boolean;
    checkFieldTrainingAccess?: boolean;
    checkTaskManagementAccess?: boolean;
    checkNoiAccess?: boolean;
  }> = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      roles: ['user', 'admin', 'super_admin'],
      requiresProject: true,
    },
    {
      name: 'Saha Gözlem Raporu',
      href: '/field-observation',
      icon: ClipboardList,
      roles: ['user', 'admin', 'super_admin'],
      requiresProject: true,
      badgeCount: observationPendingCount,
      checkFieldObservationAccess: true,
    },
    {
      name: 'Saha Eğitimleri',
      href: '/field-training',
      icon: GraduationCap,
      roles: ['user', 'admin', 'super_admin'],
      requiresProject: true,
      badgeCount: trainingPendingCount,
      checkFieldTrainingAccess: true,
    },
    {
      name: 'Görev Takibi',
      href: '/task-management',
      icon: CheckSquare,
      roles: ['user', 'admin', 'super_admin'],
      requiresProject: true,
      badgeCount: openTaskCount,
      checkTaskManagementAccess: true,
    },
    {
      name: 'NOI Talepleri',
      href: '/noi',
      icon: FileCheck,
      roles: ['user', 'admin', 'super_admin'],
      requiresProject: true,
      badgeCount: noiPendingCount,
      checkNoiAccess: true,
    },
    {
      name: 'Projelerim',
      href: '/projects',
      icon: FolderKanban,
      roles: ['user', 'admin', 'super_admin'],
      requiresProject: false,
      showIfHasProjects: true,
    },
    {
      name: 'Yönetici Paneli',
      href: currentProject ? `/admin/projects/${currentProject.id}` : '/projects',
      icon: FolderKanban,
      roles: ['admin', 'super_admin'],
      requiresProject: true,
      checkOwner: true,
    },
    {
      name: 'Kullanıcı Yönetimi',
      href: '/super-admin/users',
      icon: Shield,
      roles: ['super_admin'],
      requiresProject: false,
    },
  ];

  const filteredItems = navItems.filter((item) => {
    if (!userProfile) return false;
    if (!item.roles.includes(userProfile.role)) return false;
    if (item.checkOwner && !isProjectOwner) return false;
    if (item.requiresProject && !currentProject) return false;
    if (item.showIfHasProjects && userProjects.length === 0) return false;
    if (item.checkFieldObservationAccess && !hasFieldObservationAccess) return false;
    if (item.checkFieldTrainingAccess && !hasFieldTrainingAccess) return false;
    if (item.checkTaskManagementAccess && !hasTaskManagementAccess) return false;
    if (item.checkNoiAccess && !hasNoiAccess) return false;
    return true;
  });

  return (
    <div className="fixed left-0 top-0 h-screen bg-white border-r border-gray-200 shadow-sm z-40 w-64 flex flex-col print:hidden">
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-4">
        {currentProject && (
          <div className="px-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Aktif Proje
            </p>
            <div className="relative">
              <button
                onClick={() => setShowProjectSelector(!showProjectSelector)}
                className="w-full flex items-center justify-between px-2 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
              >
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {currentProject.name}
                  </p>
                  {currentProject.location && (
                    <p className="text-xs text-gray-500 truncate">{currentProject.location}</p>
                  )}
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showProjectSelector ? 'rotate-180' : ''}`} />
              </button>

              {showProjectSelector && userProjects.length > 1 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto z-50">
                  {userProjects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => {
                        setCurrentProject(project);
                        setShowProjectSelector(false);
                        window.location.href = '/dashboard';
                      }}
                      className={`w-full text-left px-3 py-2 hover:bg-gray-50 transition ${
                        project.id === currentProject.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <p className="text-sm font-medium text-gray-900 truncate">{project.name}</p>
                      {project.location && (
                        <p className="text-xs text-gray-500 truncate">{project.location}</p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <nav className="space-y-1">
          {filteredItems.map((item) => {
            const isActive = currentPath === item.href;
            return (
              <a
                key={item.name}
                href={item.href}
                className={`
                  flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 group relative
                  ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                <div className="flex items-center space-x-2">
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'}`} />
                  <span className="font-medium text-sm">{item.name}</span>
                </div>
                {item.badgeCount != null && item.badgeCount > 0 && (
                  <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-red-600 text-white text-xs font-bold rounded-full">
                    {item.badgeCount}
                  </span>
                )}
              </a>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
