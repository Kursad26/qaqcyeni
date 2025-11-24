import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Building, Box, Activity, CheckSquare } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);

  const [showAddBuilding, setShowAddBuilding] = useState(false);
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [showAddFloor, setShowAddFloor] = useState(false);
  const [showAddManufacturingUnit, setShowAddManufacturingUnit] = useState(false);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [showAddControlStep, setShowAddControlStep] = useState(false);
  const [showEditProjectName, setShowEditProjectName] = useState(false);

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
    </div>
  );
}
