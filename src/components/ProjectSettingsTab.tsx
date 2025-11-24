import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Building, Box, Activity, CheckSquare, UserCheck } from 'lucide-react';
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
}

interface ControlStep {
  id: string;
  project_id: string;
  name: string;
  is_active: boolean;
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

  const [newBuildingName, setNewBuildingName] = useState('');
  const [newBlockName, setNewBlockName] = useState('');
  const [newFloorName, setNewFloorName] = useState('');
  const [newManufacturingUnitName, setNewManufacturingUnitName] = useState('');
  const [newActivityName, setNewActivityName] = useState('');
  const [newControlStepName, setNewControlStepName] = useState('');
  const [newProjectName, setNewProjectName] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

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
      .select('*')
      .eq('project_id', projectId)
      .order('name');

    const { data: controlStepsData } = await supabase
      .from('project_control_steps')
      .select('*')
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
    await supabase
      .from('project_manufacturing_units')
      .insert({ project_id: projectId, name: newManufacturingUnitName.trim() });
    setNewManufacturingUnitName('');
    setShowAddManufacturingUnit(false);
    fetchData();
  };

  const addActivity = async () => {
    if (!newActivityName.trim()) return;
    await supabase
      .from('project_activities')
      .insert({ project_id: projectId, name: newActivityName.trim() });
    setNewActivityName('');
    setShowAddActivity(false);
    fetchData();
  };

  const addControlStep = async () => {
    if (!newControlStepName.trim()) return;
    await supabase
      .from('project_control_steps')
      .insert({ project_id: projectId, name: newControlStepName.trim() });
    setNewControlStepName('');
    setShowAddControlStep(false);
    fetchData();
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

        <SettingsSection
          title="İmalat Birim"
          icon={<Box className="w-5 h-5 text-blue-600" />}
          items={manufacturingUnits}
          showAdd={showAddManufacturingUnit}
          newItemName={newManufacturingUnitName}
          editingId={editingId}
          editingValue={editingValue}
          onShowAdd={() => setShowAddManufacturingUnit(true)}
          onHideAdd={() => setShowAddManufacturingUnit(false)}
          onNewItemNameChange={setNewManufacturingUnitName}
          onAddItem={addManufacturingUnit}
          onStartEdit={startEdit}
          onSaveEdit={(id) => saveEdit(id, 'project_manufacturing_units')}
          onCancelEdit={cancelEdit}
          onEditValueChange={setEditingValue}
          onToggleStatus={toggleManufacturingUnitStatus}
          onDelete={deleteManufacturingUnit}
          placeholder="İmalat birimi adı"
          emptyMessage="Henüz imalat birimi eklenmedi"
        />

        <SettingsSection
          title="Aktivite"
          icon={<Activity className="w-5 h-5 text-blue-600" />}
          items={activities}
          showAdd={showAddActivity}
          newItemName={newActivityName}
          editingId={editingId}
          editingValue={editingValue}
          onShowAdd={() => setShowAddActivity(true)}
          onHideAdd={() => setShowAddActivity(false)}
          onNewItemNameChange={setNewActivityName}
          onAddItem={addActivity}
          onStartEdit={startEdit}
          onSaveEdit={(id) => saveEdit(id, 'project_activities')}
          onCancelEdit={cancelEdit}
          onEditValueChange={setEditingValue}
          onToggleStatus={toggleActivityStatus}
          onDelete={deleteActivity}
          placeholder="Aktivite adı"
          emptyMessage="Henüz aktivite eklenmedi"
        />

        <SettingsSection
          title="Kontrol Adımları"
          icon={<CheckSquare className="w-5 h-5 text-blue-600" />}
          items={controlSteps}
          showAdd={showAddControlStep}
          newItemName={newControlStepName}
          editingId={editingId}
          editingValue={editingValue}
          onShowAdd={() => setShowAddControlStep(true)}
          onHideAdd={() => setShowAddControlStep(false)}
          onNewItemNameChange={setNewControlStepName}
          onAddItem={addControlStep}
          onStartEdit={startEdit}
          onSaveEdit={(id) => saveEdit(id, 'project_control_steps')}
          onCancelEdit={cancelEdit}
          onEditValueChange={setEditingValue}
          onToggleStatus={toggleControlStepStatus}
          onDelete={deleteControlStep}
          placeholder="Kontrol adımı adı"
          emptyMessage="Henüz kontrol adımı eklenmedi"
        />
      </div>

      {/* Allowed Roles Section for Field Observation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <UserCheck className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Uygunsuzluk Oluşturulacak Roller</h2>
          </div>
          <button
            onClick={() => setShowAddAllowedRole(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center space-x-1"
          >
            <span>+</span>
            <span>Rol Ekle</span>
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Saha gözlem raporlarında sorumlu kişi olarak sadece bu rollere sahip personel gösterilecektir.
        </p>

        {showAddAllowedRole && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">Rol Seçiniz</label>
            <select
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3"
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
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Ekle
              </button>
              <button
                onClick={() => {
                  setShowAddAllowedRole(false);
                  setSelectedRoleId('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                İptal
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {allowedRoles.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Henüz rol eklenmedi. Rol eklemek için yukarıdaki butonu kullanın.
            </p>
          ) : (
            <div className="space-y-2">
              {allowedRoles.map((allowedRole) => (
                <div
                  key={allowedRole.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <div className="flex items-center space-x-3">
                    <span className="font-medium text-gray-900">
                      {allowedRole.project_roles?.name || 'Unknown Role'}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      allowedRole.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {allowedRole.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleAllowedRoleStatus(allowedRole.id, allowedRole.is_active)}
                      className="p-2 text-gray-600 hover:text-blue-600 transition"
                      title={allowedRole.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                    >
                      {allowedRole.is_active ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => deleteAllowedRole(allowedRole.id)}
                      className="p-2 text-red-600 hover:text-red-700 transition"
                      title="Sil"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <h2 className="text-lg font-semibold text-gray-900">NOI Const Personel Rolleri</h2>
          </div>
          <button
            onClick={() => setShowAddNoiConstAllowedRole(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium flex items-center space-x-1"
          >
            <span>+</span>
            <span>Rol Ekle</span>
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          NOI taleplerinde const personel olarak sadece bu rollere sahip personel gösterilecektir.
        </p>

        {showAddNoiConstAllowedRole && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">Rol Seçiniz</label>
            <select
              value={selectedNoiConstRoleId}
              onChange={(e) => setSelectedNoiConstRoleId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3"
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
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Ekle
              </button>
              <button
                onClick={() => {
                  setShowAddNoiConstAllowedRole(false);
                  setSelectedNoiConstRoleId('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                İptal
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {noiConstAllowedRoles.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Henüz rol eklenmedi. Rol eklemek için yukarıdaki butonu kullanın.
            </p>
          ) : (
            <div className="space-y-2">
              {noiConstAllowedRoles.map((allowedRole) => (
                <div
                  key={allowedRole.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <div className="flex items-center space-x-3">
                    <span className="font-medium text-gray-900">
                      {allowedRole.project_roles?.name || 'Unknown Role'}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      allowedRole.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {allowedRole.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleNoiConstAllowedRoleStatus(allowedRole.id, allowedRole.is_active)}
                      className="p-2 text-gray-600 hover:text-green-600 transition"
                      title={allowedRole.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                    >
                      {allowedRole.is_active ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => deleteNoiConstAllowedRole(allowedRole.id)}
                      className="p-2 text-red-600 hover:text-red-700 transition"
                      title="Sil"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <h2 className="text-lg font-semibold text-gray-900">NOI QC Personel Rolleri</h2>
          </div>
          <button
            onClick={() => setShowAddNoiQcAllowedRole(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium flex items-center space-x-1"
          >
            <span>+</span>
            <span>Rol Ekle</span>
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          NOI taleplerinde QC personel olarak sadece bu rollere sahip personel gösterilecektir.
        </p>

        {showAddNoiQcAllowedRole && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">Rol Seçiniz</label>
            <select
              value={selectedNoiQcRoleId}
              onChange={(e) => setSelectedNoiQcRoleId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3"
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
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Ekle
              </button>
              <button
                onClick={() => {
                  setShowAddNoiQcAllowedRole(false);
                  setSelectedNoiQcRoleId('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                İptal
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {noiQcAllowedRoles.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Henüz rol eklenmedi. Rol eklemek için yukarıdaki butonu kullanın.
            </p>
          ) : (
            <div className="space-y-2">
              {noiQcAllowedRoles.map((allowedRole) => (
                <div
                  key={allowedRole.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <div className="flex items-center space-x-3">
                    <span className="font-medium text-gray-900">
                      {allowedRole.project_roles?.name || 'Unknown Role'}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      allowedRole.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {allowedRole.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleNoiQcAllowedRoleStatus(allowedRole.id, allowedRole.is_active)}
                      className="p-2 text-gray-600 hover:text-purple-600 transition"
                      title={allowedRole.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                    >
                      {allowedRole.is_active ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => deleteNoiQcAllowedRole(allowedRole.id)}
                      className="p-2 text-red-600 hover:text-red-700 transition"
                      title="Sil"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
  );
}
