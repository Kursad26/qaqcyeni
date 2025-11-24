import { useState, useEffect } from 'react';
import { SearchableDropdown } from '../SearchableDropdown';
import { PhotoUpload } from '../PhotoUpload';
import { FieldObservationFormData } from '../../lib/fieldObservationTypes';
import { supabase } from '../../lib/supabase';
import { useProject } from '../../contexts/ProjectContext';
import { useAuth } from '../../contexts/AuthContext';


interface Stage1Props {
  formData: FieldObservationFormData;
  onChange: (data: Partial<FieldObservationFormData>) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

interface Company {
  id: string;
  name: string;
}

interface Personnel {
  id: string;
  first_name: string;
  last_name: string;
  user_id?: string;
  user_profiles?: { full_name: string };
}

interface Building {
  id: string;
  name: string;
}

interface Block {
  id: string;
  name: string;
}

interface Floor {
  id: string;
  name: string;
}

interface ManufacturingUnit {
  id: string;
  name: string;
}

interface Activity {
  id: string;
  name: string;
}

export function Stage1FormCreation({ formData, onChange, onSubmit, disabled = false }: Stage1Props) {
  const { currentProject } = useProject();
  const { userProfile } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [manufacturingUnits, setManufacturingUnits] = useState<ManufacturingUnit[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchData();
  }, [currentProject, userProfile]);

  const fetchData = async () => {
    if (!currentProject || !userProfile) return;

    try {
      const [
        { data: companiesData },
        { data: personnelData },
        { data: buildingsData },
        { data: blocksData },
        { data: floorsData },
        { data: unitsData },
        { data: activitiesData }
      ] = await Promise.all([
        supabase.from('companies').select('id, name').eq('project_id', currentProject.id).eq('is_active', true).order('name'),
        supabase.from('personnel').select('id, first_name, last_name, user_id, user_profiles(full_name)').eq('project_id', currentProject.id).order('first_name'),
        supabase.from('project_buildings').select('id, name').eq('project_id', currentProject.id).eq('is_active', true).order('name'),
        supabase.from('project_blocks').select('id, name').eq('project_id', currentProject.id).eq('is_active', true).order('name'),
        supabase.from('project_floors').select('id, name').eq('project_id', currentProject.id).eq('is_active', true).order('floor_number'),
        supabase.from('project_manufacturing_units').select('id, name').eq('project_id', currentProject.id).eq('is_active', true).order('name'),
        supabase.from('project_activities').select('id, name').eq('project_id', currentProject.id).eq('is_active', true).order('name')
      ]);

      let finalPersonnelList = personnelData || [];

      // Sort personnel list by name
      finalPersonnelList.sort((a, b) => {
        const nameA = a.user_profiles?.full_name || `${a.first_name} ${a.last_name}`.trim() || '';
        const nameB = b.user_profiles?.full_name || `${b.first_name} ${b.last_name}`.trim() || '';
        return nameA.localeCompare(nameB, 'tr');
      });

      setCompanies(companiesData || []);
      setPersonnel(finalPersonnelList);
      setBuildings(buildingsData || []);
      setBlocks(blocksData || []);
      setFloors(floorsData || []);
      setManufacturingUnits(unitsData || []);
      setActivities(activitiesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.company_id) newErrors.company_id = 'Sorumlu firma zorunludur';
    if (!formData.responsible_person_1_id) newErrors.responsible_person_1_id = 'Sorumlu personel 1 zorunludur';
    if (!formData.building_id) newErrors.building_id = 'Bina zorunludur';
    if (!formData.block_id) newErrors.block_id = 'Blok zorunludur';
    if (!formData.floor_id) newErrors.floor_id = 'Kat zorunludur';
    if (!formData.manufacturing_unit_id) newErrors.manufacturing_unit_id = 'İmalat birimi zorunludur';
    if (!formData.activity_id) newErrors.activity_id = 'Aktivite zorunludur';
    if (!formData.location_description?.trim()) newErrors.location_description = 'Lokasyon açıklaması zorunludur';
    if (!formData.observation_description?.trim()) newErrors.observation_description = 'Uygunsuzluk açıklaması zorunludur';
    if (!formData.severity) newErrors.severity = 'Majör/Minör seçimi zorunludur';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onSubmit();
    }
  };

