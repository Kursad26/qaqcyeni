import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProjectProvider, useProject } from './contexts/ProjectContext';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { DashboardPage } from './pages/DashboardPage';
import { SuperAdminUsersPage } from './pages/SuperAdminUsersPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { NoProjectPage } from './pages/NoProjectPage';
import { AdminProjectDetailPage } from './pages/AdminProjectDetailPage';
import { ProjectSettingsPage } from './pages/ProjectSettingsPage';
import { ProjectRolesPage } from './pages/ProjectRolesPage';
import { FieldObservationPage } from './pages/FieldObservationPage';
import { FieldObservationFormPage } from './pages/FieldObservationFormPage';
import { FieldTrainingPage } from './pages/FieldTrainingPage';
import { FieldTrainingFormPage } from './pages/FieldTrainingFormPage';
import { TaskManagementPage } from './pages/TaskManagementPage';
import { TaskDetailPage } from './pages/TaskDetailPage';
import { NoiPage } from './pages/NoiPage';

function Router() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { userProjects, loading: projectsLoading } = useProject();
  const path = window.location.pathname;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (path === '/signup') {
      return <SignupPage />;
    }
    return <LoginPage />;
  }

  if (projectsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (userProfile && !userProfile.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Hesap Pasif</h2>
          <p className="text-gray-600 mb-6">
            Hesabınız pasif durumda. Lütfen sistem yöneticiniz ile iletişime geçin.
          </p>
        </div>
      </div>
    );
  }

  const isSuperAdmin = userProfile?.role === 'super_admin';
  const isAdmin = userProfile?.role === 'admin';
  const hasProject = userProjects.length > 0;

  if (path === '/super-admin/users') {
    if (isSuperAdmin) {
      return <SuperAdminUsersPage />;
    }
    window.location.href = '/dashboard';
    return null;
  }

  if (path.startsWith('/admin/projects/')) {
    const parts = path.split('/');
    const projectId = parts[3];

    if (parts[4] === 'settings') {
      return <ProjectSettingsPage projectId={projectId} />;
    }

    if (parts[4] === 'roles') {
      return <ProjectRolesPage projectId={projectId} />;
    }

    return <AdminProjectDetailPage projectId={projectId} />;
  }

  if (path === '/field-observation/new') {
    return <FieldObservationFormPage />;
  }

  if (path.startsWith('/field-observation/') && path !== '/field-observation') {
    const parts = path.split('/');
    const reportId = parts[2];
    return <FieldObservationFormPage reportId={reportId} />;
  }

  if (path === '/field-observation') {
    return <FieldObservationPage />;
  }

  if (path === '/field-training/new') {
    return <FieldTrainingFormPage />;
  }

  if (path.startsWith('/field-training/') && path !== '/field-training') {
    const parts = path.split('/');
    const reportId = parts[2];
    return <FieldTrainingFormPage reportId={reportId} />;
  }

  if (path === '/field-training') {
    return <FieldTrainingPage />;
  }

  if (path === '/task-management/new') {
    return <TaskDetailPage />;
  }

  if (path.startsWith('/task-management/') && path !== '/task-management') {
    const parts = path.split('/');
    const taskId = parts[2];
    return <TaskDetailPage taskId={taskId} />;
  }

  if (path === '/task-management') {
    return <TaskManagementPage />;
  }

  if (path === '/noi') {
    return <NoiPage />;
  }

  if (path === '/projects') {
    if (isSuperAdmin || isAdmin || hasProject) {
      return <ProjectsPage />;
    }
    return <NoProjectPage />;
  }

  if (path === '/') {
    if (isSuperAdmin || isAdmin) {
      return <ProjectsPage />;
    }

    if (hasProject) {
      return <ProjectsPage />;
    }

    return <NoProjectPage />;
  }

  if (hasProject || isSuperAdmin || isAdmin) {
    return <DashboardPage />;
  }

  return <NoProjectPage />;
}

function App() {
  return (
    <AuthProvider>
      <ProjectProvider>
        <Router />
      </ProjectProvider>
    </AuthProvider>
  );
}

export default App;
