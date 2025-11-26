import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Building, Box, Activity, CheckSquare, UserCheck, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { SettingsSection } from './SettingsSection';

interface Project {
  id: string;
  name: string;
  description: string;
}

interface BuildingType {
  id: string;
  project_id: string;
  name: string;
  is_active: boolean;
}

interface Block {
  id: string;
  project_id: string;
  building_id: string | null;
  name: string;
  is_active: boolean;
}

interface Floor {
  id: string;
  project_id: string;
  building_id: string | null;
  block_id: string | null;
  name: string;
  floor_number: number;
  is_active: boolean;
}

interface ManufacturingUnit {
  id: string;
  project_id: string;
  name: string;
  is_active: boolean;
}

interface ActivityType {
  id: string;
  project_id: string;
  name: string;
  is_active: boolean;
  manufacturing_unit_id: string | null;
}

interface ControlStep {
  id: string;
  project_id: string;
  name: string;
  is_active: boolean;
  activity_id: string | null;
}

interface ProjectRole {
  id: string;
  project_id: string;
  name: string;
  is_active: boolean;
}

interface AllowedRole {
  id: string;
  project_id: string;
  role_id: string;
  is_active: boolean;
  project_roles?: { name: string };
}

interface ProjectSettingsTabProps {
  projectId: string;
}