  const companyOptions = companies.map(c => ({ value: c.id, label: c.name }));
  const personnelOptions = personnel.map(p => ({
    value: p.id,
    label: p.user_profiles?.full_name || `${p.first_name} ${p.last_name}`.trim() || 'İsimsiz'
  }));
  const buildingOptions = buildings.map(b => ({ value: b.id, label: b.name }));
  const blockOptions = blocks.map(b => ({ value: b.id, label: b.name }));
  const floorOptions = floors.map(f => ({ value: f.id, label: f.name }));
  const unitOptions = manufacturingUnits.map(u => ({ value: u.id, label: u.name }));
  const activityOptions = activities.map(a => ({ value: a.id, label: a.name }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Aşama 1: Form Oluşturma</h2>
        <p className="text-gray-600">Lütfen tüm zorunlu alanları doldurun.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SearchableDropdown
          label="Sorumlu Firma"
          options={companyOptions}
          value={formData.company_id}
          onChange={(value) => onChange({ company_id: value })}
          placeholder="Firma seçiniz"
          required
          disabled={disabled}
          error={errors.company_id}
        />

        <SearchableDropdown
          label="Sorumlu Personel 1"
          options={personnelOptions}
          value={formData.responsible_person_1_id}
          onChange={(value) => onChange({ responsible_person_1_id: value })}
          placeholder="Personel seçiniz"
          required
          disabled={disabled}
          error={errors.responsible_person_1_id}
        />

        <SearchableDropdown
          label="Sorumlu Personel 2"
          options={personnelOptions}
          value={formData.responsible_person_2_id}
          onChange={(value) => onChange({ responsible_person_2_id: value })}
          placeholder="Personel seçiniz (opsiyonel)"
          disabled={disabled}
        />

        <SearchableDropdown
          label="Bina"
          options={buildingOptions}
          value={formData.building_id}
          onChange={(value) => onChange({ building_id: value })}
          placeholder="Bina seçiniz"
          required
          disabled={disabled}
          error={errors.building_id}
        />

        <SearchableDropdown
          label="Blok"
          options={blockOptions}
          value={formData.block_id}
          onChange={(value) => onChange({ block_id: value })}
          placeholder="Blok seçiniz"
          required
          disabled={disabled}
          error={errors.block_id}
        />

        <SearchableDropdown
          label="Kat"
          options={floorOptions}
          value={formData.floor_id}
          onChange={(value) => onChange({ floor_id: value })}
          placeholder="Kat seçiniz"
          required
          disabled={disabled}
          error={errors.floor_id}
        />

        <SearchableDropdown
          label="İmalat Birimi"
          options={unitOptions}
          value={formData.manufacturing_unit_id}
          onChange={(value) => onChange({ manufacturing_unit_id: value })}
          placeholder="İmalat birimi seçiniz"
          required
          disabled={disabled}
          error={errors.manufacturing_unit_id}
        />

        <SearchableDropdown
          label="Aktivite"
          options={activityOptions}
          value={formData.activity_id}
          onChange={(value) => onChange({ activity_id: value })}
          placeholder="Aktivite seçiniz"
          required
          disabled={disabled}
          error={errors.activity_id}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Lokasyon Ek Açıklama <span className="text-red-500">*</span>
        </label>
        <textarea
          value={formData.location_description}
          onChange={(e) => onChange({ location_description: e.target.value })}
          placeholder="Lokasyon detaylarını yazınız"
          disabled={disabled}
          rows={3}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.location_description ? 'border-red-500' : 'border-gray-300'
          } ${disabled ? 'bg-gray-50' : ''}`}
        />
        {errors.location_description && (
          <p className="mt-1 text-sm text-red-600">{errors.location_description}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Uygunsuzluk Açıklaması <span className="text-red-500">*</span>
        </label>
        <textarea
          value={formData.observation_description}
          onChange={(e) => onChange({ observation_description: e.target.value })}
          placeholder="Tespit edilen uygunsuzluğu detaylı olarak açıklayınız..."
          disabled={disabled}
          rows={4}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.observation_description ? 'border-red-500' : 'border-gray-300'
          } ${disabled ? 'bg-gray-50' : ''}`}
        />
        {errors.observation_description && (
          <p className="mt-1 text-sm text-red-600">{errors.observation_description}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Majör/Minör <span className="text-red-500">*</span>
        </label>
        <div className="flex space-x-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name="severity"
              value="major"
              checked={formData.severity === 'major'}
              onChange={() => onChange({ severity: 'major' })}
              disabled={disabled}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-gray-700">Majör</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name="severity"
              value="minor"
              checked={formData.severity === 'minor'}
              onChange={() => onChange({ severity: 'minor' })}
              disabled={disabled}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-gray-700">Minör</span>
          </label>
        </div>
        {errors.severity && (
          <p className="mt-1 text-sm text-red-600">{errors.severity}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Referans Döküman
        </label>
        <input
          type="text"
          value={formData.reference_document}
          onChange={(e) => onChange({ reference_document: e.target.value })}
          placeholder="Referans döküman numarası"
          disabled={disabled}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <PhotoUpload
        photos={formData.photos}
        onChange={(photos) => onChange({ photos })}
        disabled={disabled}
      />

      {!disabled && (
        <div className="flex justify-end pt-4">
          <button
            onClick={handleSubmit}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Formu Kaydet
          </button>
        </div>
      )}
    </div>
  );
}
