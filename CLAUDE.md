# CLAUDE.md - AI Assistant Guide for QAQCYENI

**Project**: QAQCYENI - Kalite Kontrol Sistemi (Construction Quality Control System)
**Last Updated**: 2025-11-18
**Tech Stack**: React + TypeScript + Vite + Supabase + Tailwind CSS

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Overview](#architecture-overview)
4. [Development Setup](#development-setup)
5. [Codebase Structure](#codebase-structure)
6. [Key Conventions](#key-conventions)
7. [Module Details](#module-details)
8. [Database Schema](#database-schema)
9. [Common Tasks](#common-tasks)
10. [Important Patterns](#important-patterns)
11. [Tips for AI Assistants](#tips-for-ai-assistants)

---

## Project Overview

QAQCYENI is a comprehensive construction quality control and management system designed for tracking field observations, training, tasks, and inspections across multiple construction projects.

### Key Features
- **Multi-project Management**: Users can work across multiple construction projects
- **Role-based Access**: Super Admin, Admin, User roles with granular permissions
- **Field Observation Reports**: Track construction issues with photo documentation
- **Field Training**: Manage internal/external training sessions
- **Task Management**: Kanban-style task tracking with assignments and work logs
- **NOI System**: Notice of Inspection requests with approval workflows
- **Turkish Language**: All user-facing content in Turkish

### User Roles
- **Super Admin**: Full system access, can manage all users and projects
- **Admin**: Can create and own projects, manage project users
- **User**: Project-specific access based on personnel assignments

---

## Technology Stack

### Frontend
- **React** 18.3.1 - UI library
- **TypeScript** 5.5.3 - Type safety
- **Vite** 5.4.2 - Build tool with HMR
- **Tailwind CSS** 3.4.1 - Utility-first styling
- **Lucide React** 0.344.0 - Icon library

### Backend & Services
- **Supabase** - PostgreSQL database, authentication, storage
- **Cloudinary** - Image hosting and optimization (preferred over Supabase Storage)

### Development Tools
- **ESLint** - Code linting
- **TypeScript** - Strict type checking
- **npm** - Package management

### Environment Variables Required
```bash
VITE_SUPABASE_URL=              # Your Supabase project URL
VITE_SUPABASE_ANON_KEY=         # Supabase anonymous key
VITE_CLOUDINARY_CLOUD_NAME=     # Cloudinary cloud name (optional, for image uploads)
VITE_CLOUDINARY_API_KEY=        # Cloudinary API key (optional)
VITE_CLOUDINARY_API_SECRET=     # Cloudinary API secret (optional)
```

---

## Architecture Overview

### Frontend Architecture
```
┌─────────────────────────────────────────┐
│         App.tsx (Router)                 │
│  ┌───────────────────────────────────┐  │
│  │   AuthContext (Authentication)     │  │
│  │   ProjectContext (Current Project) │  │
│  └───────────────────────────────────┘  │
│                    │                     │
│         ┌──────────┴──────────┐         │
│         │                      │         │
│    Layout Component     ProtectedRoute   │
│         │                      │         │
│   FloatingNav           Page Components  │
└─────────────────────────────────────────┘
```

### Data Flow
1. User authenticates via Supabase Auth
2. AuthContext loads user profile from `user_profiles` table
3. ProjectContext loads user's projects and sets current project
4. Pages check access via personnel table and module flags
5. Data fetched from Supabase based on project context
6. Images uploaded to Cloudinary with optimization

### Key Contexts
- **AuthContext** (`src/contexts/AuthContext.tsx`): User authentication, profile management
- **ProjectContext** (`src/contexts/ProjectContext.tsx`): Current project selection, persistence

---

## Development Setup

### Initial Setup
```bash
# Clone repository
git clone <repo-url>
cd qaqcyeni

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your Supabase credentials

# Run development server
npm run dev
```

### Available Scripts
```bash
npm run dev        # Start Vite dev server (http://localhost:5173)
npm run build      # Build for production
npm run lint       # Run ESLint
npm run preview    # Preview production build
npm run typecheck  # TypeScript type checking
```

### First-Time Database Setup
1. Create Supabase project
2. Apply migrations from `supabase/migrations/` (57 migration files)
3. Create super admin user (see `setup-super-admin.md`)
4. Super admin can then promote other users to admin

---

## Codebase Structure

```
/home/user/qaqcyeni/
├── src/
│   ├── components/          # Reusable React components
│   │   ├── stages/         # Multi-stage workflow components
│   │   ├── Layout.tsx      # Main layout wrapper
│   │   ├── FloatingNav.tsx # Navigation sidebar
│   │   ├── ProtectedRoute.tsx
│   │   └── ...            # 20+ other components
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   └── ProjectContext.tsx
│   ├── hooks/              # Custom React hooks
│   │   ├── useFieldObservationAccess.ts
│   │   ├── useFieldTrainingAccess.ts
│   │   ├── useTaskManagementAccess.ts
│   │   └── useNoiAccess.ts
│   ├── lib/
│   │   ├── supabase.ts     # Supabase client & types
│   │   ├── fieldObservationUtils.ts
│   │   ├── fieldTrainingUtils.ts
│   │   ├── taskManagementUtils.ts
│   │   └── noiUtils.ts
│   ├── pages/              # Page components (13 pages)
│   │   ├── DashboardPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── FieldObservationPage.tsx
│   │   ├── FieldTrainingPage.tsx
│   │   ├── TaskManagementPage.tsx
│   │   ├── NoiPage.tsx
│   │   └── ...
│   ├── App.tsx             # Main app with routing
│   ├── main.tsx            # React entry point
│   └── index.css           # Tailwind imports
├── supabase/
│   └── migrations/         # 57 SQL migration files
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── .env
```

### Key Files
- **src/lib/supabase.ts**: Supabase client singleton + all TypeScript types for database tables
- **src/App.tsx**: Client-side routing logic
- **src/contexts/**: Global state management
- **src/hooks/**: Module-specific access control hooks
- **src/lib/*Utils.ts**: Helper functions and type definitions for each module

---

## Key Conventions

### Naming Conventions
- **Files**: PascalCase for components (`FieldObservationPage.tsx`)
- **Functions/Hooks**: camelCase (`useFieldObservationAccess`)
- **Types/Interfaces**: PascalCase (`FieldObservationFormData`)
- **Database Tables**: snake_case (`field_observation_reports`)
- **Database Columns**: snake_case (`admin_id`, `is_active`)

### Code Style
- **Language**: Turkish for UI text, English for code
- **Comments**: Mix of Turkish and English
- **Indentation**: 2 spaces
- **Quotes**: Single quotes for strings
- **Semicolons**: Used consistently

### Component Structure
```typescript
// 1. Imports
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// 2. Type definitions
interface MyComponentProps {
  id: string;
}

// 3. Component
export function MyComponent({ id }: MyComponentProps) {
  // Hooks
  const { userProfile } = useAuth();
  const [data, setData] = useState(null);

  // Effects
  useEffect(() => {
    // Fetch data
  }, []);

  // Handlers
  const handleSubmit = async () => {
    // Logic
  };

  // Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
}
```

### Access Control Pattern
```typescript
// Check user role
const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super_admin';

// Check project ownership
const isProjectOwner = currentProject?.admin_id === userProfile?.id;

// Check personnel-based module access
const { data: personnelData } = await supabase
  .from('personnel')
  .select('field_observation_access, field_observation_admin')
  .eq('user_id', userProfile.id)
  .eq('project_id', currentProject.id)
  .maybeSingle();

const hasModuleAccess = personnelData?.field_observation_access === true;
const isModuleAdmin = personnelData?.field_observation_admin === true;
```

---

## Module Details

### 1. Field Observation (Saha Gözlem Raporu)

**Purpose**: Track construction defects and issues with photo documentation

**Workflow Stages** (5 stages):
1. **Form Creation**: Basic info, location, severity (major/minor)
2. **Pre-approval**: Admin/module admin approves report
3. **Data Entry**: Responsible personnel adds details and photos
4. **Closing Process**: Resolution details and after photos
5. **Closing Approval**: Admin approves closure (on-time or late)

**Key Files**:
- `src/pages/FieldObservationPage.tsx` - List view
- `src/pages/FieldObservationFormPage.tsx` - Multi-stage form
- `src/components/stages/FieldObservationStage*.tsx` - Individual stages
- `src/lib/fieldObservationUtils.ts` - Types and helpers

**Database Tables**:
- `field_observation_reports` - Main report data
- `field_observation_settings` - Report numbering config
- `field_observation_history` - Audit trail

**Access Control**:
- Personnel must have `field_observation_access = true`
- Module admins have `field_observation_admin = true`
- Admins and project owners have full access

### 2. Field Training (Saha Eğitimleri)

**Purpose**: Manage and track construction site training sessions

**Workflow Stages** (2 stages):
1. **Training Planning**: Date, type, organizer, participants
2. **Training Execution**: Completion, photos, cancellation

**Key Files**:
- `src/pages/FieldTrainingPage.tsx` - List and detail view
- `src/pages/FieldTrainingFormPage.tsx` - Training form
- `src/lib/fieldTrainingUtils.ts` - Types and helpers

**Database Tables**:
- `field_training_reports` - Training records
- `field_training_settings` - Numbering config
- `field_training_history` - Audit trail

**Training Types**:
- Internal (İç Eğitim)
- External (Dış Eğitim)

### 3. Task Management (Görev Takibi)

**Purpose**: Kanban-style task tracking with assignments and collaboration

**Features**:
- Task creation by any user with access
- Multiple personnel assignments
- Priority levels (High, Medium, Low)
- Custom categories per project
- Comments with notifications
- Work logs with photo documentation
- Status workflow with approval

**Statuses**:
- Open (Açık)
- In Progress (Devam Ediyor)
- Pending Approval (Onay Bekliyor)
- Closed (Kapatıldı)
- Cancelled (İptal Edildi)

**Key Files**:
- `src/pages/TaskManagementPage.tsx` - Main kanban view
- `src/pages/TaskDetailPage.tsx` - Task detail view
- `src/components/TaskViewSidePanel.tsx` - Side panel view
- `src/components/TaskEditSidePanel.tsx` - Edit panel
- `src/lib/taskManagementUtils.ts` - Types and helpers

**Database Tables**:
- `task_management_tasks` - Main task records
- `task_management_assignments` - Personnel assignments
- `task_management_comments` - Task comments
- `task_management_notifications` - User notifications
- `task_management_work_logs` - Work log entries
- `task_management_work_log_photos` - Work log photos
- `task_management_categories` - Custom categories
- `task_management_history` - Change tracking

**Access Control**:
- Any user with `task_management_access = true` can create tasks
- Task owners can edit/close their tasks
- Module admins have full access to all tasks

### 4. NOI - Notice of Inspection (Teslimat Talebi)

**Purpose**: Manage inspection requests and approvals

**Features**:
- Inspection date/time scheduling
- Hold point selection
- Approval workflow
- Revision tracking
- Time loss monitoring
- Batch creation

**Statuses**:
- Pending Approval (Onay Bekliyor)
- Approved (Onaylandı)
- Rejected (Reddedildi)
- Cancelled (İptal Edildi)

**Key Files**:
- `src/pages/NoiPage.tsx` - List and management
- `src/components/NoiCreateModal.tsx` - Creation modal
- `src/components/NoiEditModal.tsx` - Edit modal
- `src/lib/noiUtils.ts` - Types and helpers

**Database Tables**:
- `noi_requests` - Inspection requests
- `noi_settings` - Numbering config
- `noi_history` - Audit trail

---

## Database Schema

### Core Tables

**user_profiles**
- `id` (UUID, references auth.users)
- `email`, `full_name`, `phone`
- `role` (super_admin | admin | user)
- `is_active` (boolean)
- Auto-created via trigger when user signs up

**projects**
- `id` (UUID)
- `name`, `location`, `description`
- `admin_id` (references user_profiles)
- `is_active` (boolean)

**project_users** (junction table)
- `project_id`, `user_id`
- Links users to projects they can access

**personnel**
- `id` (UUID)
- `project_id`, `user_id` (optional)
- `company_id`, `full_name`, `phone`, `email`
- Module access flags:
  - `field_observation_access`, `field_observation_admin`
  - `field_training_access`, `field_training_admin`
  - `task_management_access`, `task_management_admin`
  - `noi_access`, `noi_admin`
- `dashboard_access` (boolean)

**companies**
- `id` (UUID)
- `project_id`
- `name`, `category` (employer | contractor | subcontractor)
- `tax_number`, `tax_office`, `address`
- Contact details

### Project Configuration Tables

**project_buildings** / **project_blocks** / **project_floors**
- Hierarchical location structure
- Building → Block → Floor

**project_manufacturing_units**
- Manufacturing/production units per project

**project_activities**
- Construction activity definitions

**project_control_steps**
- Hold points and control steps for NOI

**project_roles**
- Custom role definitions per project

**project_settings**
- General project configuration

### Module Tables (pattern repeated for each module)

Each module follows this pattern:
- `{module}_settings` - Numbering configuration
- `{module}_reports` or `{module}_tasks` or `{module}_requests` - Main records
- `{module}_history` - Change tracking/audit trail

### Row Level Security (RLS)
- **Enabled** on all tables
- Policies allow authenticated users (application-level checks)
- Special policies for super_admin to view all data
- Project-based access enforced via joins with project_users/personnel

---

## Common Tasks

### Adding a New Page
1. Create page component in `src/pages/MyNewPage.tsx`
2. Add route in `src/App.tsx`
3. Add navigation link in `src/components/FloatingNav.tsx` if needed
4. Implement access control with ProtectedRoute or personnel checks

### Creating a New Module
1. Create database tables following the pattern:
   - `{module}_settings` with report/task numbering
   - `{module}_records` with main data
   - `{module}_history` for audit trail
2. Add columns to `personnel` table for module access
3. Create utilities file: `src/lib/{module}Utils.ts`
4. Create access hook: `src/hooks/use{Module}Access.ts`
5. Create page component: `src/pages/{Module}Page.tsx`
6. Add routing and navigation

### Implementing Image Upload
```typescript
// 1. Resize and compress image
const resizeImage = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      const maxHeight = 600;
      const scale = maxHeight / img.height;
      canvas.width = img.width * scale;
      canvas.height = maxHeight;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas to Blob failed'));
      }, 'image/jpeg', 0.7);
    };
  });
};

// 2. Upload to Cloudinary
const uploadToCloudinary = async (blob: Blob) => {
  const formData = new FormData();
  formData.append('file', blob);
  formData.append('upload_preset', 'unsigned_preset'); // or use signed upload
  formData.append('folder', 'module-name');

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: 'POST', body: formData }
  );

  const data = await response.json();
  return data.secure_url;
};
```

### Adding a Status to Workflow
1. Update type definition in module utils file
2. Update database enum type (via migration)
3. Add status to workflow logic in form/page component
4. Update history tracking to log new status
5. Update status badge colors in UI

### Running Database Migrations
```bash
# Using Supabase CLI
supabase migration up

# Or via Supabase Dashboard
# SQL Editor → Paste migration → Run
```

---

## Important Patterns

### 1. Protected Routes Pattern
```typescript
// In App.tsx
{userProfile && (
  <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
    <AdminOnlyPage />
  </ProtectedRoute>
)}

// ProtectedRoute component checks userProfile.role
```

### 2. Module Access Hook Pattern
```typescript
// src/hooks/useFieldObservationAccess.ts
export function useFieldObservationAccess() {
  const { userProfile } = useAuth();
  const { currentProject } = useProject();
  const [hasAccess, setHasAccess] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAccess() {
      // Check if user is admin/super_admin or has personnel access
      // Count pending reports
      // Set state
    }
    checkAccess();
  }, [userProfile, currentProject]);

  return { hasAccess, pendingCount, loading };
}
```

### 3. Multi-stage Form Pattern
```typescript
// Stage components: Stage1.tsx, Stage2.tsx, etc.
// Main form page manages current stage
const [currentStage, setCurrentStage] = useState(1);
const [formData, setFormData] = useState<FormData>({});

// Pass data down, receive updates up
<Stage1
  data={formData}
  onUpdate={(data) => setFormData({...formData, ...data})}
  onNext={() => setCurrentStage(2)}
/>
```

### 4. History/Audit Trail Pattern
```typescript
// After any status change
await supabase.from('{module}_history').insert({
  {module}_id: recordId,
  changed_by_id: userProfile.id,
  old_status: oldStatus,
  new_status: newStatus,
  changed_at: new Date().toISOString()
});
```

### 5. Personnel Creation Pattern
```typescript
// Create or link personnel when assigning to reports/tasks
const { data: personnel } = await supabase
  .from('personnel')
  .select('*')
  .eq('user_id', userId)
  .eq('project_id', projectId)
  .maybeSingle();

if (!personnel) {
  // Create new personnel record
  const { data: newPersonnel } = await supabase
    .from('personnel')
    .insert({ user_id: userId, project_id: projectId, ... })
    .select()
    .single();
}
```

---

## Tips for AI Assistants

### Before Making Changes
1. **Read the relevant files first**: Always use Read tool before Edit/Write
2. **Understand the module**: Check the module's utils file for types and patterns
3. **Check access control**: Understand who should have access to what you're building
4. **Review database schema**: Ensure you understand table relationships
5. **Check existing patterns**: Look for similar features in other modules

### Language Guidelines
- **UI Text**: Always in Turkish
- **Code**: Variable names, functions in English
- **Comments**: Can be Turkish or English
- **Commit Messages**: English preferred
- **Database**: English names (snake_case)

### Common Pitfalls to Avoid
1. **Don't mix language**: Keep UI text Turkish, code English
2. **Don't skip RLS**: All new tables need RLS policies
3. **Don't forget history**: Always log status changes
4. **Don't hardcode**: Use environment variables for keys
5. **Don't skip type checking**: Use TypeScript properly
6. **Don't forget mobile**: UI should be responsive
7. **Don't skip error handling**: Always handle Supabase errors

### Testing Checklist
- [ ] Works for super_admin role
- [ ] Works for admin role (project owner)
- [ ] Works for regular user with module access
- [ ] Blocked for user without module access
- [ ] Mobile responsive layout
- [ ] Images optimize and upload correctly
- [ ] History/audit trail logs changes
- [ ] Error messages are user-friendly (Turkish)
- [ ] Loading states show correctly
- [ ] Database queries filter by project_id

### Performance Considerations
- **Images**: Always resize to max 600px height, compress to ~400KB
- **Queries**: Filter by project_id early
- **Lists**: Implement pagination for large datasets
- **Photos**: Use Cloudinary CDN, not direct Supabase storage

### Security Reminders
- **Environment Variables**: Never commit `.env` file
- **API Keys**: Use environment variables with VITE_ prefix
- **RLS**: Enable on all new tables
- **Validation**: Validate on both client and server side
- **SQL Injection**: Use parameterized queries (Supabase handles this)

### Debugging Tips
```typescript
// Check user profile
console.log('User Profile:', userProfile);

// Check current project
console.log('Current Project:', currentProject);

// Check Supabase response
const { data, error } = await supabase.from('table').select('*');
console.log('Data:', data);
console.log('Error:', error);

// Check personnel access
const { data: personnel } = await supabase
  .from('personnel')
  .select('*')
  .eq('user_id', userProfile.id)
  .eq('project_id', currentProject.id)
  .maybeSingle();
console.log('Personnel:', personnel);
```

### Quick Reference: File Locations

**Need to modify routing?** → `src/App.tsx`
**Need to add navigation item?** → `src/components/FloatingNav.tsx`
**Need database types?** → `src/lib/supabase.ts`
**Need to add environment variable?** → `.env` + restart dev server
**Need to modify auth logic?** → `src/contexts/AuthContext.tsx`
**Need to modify project selection?** → `src/contexts/ProjectContext.tsx`
**Need to change styles?** → Inline Tailwind classes or `src/index.css`

### When Creating Migrations
1. Use timestamp format: `YYYYMMDDHHMMSS_description.sql`
2. Always test locally first
3. Include both up and down migrations if possible
4. Add comments explaining complex changes
5. Update RLS policies if adding tables
6. Add indexes for foreign keys
7. Add triggers for updated_at columns

---

## Project-Specific Notes

### Current State (as of 2025-11-18)
- Working branch: `claude/claude-md-mi4yq8kj93iekqxn-0185wyECnpS2fpj2dcpJpxx2`
- Clean working directory
- Recent work: Multi-select task filters, pagination fixes
- 57 database migrations applied
- All core modules implemented and working

### Known Technical Debt
- No automated tests
- No CI/CD pipeline
- Some inline styles could be extracted to Tailwind config
- Console.error used instead of proper error tracking service
- No rate limiting on API calls
- No real-time subscriptions (Supabase supports it but not implemented)

### Future Enhancement Ideas
- Automated testing (Jest, React Testing Library)
- Real-time notifications via Supabase subscriptions
- Error tracking service (Sentry)
- Data export to Excel/CSV
- Email notifications
- Advanced reporting and analytics
- Multi-language support (currently Turkish only)
- Mobile app version
- Offline support with sync

### Dependencies to Watch
- Supabase client library (breaking changes possible)
- React 19 migration (when stable)
- Vite 6 (when released)
- TypeScript updates

---

## Getting Help

### Documentation Links
- **React**: https://react.dev
- **TypeScript**: https://www.typescriptlang.org/docs
- **Vite**: https://vitejs.dev
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Supabase**: https://supabase.com/docs
- **Cloudinary**: https://cloudinary.com/documentation

### Project-Specific Files
- Super Admin Setup: `setup-super-admin.md`
- Environment Example: `.env.example`
- Package Dependencies: `package.json`

### Contact
- Repository: (Check git remote)
- Supabase Project: https://fuiyywylsairtoiimvvr.supabase.co

---

**End of CLAUDE.md**

This guide should help AI assistants understand and work effectively with the QAQCYENI codebase. Keep this document updated as the project evolves!