export function ProjectSettingsTab({ projectId }: ProjectSettingsTabProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [buildings, setBuildings] = useState<BuildingType[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [manufacturingUnits, setManufacturingUnits] = useState<ManufacturingUnit[]>([]);
  const [activities, setActivities] = useState<ActivityType[]>([]);
  const [controlSteps, setControlSteps] = useState<ControlStep[]>([]);
  const [projectRoles, setProjectRoles] = useState<ProjectRole[]>([]);
  const [allowedRoles, setAllowedRoles] = useState<AllowedRole[]>([]);
  const [noiConstAllowedRoles, setNoiConstAllowedRoles] = useState<AllowedRole[]>([]);
  const [noiQcAllowedRoles, setNoiQcAllowedRoles] = useState<AllowedRole[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddBuilding, setShowAddBuilding] = useState(false);
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [showAddFloor, setShowAddFloor] = useState(false);
  const [showAddManufacturingUnit, setShowAddManufacturingUnit] = useState(false);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [showAddControlStep, setShowAddControlStep] = useState(false);
  const [showAddAllowedRole, setShowAddAllowedRole] = useState(false);
  const [showAddNoiConstAllowedRole, setShowAddNoiConstAllowedRole] = useState(false);
  const [showAddNoiQcAllowedRole, setShowAddNoiQcAllowedRole] = useState(false);
  const [showEditProjectName, setShowEditProjectName] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [selectedNoiConstRoleId, setSelectedNoiConstRoleId] = useState('');
  const [selectedNoiQcRoleId, setSelectedNoiQcRoleId] = useState('');

  // Hierarchy accordion states
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set());
  const [hierarchySearchTerm, setHierarchySearchTerm] = useState('');
  const [selectedManufacturingUnitId, setSelectedManufacturingUnitId] = useState('');
  const [selectedActivityId, setSelectedActivityId] = useState('');

  const [newBuildingName, setNewBuildingName] = useState('');
  const [newBlockName, setNewBlockName] = useState('');
  const [newFloorName, setNewFloorName] = useState('');
  const [newManufacturingUnitName, setNewManufacturingUnitName] = useState('');
  const [newActivityName, setNewActivityName] = useState('');
  const [newControlStepName, setNewControlStepName] = useState('');
  const [newProjectName, setNewProjectName] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    const { data: projectData } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    const { data: buildingsData } = await supabase
      .from('project_buildings')
      .select('*')
      .eq('project_id', projectId)
      .order('name');

    const { data: blocksData } = await supabase
      .from('project_blocks')
      .select('*')
      .eq('project_id', projectId)
      .order('name');

    const { data: floorsData } = await supabase
      .from('project_floors')
      .select('*')
      .eq('project_id', projectId)
      .order('floor_number');

    const { data: manufacturingUnitsData } = await supabase
      .from('project_manufacturing_units')
      .select('*')
      .eq('project_id', projectId)
      .order('name');

    const { data: activitiesData } = await supabase
      .from('project_activities')
      .select('*, manufacturing_unit_id')
      .eq('project_id', projectId)
      .order('name');

    const { data: controlStepsData } = await supabase
      .from('project_control_steps')
      .select('*, activity_id')
      .eq('project_id', projectId)
      .order('name');

    const { data: rolesData } = await supabase
      .from('project_roles')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .order('name');

    const { data: allowedRolesData } = await supabase
      .from('field_observation_allowed_roles')
      .select('*, project_roles(name)')
      .eq('project_id', projectId)
      .order('created_at');

    const { data: noiConstAllowedRolesData } = await supabase
      .from('noi_const_personnel_allowed_roles')
      .select('*, project_roles(name)')
      .eq('project_id', projectId)
      .order('created_at');

    const { data: noiQcAllowedRolesData } = await supabase
      .from('noi_qc_personnel_allowed_roles')
      .select('*, project_roles(name)')
      .eq('project_id', projectId)
      .order('created_at');

    if (projectData) {
      setProject(projectData);
      setNewProjectName(projectData.name);
    }
    if (buildingsData) setBuildings(buildingsData);
    if (blocksData) setBlocks(blocksData);
    if (floorsData) setFloors(floorsData);
    if (manufacturingUnitsData) setManufacturingUnits(manufacturingUnitsData);
    if (activitiesData) setActivities(activitiesData);
    if (controlStepsData) setControlSteps(controlStepsData);
    if (rolesData) setProjectRoles(rolesData);
    if (allowedRolesData) setAllowedRoles(allowedRolesData as any);
    if (noiConstAllowedRolesData) setNoiConstAllowedRoles(noiConstAllowedRolesData as any);
    if (noiQcAllowedRolesData) setNoiQcAllowedRoles(noiQcAllowedRolesData as any);
    setLoading(false);
  };

  const updateProjectName = async () => {
    if (!newProjectName.trim()) return;

    const { error } = await supabase
      .from('projects')
      .update({ name: newProjectName.trim() })
      .eq('id', projectId);

    if (!error) {
      setShowEditProjectName(false);
      fetchData();
    }
  };

  const addBuilding = async () => {
    if (!newBuildingName.trim()) return;
    await supabase
      .from('project_buildings')
      .insert({ project_id: projectId, name: newBuildingName.trim() });
    setNewBuildingName('');
    setShowAddBuilding(false);
    fetchData();
  };

  const addBlock = async () => {
    if (!newBlockName.trim()) return;
    await supabase
      .from('project_blocks')
      .insert({ project_id: projectId, name: newBlockName.trim() });
    setNewBlockName('');
    setShowAddBlock(false);
    fetchData();
  };

  const addFloor = async () => {
    if (!newFloorName.trim()) return;
    await supabase
      .from('project_floors')
      .insert({
        project_id: projectId,
        name: newFloorName.trim(),
        floor_number: floors.length
      });
    setNewFloorName('');
    setShowAddFloor(false);
    fetchData();
  };

  const addManufacturingUnit = async () => {
    if (!newManufacturingUnitName.trim()) return;
    const { error } = await supabase
      .from('project_manufacturing_units')
      .insert({ project_id: projectId, name: newManufacturingUnitName.trim() });

    if (!error) {
      setSuccessMessage(`"${newManufacturingUnitName.trim()}" eklendi`);
      setNewManufacturingUnitName('');
      fetchData();
      setTimeout(() => setSuccessMessage(''), 2000);
    }
  };

  const addActivity = async () => {
    if (!newActivityName.trim() || !selectedManufacturingUnitId) {
      alert('Lütfen aktivite adı ve imalat birimi seçiniz');
      return;
    }
    const { error } = await supabase
      .from('project_activities')
      .insert({
        project_id: projectId,
        name: newActivityName.trim(),
        manufacturing_unit_id: selectedManufacturingUnitId
      });

    if (!error) {
      setSuccessMessage(`"${newActivityName.trim()}" aktivitesi eklendi`);
      setNewActivityName('');
      // Keep selectedManufacturingUnitId to add more activities to the same unit
      fetchData();
      setTimeout(() => setSuccessMessage(''), 2000);
    }
  };

  const addControlStep = async () => {
    if (!newControlStepName.trim() || !selectedActivityId) {
      alert('Lütfen kontrol adımı adı ve aktivite seçiniz');
      return;
    }
    const { error } = await supabase
      .from('project_control_steps')
      .insert({
        project_id: projectId,
        name: newControlStepName.trim(),
        activity_id: selectedActivityId
      });

    if (!error) {
      setSuccessMessage(`"${newControlStepName.trim()}" kontrol adımı eklendi`);
      setNewControlStepName('');
      // Keep selectedActivityId and selectedManufacturingUnitId to add more steps to the same activity
      fetchData();
      setTimeout(() => setSuccessMessage(''), 2000);
    }
  };

  const toggleBuildingStatus = async (id: string, currentStatus: boolean) => {
    await supabase
      .from('project_buildings')
      .update({ is_active: !currentStatus })
      .eq('id', id);
    fetchData();
  };

  const toggleBlockStatus = async (id: string, currentStatus: boolean) => {
    await supabase
      .from('project_blocks')
      .update({ is_active: !currentStatus })
      .eq('id', id);
    fetchData();
  };

  const toggleFloorStatus = async (id: string, currentStatus: boolean) => {
    await supabase
      .from('project_floors')
      .update({ is_active: !currentStatus })
      .eq('id', id);
    fetchData();
  };

  const toggleManufacturingUnitStatus = async (id: string, currentStatus: boolean) => {
    await supabase
      .from('project_manufacturing_units')
      .update({ is_active: !currentStatus })
      .eq('id', id);
    fetchData();
  };

  const toggleActivityStatus = async (id: string, currentStatus: boolean) => {
    await supabase
      .from('project_activities')
      .update({ is_active: !currentStatus })
      .eq('id', id);
    fetchData();
  };

  const toggleControlStepStatus = async (id: string, currentStatus: boolean) => {
    await supabase
      .from('project_control_steps')
      .update({ is_active: !currentStatus })
      .eq('id', id);
    fetchData();
  };

  const deleteBuilding = async (id: string) => {
    if (!confirm('Bu binayı silmek istediğinizden emin misiniz?')) return;
    await supabase.from('project_buildings').delete().eq('id', id);
    fetchData();
  };

  const deleteBlock = async (id: string) => {
    if (!confirm('Bu bloku silmek istediğinizden emin misiniz?')) return;
    await supabase.from('project_blocks').delete().eq('id', id);
    fetchData();
  };

  const deleteFloor = async (id: string) => {
    if (!confirm('Bu katı silmek istediğinizden emin misiniz?')) return;
    await supabase.from('project_floors').delete().eq('id', id);
    fetchData();
  };

  const deleteManufacturingUnit = async (id: string) => {
    if (!confirm('Bu imalat birimini silmek istediğinizden emin misiniz?')) return;
    await supabase.from('project_manufacturing_units').delete().eq('id', id);
    fetchData();
  };

  const deleteActivity = async (id: string) => {
    if (!confirm('Bu aktiviteyi silmek istediğinizden emin misiniz?')) return;
    await supabase.from('project_activities').delete().eq('id', id);
    fetchData();
  };

  const deleteControlStep = async (id: string) => {
    if (!confirm('Bu kontrol adımını silmek istediğinizden emin misiniz?')) return;
    await supabase.from('project_control_steps').delete().eq('id', id);
    fetchData();
  };

  const addAllowedRole = async () => {
    if (!selectedRoleId) return;

    // Check if role is already added
    const exists = allowedRoles.find(ar => ar.role_id === selectedRoleId);
    if (exists) {
      alert('Bu rol zaten listeye eklenmiş');
      return;
    }

    const { error } = await supabase
      .from('field_observation_allowed_roles')
      .insert({
        project_id: projectId,
        role_id: selectedRoleId,
        is_active: true
      });

    if (error) {
      console.error('Error adding allowed role:', error);
      alert('Rol eklenirken hata oluştu');
    } else {
      setSelectedRoleId('');
      setShowAddAllowedRole(false);
      fetchData();
    }
  };

  const toggleAllowedRoleStatus = async (id: string, currentStatus: boolean) => {
    await supabase
      .from('field_observation_allowed_roles')
      .update({ is_active: !currentStatus })
      .eq('id', id);
    fetchData();
  };

  const deleteAllowedRole = async (id: string) => {
    if (!confirm('Bu rolü listeden kaldırmak istediğinizden emin misiniz?')) return;
    await supabase.from('field_observation_allowed_roles').delete().eq('id', id);
    fetchData();
  };

  // NOI Const Personnel Allowed Roles functions
  const addNoiConstAllowedRole = async () => {
    if (!selectedNoiConstRoleId) return;

    const exists = noiConstAllowedRoles.find(ar => ar.role_id === selectedNoiConstRoleId);
    if (exists) {
      alert('Bu rol zaten listeye eklenmiş');
      return;
    }

    const { error } = await supabase
      .from('noi_const_personnel_allowed_roles')
      .insert({
        project_id: projectId,
        role_id: selectedNoiConstRoleId,
        is_active: true
      });

    if (error) {
      console.error('Error adding const allowed role:', error);
      alert('Rol eklenirken hata oluştu');
    } else {
      setSelectedNoiConstRoleId('');
      setShowAddNoiConstAllowedRole(false);
      fetchData();
    }
  };

  const toggleNoiConstAllowedRoleStatus = async (id: string, currentStatus: boolean) => {
    await supabase
      .from('noi_const_personnel_allowed_roles')
      .update({ is_active: !currentStatus })
      .eq('id', id);
    fetchData();
  };

  const deleteNoiConstAllowedRole = async (id: string) => {
    if (!confirm('Bu rolü listeden kaldırmak istediğinizden emin misiniz?')) return;
    await supabase.from('noi_const_personnel_allowed_roles').delete().eq('id', id);
    fetchData();
  };

  // NOI QC Personnel Allowed Roles functions
  const addNoiQcAllowedRole = async () => {
    if (!selectedNoiQcRoleId) return;

    const exists = noiQcAllowedRoles.find(ar => ar.role_id === selectedNoiQcRoleId);
    if (exists) {
      alert('Bu rol zaten listeye eklenmiş');
      return;
    }

    const { error } = await supabase
      .from('noi_qc_personnel_allowed_roles')
      .insert({
        project_id: projectId,
        role_id: selectedNoiQcRoleId,
        is_active: true
      });

    if (error) {
      console.error('Error adding qc allowed role:', error);
      alert('Rol eklenirken hata oluştu');
    } else {
      setSelectedNoiQcRoleId('');
      setShowAddNoiQcAllowedRole(false);
      fetchData();
    }
  };

  const toggleNoiQcAllowedRoleStatus = async (id: string, currentStatus: boolean) => {
    await supabase
      .from('noi_qc_personnel_allowed_roles')
      .update({ is_active: !currentStatus })
      .eq('id', id);
    fetchData();
  };

  const deleteNoiQcAllowedRole = async (id: string) => {
    if (!confirm('Bu rolü listeden kaldırmak istediğinizden emin misiniz?')) return;
    await supabase.from('noi_qc_personnel_allowed_roles').delete().eq('id', id);
    fetchData();
  };

  const startEdit = (id: string, currentValue: string) => {
    setEditingId(id);
    setEditingValue(currentValue);
  };

  const saveEdit = async (id: string, table: string) => {
    if (!editingValue.trim()) return;
    await supabase
      .from(table)
      .update({ name: editingValue.trim() })
      .eq('id', id);
    setEditingId(null);
    setEditingValue('');
    fetchData();
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingValue('');
  };

  // Hierarchy accordion functions
  const toggleUnit = (unitId: string) => {
    const newExpanded = new Set(expandedUnits);
    if (newExpanded.has(unitId)) {
      newExpanded.delete(unitId);
    } else {
      newExpanded.add(unitId);
    }
    setExpandedUnits(newExpanded);
  };

  const toggleActivity = (activityId: string) => {
    const newExpanded = new Set(expandedActivities);
    if (newExpanded.has(activityId)) {
      newExpanded.delete(activityId);
    } else {
      newExpanded.add(activityId);
    }
    setExpandedActivities(newExpanded);
  };

  // Filter function for hierarchy search
  const filterHierarchy = () => {
    const searchLower = hierarchySearchTerm.toLowerCase();

    if (!searchLower) {
      return {
        units: manufacturingUnits,
        activities: activities,
        controlSteps: controlSteps
      };
    }

    // Filter items based on search term
    const filteredUnits = manufacturingUnits.filter(unit =>
      unit.name.toLowerCase().includes(searchLower)
    );
    const filteredActivities = activities.filter(activity =>
      activity.name.toLowerCase().includes(searchLower)
    );
    const filteredControlSteps = controlSteps.filter(step =>
      step.name.toLowerCase().includes(searchLower)
    );

    // Get parent IDs for filtered items
    const unitIds = new Set(filteredUnits.map(u => u.id));
    const activityIds = new Set(filteredActivities.map(a => a.id));

    // Include activities whose units match
    activities.forEach(activity => {
      if (activity.manufacturing_unit_id && unitIds.has(activity.manufacturing_unit_id)) {
        filteredActivities.push(activity);
      }
    });

    // Include control steps whose activities match
    controlSteps.forEach(step => {
      if (step.activity_id && activityIds.has(step.activity_id)) {
        filteredControlSteps.push(step);
      }
    });

    // Include units that have matching activities
    activities.forEach(activity => {
      if (filteredActivities.includes(activity) && activity.manufacturing_unit_id) {
        const unit = manufacturingUnits.find(u => u.id === activity.manufacturing_unit_id);
        if (unit && !filteredUnits.includes(unit)) {
          filteredUnits.push(unit);
        }
      }
    });

    // Include activities that have matching control steps
    controlSteps.forEach(step => {
      if (filteredControlSteps.includes(step) && step.activity_id) {
        const activity = activities.find(a => a.id === step.activity_id);
        if (activity && !filteredActivities.includes(activity)) {
          filteredActivities.push(activity);
          // Also include parent unit
          if (activity.manufacturing_unit_id) {
            const unit = manufacturingUnits.find(u => u.id === activity.manufacturing_unit_id);
            if (unit && !filteredUnits.includes(unit)) {
              filteredUnits.push(unit);
            }
          }
        }
      }
    });

    return {
      units: [...new Set(filteredUnits)],
      activities: [...new Set(filteredActivities)],
      controlSteps: [...new Set(filteredControlSteps)]
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Proje Adı</h2>
          {!showEditProjectName && (
            <button
              onClick={() => setShowEditProjectName(true)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Düzenle
            </button>
          )}
        </div>
        {showEditProjectName ? (
          <div className="flex space-x-2">
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
            />
            <button
              onClick={updateProjectName}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Kaydet
            </button>
            <button
              onClick={() => {
                setShowEditProjectName(false);
                setNewProjectName(project?.name || '');
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              İptal
            </button>
          </div>
        ) : (
          <p className="text-2xl font-bold text-gray-900">{project?.name}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SettingsSection
          title="Binalar"
          icon={<Building className="w-5 h-5 text-blue-600" />}
          items={buildings}
          showAdd={showAddBuilding}
          newItemName={newBuildingName}
          editingId={editingId}
          editingValue={editingValue}
          onShowAdd={() => setShowAddBuilding(true)}
          onHideAdd={() => setShowAddBuilding(false)}
          onNewItemNameChange={setNewBuildingName}
          onAddItem={addBuilding}
          onStartEdit={startEdit}
          onSaveEdit={(id) => saveEdit(id, 'project_buildings')}
          onCancelEdit={cancelEdit}
          onEditValueChange={setEditingValue}
          onToggleStatus={toggleBuildingStatus}
          onDelete={deleteBuilding}
          placeholder="Bina adı"
          emptyMessage="Henüz bina eklenmedi"
        />

        <SettingsSection
          title="Bloklar"
          icon={<Building className="w-5 h-5 text-blue-600" />}
          items={blocks}
          showAdd={showAddBlock}
          newItemName={newBlockName}
          editingId={editingId}
          editingValue={editingValue}
          onShowAdd={() => setShowAddBlock(true)}
          onHideAdd={() => setShowAddBlock(false)}
          onNewItemNameChange={setNewBlockName}
          onAddItem={addBlock}
          onStartEdit={startEdit}
          onSaveEdit={(id) => saveEdit(id, 'project_blocks')}
          onCancelEdit={cancelEdit}
          onEditValueChange={setEditingValue}
          onToggleStatus={toggleBlockStatus}
          onDelete={deleteBlock}
          placeholder="Blok adı (örn: A Blok)"
          emptyMessage="Henüz blok eklenmedi"
        />

        <SettingsSection
          title="Katlar"
          icon={<Building className="w-5 h-5 text-blue-600" />}
          items={floors}
          showAdd={showAddFloor}
          newItemName={newFloorName}
          editingId={editingId}
          editingValue={editingValue}
          onShowAdd={() => setShowAddFloor(true)}
          onHideAdd={() => setShowAddFloor(false)}
          onNewItemNameChange={setNewFloorName}
          onAddItem={addFloor}
          onStartEdit={startEdit}
          onSaveEdit={(id) => saveEdit(id, 'project_floors')}
          onCancelEdit={cancelEdit}
          onEditValueChange={setEditingValue}
          onToggleStatus={toggleFloorStatus}
          onDelete={deleteFloor}
          placeholder="Kat adı (örn: Zemin Kat, 1. Kat)"
          emptyMessage="Henüz kat eklenmedi"
        />
      </div>

      {/* Hierarchical Tree View: Manufacturing Unit -> Activity -> Control Step */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Box className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">İmalat Birimi / Aktivite / Kontrol Adımları</h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAddManufacturingUnit(true)}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              + İmalat Birimi
            </button>
            <button
              onClick={() => setShowAddActivity(true)}
              className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
            >
              + Aktivite
            </button>
            <button
              onClick={() => setShowAddControlStep(true)}
              className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
            >
              + Kontrol Adımı
            </button>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-green-800 text-sm font-medium">{successMessage}</span>
          </div>
        )}

        {/* Search Box */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={hierarchySearchTerm}
              onChange={(e) => setHierarchySearchTerm(e.target.value)}
              placeholder="İmalat birimi, aktivite veya kontrol adımı ara..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Add Manufacturing Unit Modal */}
        {showAddManufacturingUnit && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Yeni İmalat Birimi Ekle</h3>
            <input
              type="text"
              value={newManufacturingUnitName}
              onChange={(e) => setNewManufacturingUnitName(e.target.value)}
              placeholder="İmalat birimi adı"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3"
            />
            <div className="flex space-x-2">
              <button
                onClick={addManufacturingUnit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Ekle
              </button>
              <button
                onClick={() => {
                  setShowAddManufacturingUnit(false);
                  setNewManufacturingUnitName('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                İptal
              </button>
            </div>
          </div>
        )}

        {/* Add Activity Modal */}
        {showAddActivity && (
          <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Yeni Aktivite Ekle</h3>
            <select
              value={selectedManufacturingUnitId}
              onChange={(e) => setSelectedManufacturingUnitId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3"
            >
              <option value="">İmalat Birimi Seçiniz (Zorunlu)</option>
              {manufacturingUnits.filter(u => u.is_active).map(unit => (
                <option key={unit.id} value={unit.id}>{unit.name}</option>
              ))}
            </select>
            <input
              type="text"
              value={newActivityName}
              onChange={(e) => setNewActivityName(e.target.value)}
              placeholder="Aktivite adı"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3"
            />
            <div className="flex space-x-2">
              <button
                onClick={addActivity}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Ekle
              </button>
              <button
                onClick={() => {
                  setShowAddActivity(false);
                  setNewActivityName('');
                  setSelectedManufacturingUnitId('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                İptal
              </button>
            </div>
          </div>
        )}

        {/* Add Control Step Modal */}
        {showAddControlStep && (
          <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Yeni Kontrol Adımı Ekle</h3>
            <select
              value={selectedManufacturingUnitId}
              onChange={(e) => {
                setSelectedManufacturingUnitId(e.target.value);
                setSelectedActivityId('');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3"
            >
              <option value="">İmalat Birimi Seçiniz</option>
              {manufacturingUnits.filter(u => u.is_active).map(unit => (
                <option key={unit.id} value={unit.id}>{unit.name}</option>
              ))}
            </select>
            <select
              value={selectedActivityId}
              onChange={(e) => setSelectedActivityId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3"
              disabled={!selectedManufacturingUnitId}
            >
              <option value="">Aktivite Seçiniz (Zorunlu)</option>
              {activities
                .filter(a => a.is_active && a.manufacturing_unit_id === selectedManufacturingUnitId)
                .map(activity => (
                  <option key={activity.id} value={activity.id}>{activity.name}</option>
                ))
              }
            </select>
            <input
              type="text"
              value={newControlStepName}
              onChange={(e) => setNewControlStepName(e.target.value)}
              placeholder="Kontrol adımı adı"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3"
            />
            <div className="flex space-x-2">
              <button
                onClick={addControlStep}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Ekle
              </button>
              <button
                onClick={() => {
                  setShowAddControlStep(false);
                  setNewControlStepName('');
                  setSelectedActivityId('');
                  setSelectedManufacturingUnitId('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                İptal
              </button>
            </div>
          </div>
        )}

        {/* Tree View */}
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {(() => {
            const filtered = filterHierarchy();

            if (filtered.units.length === 0) {
              return (
                <p className="text-gray-500 text-center py-8">
                  {hierarchySearchTerm ? 'Arama sonucu bulunamadı' : 'Henüz imalat birimi eklenmedi'}
                </p>
              );
            }

            return filtered.units.map(unit => {
              const unitActivities = filtered.activities.filter(
                a => a.manufacturing_unit_id === unit.id
              );
              const isUnitExpanded = expandedUnits.has(unit.id);

              return (
                <div key={unit.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Manufacturing Unit Header */}
                  <div className="bg-blue-50 p-3 flex items-center justify-between">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <button
                        onClick={() => toggleUnit(unit.id)}
                        className="p-1 hover:bg-blue-100 rounded flex-shrink-0"
                      >
                        {isUnitExpanded ? (
                          <ChevronDown className="w-5 h-5 text-blue-600" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-blue-600" />
                        )}
                      </button>
                      <Box className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      {editingId === unit.id ? (
                        <input
                          type="text"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded"
                          autoFocus
                        />
                      ) : (
                        <span className="font-semibold text-gray-900 truncate">{unit.name}</span>
                      )}
                      <span className={`px-2 py-0.5 text-xs rounded-full flex-shrink-0 ${
                        unit.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {unit.is_active ? 'Aktif' : 'Pasif'}
                      </span>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        ({unitActivities.length} aktivite)
                      </span>
                    </div>
                    <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                      {editingId === unit.id ? (
                        <>
                          <button
                            onClick={() => saveEdit(unit.id, 'project_manufacturing_units')}
                            className="p-1 text-green-600 hover:text-green-700"
                            title="Kaydet"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1 text-gray-600 hover:text-gray-700"
                            title="İptal"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(unit.id, unit.name)}
                            className="p-1 text-blue-600 hover:text-blue-700"
                            title="Düzenle"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => toggleManufacturingUnitStatus(unit.id, unit.is_active)}
                            className="p-1 text-gray-600 hover:text-blue-600"
                            title={unit.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              {unit.is_active ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              )}
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteManufacturingUnit(unit.id)}
                            className="p-1 text-red-600 hover:text-red-700"
                            title="Sil"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Activities */}
                  {isUnitExpanded && (
                    <div className="bg-gray-50 px-4 py-2">
                      {unitActivities.length === 0 ? (
                        <p className="text-gray-500 text-sm py-2 pl-6">Bu imalat birimine ait aktivite yok</p>
                      ) : (
                        <div className="space-y-2">
                          {unitActivities.map(activity => {
                            const activityControlSteps = filtered.controlSteps.filter(
                              s => s.activity_id === activity.id
                            );
                            const isActivityExpanded = expandedActivities.has(activity.id);

                            return (
                              <div key={activity.id} className="border border-gray-300 rounded-lg overflow-hidden">
                                {/* Activity Header */}
                                <div className="bg-green-50 p-2.5 flex items-center justify-between">
                                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                                    <button
                                      onClick={() => toggleActivity(activity.id)}
                                      className="p-1 hover:bg-green-100 rounded flex-shrink-0"
                                    >
                                      {isActivityExpanded ? (
                                        <ChevronDown className="w-4 h-4 text-green-600" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4 text-green-600" />
                                      )}
                                    </button>
                                    <Activity className="w-4 h-4 text-green-600 flex-shrink-0" />
                                    {editingId === activity.id ? (
                                      <input
                                        type="text"
                                        value={editingValue}
                                        onChange={(e) => setEditingValue(e.target.value)}
                                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                                        autoFocus
                                      />
                                    ) : (
                                      <span className="font-medium text-gray-900 text-sm truncate">{activity.name}</span>
                                    )}
                                    <span className={`px-2 py-0.5 text-xs rounded-full flex-shrink-0 ${
                                      activity.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                    }`}>
                                      {activity.is_active ? 'Aktif' : 'Pasif'}
                                    </span>
                                    <span className="text-xs text-gray-500 flex-shrink-0">
                                      ({activityControlSteps.length} adım)
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                                    {editingId === activity.id ? (
                                      <>
                                        <button
                                          onClick={() => saveEdit(activity.id, 'project_activities')}
                                          className="p-1 text-green-600 hover:text-green-700"
                                          title="Kaydet"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                          </svg>
                                        </button>
                                        <button
                                          onClick={cancelEdit}
                                          className="p-1 text-gray-600 hover:text-gray-700"
                                          title="İptal"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                          </svg>
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() => startEdit(activity.id, activity.name)}
                                          className="p-1 text-green-600 hover:text-green-700"
                                          title="Düzenle"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                          </svg>
                                        </button>
                                        <button
                                          onClick={() => toggleActivityStatus(activity.id, activity.is_active)}
                                          className="p-1 text-gray-600 hover:text-green-600"
                                          title={activity.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            {activity.is_active ? (
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            ) : (
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            )}
                                          </svg>
                                        </button>
                                        <button
                                          onClick={() => deleteActivity(activity.id)}
                                          className="p-1 text-red-600 hover:text-red-700"
                                          title="Sil"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Control Steps */}
                                {isActivityExpanded && (
                                  <div className="bg-white px-3 py-2">
                                    {activityControlSteps.length === 0 ? (
                                      <p className="text-gray-500 text-xs py-1 pl-6">Bu aktiviteye ait kontrol adımı yok</p>
                                    ) : (
                                      <div className="space-y-1.5">
                                        {activityControlSteps.map(step => (
                                          <div key={step.id} className="bg-purple-50 p-2 flex items-center justify-between rounded border border-purple-100">
                                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                                              <CheckSquare className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                                              {editingId === step.id ? (
                                                <input
                                                  type="text"
                                                  value={editingValue}
                                                  onChange={(e) => setEditingValue(e.target.value)}
                                                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                                                  autoFocus
                                                />
                                              ) : (
                                                <span className="text-gray-900 text-xs truncate">{step.name}</span>
                                              )}
                                              <span className={`px-1.5 py-0.5 text-xs rounded-full flex-shrink-0 ${
                                                step.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                              }`}>
                                                {step.is_active ? 'Aktif' : 'Pasif'}
                                              </span>
                                            </div>
                                            <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                                              {editingId === step.id ? (
                                                <>
                                                  <button
                                                    onClick={() => saveEdit(step.id, 'project_control_steps')}
                                                    className="p-0.5 text-green-600 hover:text-green-700"
                                                    title="Kaydet"
                                                  >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                  </button>
                                                  <button
                                                    onClick={cancelEdit}
                                                    className="p-0.5 text-gray-600 hover:text-gray-700"
                                                    title="İptal"
                                                  >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                  </button>
                                                </>
                                              ) : (
                                                <>
                                                  <button
                                                    onClick={() => startEdit(step.id, step.name)}
                                                    className="p-0.5 text-purple-600 hover:text-purple-700"
                                                    title="Düzenle"
                                                  >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                  </button>
                                                  <button
                                                    onClick={() => toggleControlStepStatus(step.id, step.is_active)}
                                                    className="p-0.5 text-gray-600 hover:text-purple-600"
                                                    title={step.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                                                  >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      {step.is_active ? (
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                      ) : (
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                      )}
                                                    </svg>
                                                  </button>
                                                  <button
                                                    onClick={() => deleteControlStep(step.id)}
                                                    className="p-0.5 text-red-600 hover:text-red-700"
                                                    title="Sil"
                                                  >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                  </button>
                                                </>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* Role-based Access Control Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Allowed Roles Section for Field Observation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <UserCheck className="w-5 h-5 text-blue-600" />
              <h2 className="text-sm font-semibold text-gray-900">Uygunsuzluk Rolleri</h2>
            </div>
            <button
              onClick={() => setShowAddAllowedRole(true)}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium flex items-center space-x-1"
            >
              <span>+</span>
            </button>
          </div>

          <p className="text-xs text-gray-600 mb-3">
            Saha gözlem raporlarında sorumlu kişi olarak sadece bu rollere sahip personel gösterilecektir.
          </p>

          {showAddAllowedRole && (
            <div className="mb-3 p-3 bg-gray-50 rounded-lg">
              <select
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs mb-2"
              >
                <option value="">Rol seçiniz...</option>
                {projectRoles
                  .filter(role => !allowedRoles.some(ar => ar.role_id === role.id))
                  .map(role => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))
                }
              </select>
              <div className="flex space-x-2">
                <button
                  onClick={addAllowedRole}
                  disabled={!selectedRoleId}
                  className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:bg-gray-300"
                >
                  Ekle
                </button>
                <button
                  onClick={() => {
                    setShowAddAllowedRole(false);
                    setSelectedRoleId('');
                  }}
                  className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
                >
                  İptal
                </button>
              </div>
            </div>
          )}

          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {allowedRoles.length === 0 ? (
              <p className="text-gray-500 text-center py-4 text-xs">
                Henüz rol eklenmedi
              </p>
            ) : (
              <div className="space-y-1.5">
                {allowedRoles.map((allowedRole) => (
                  <div
                    key={allowedRole.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition"
                  >
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <span className="font-medium text-gray-900 text-xs truncate">
                        {allowedRole.project_roles?.name || 'Unknown Role'}
                      </span>
                      <span className={`px-1.5 py-0.5 text-xs rounded-full whitespace-nowrap ${
                        allowedRole.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {allowedRole.is_active ? 'Aktif' : 'Pasif'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => toggleAllowedRoleStatus(allowedRole.id, allowedRole.is_active)}
                        className="p-1 text-gray-600 hover:text-blue-600 transition"
                        title={allowedRole.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {allowedRole.is_active ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          )}
                        </svg>
                      </button>
                      <button
                        onClick={() => deleteAllowedRole(allowedRole.id)}
                        className="p-1 text-red-600 hover:text-red-700 transition"
                        title="Sil"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* NOI Const Personnel Allowed Roles Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <UserCheck className="w-5 h-5 text-green-600" />
              <h2 className="text-sm font-semibold text-gray-900">NOI Const Personel</h2>
            </div>
            <button
              onClick={() => setShowAddNoiConstAllowedRole(true)}
              className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-medium flex items-center space-x-1"
            >
              <span>+</span>
            </button>
          </div>

          <p className="text-xs text-gray-600 mb-3">
            NOI taleplerinde const personel olarak sadece bu rollere sahip personel gösterilecektir.
          </p>

          {showAddNoiConstAllowedRole && (
            <div className="mb-3 p-3 bg-gray-50 rounded-lg">
              <select
                value={selectedNoiConstRoleId}
                onChange={(e) => setSelectedNoiConstRoleId(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs mb-2"
              >
                <option value="">Rol seçiniz...</option>
                {projectRoles
                  .filter(role => !noiConstAllowedRoles.some(ar => ar.role_id === role.id))
                  .map(role => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))
                }
              </select>
              <div className="flex space-x-2">
                <button
                  onClick={addNoiConstAllowedRole}
                  disabled={!selectedNoiConstRoleId}
                  className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:bg-gray-300"
                >
                  Ekle
                </button>
                <button
                  onClick={() => {
                    setShowAddNoiConstAllowedRole(false);
                    setSelectedNoiConstRoleId('');
                  }}
                  className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
                >
                  İptal
                </button>
              </div>
            </div>
          )}

          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {noiConstAllowedRoles.length === 0 ? (
              <p className="text-gray-500 text-center py-4 text-xs">
                Henüz rol eklenmedi
              </p>
            ) : (
              <div className="space-y-1.5">
                {noiConstAllowedRoles.map((allowedRole) => (
                  <div
                    key={allowedRole.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition"
                  >
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <span className="font-medium text-gray-900 text-xs truncate">
                        {allowedRole.project_roles?.name || 'Unknown Role'}
                      </span>
                      <span className={`px-1.5 py-0.5 text-xs rounded-full whitespace-nowrap ${
                        allowedRole.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {allowedRole.is_active ? 'Aktif' : 'Pasif'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => toggleNoiConstAllowedRoleStatus(allowedRole.id, allowedRole.is_active)}
                        className="p-1 text-gray-600 hover:text-green-600 transition"
                        title={allowedRole.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {allowedRole.is_active ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          )}
                        </svg>
                      </button>
                      <button
                        onClick={() => deleteNoiConstAllowedRole(allowedRole.id)}
                        className="p-1 text-red-600 hover:text-red-700 transition"
                        title="Sil"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* NOI QC Personnel Allowed Roles Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <UserCheck className="w-5 h-5 text-purple-600" />
              <h2 className="text-sm font-semibold text-gray-900">NOI QC Personel</h2>
            </div>
            <button
              onClick={() => setShowAddNoiQcAllowedRole(true)}
              className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-xs font-medium flex items-center space-x-1"
            >
              <span>+</span>
            </button>
          </div>

          <p className="text-xs text-gray-600 mb-3">
            NOI taleplerinde QC personel olarak sadece bu rollere sahip personel gösterilecektir.
          </p>

          {showAddNoiQcAllowedRole && (
            <div className="mb-3 p-3 bg-gray-50 rounded-lg">
              <select
                value={selectedNoiQcRoleId}
                onChange={(e) => setSelectedNoiQcRoleId(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs mb-2"
              >
                <option value="">Rol seçiniz...</option>
                {projectRoles
                  .filter(role => !noiQcAllowedRoles.some(ar => ar.role_id === role.id))
                  .map(role => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))
                }
              </select>
              <div className="flex space-x-2">
                <button
                  onClick={addNoiQcAllowedRole}
                  disabled={!selectedNoiQcRoleId}
                  className="px-2 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 disabled:bg-gray-300"
                >
                  Ekle
                </button>
                <button
                  onClick={() => {
                    setShowAddNoiQcAllowedRole(false);
                    setSelectedNoiQcRoleId('');
                  }}
                  className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
                >
                  İptal
                </button>
              </div>
            </div>
          )}

          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {noiQcAllowedRoles.length === 0 ? (
              <p className="text-gray-500 text-center py-4 text-xs">
                Henüz rol eklenmedi
              </p>
            ) : (
              <div className="space-y-1.5">
                {noiQcAllowedRoles.map((allowedRole) => (
                  <div
                    key={allowedRole.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition"
                  >
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <span className="font-medium text-gray-900 text-xs truncate">
                        {allowedRole.project_roles?.name || 'Unknown Role'}
                      </span>
                      <span className={`px-1.5 py-0.5 text-xs rounded-full whitespace-nowrap ${
                        allowedRole.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {allowedRole.is_active ? 'Aktif' : 'Pasif'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => toggleNoiQcAllowedRoleStatus(allowedRole.id, allowedRole.is_active)}
                        className="p-1 text-gray-600 hover:text-purple-600 transition"
                        title={allowedRole.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {allowedRole.is_active ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          )}
                        </svg>
                      </button>
                      <button
                        onClick={() => deleteNoiQcAllowedRole(allowedRole.id)}
                        className="p-1 text-red-600 hover:text-red-700 transition"
                        title="Sil"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
