import { useState, useEffect } from 'react';
import { useProject } from '../../contexts/ProjectContext';
import { supabase } from '../../lib/supabase';
import { FieldTrainingFormData } from '../../lib/fieldTrainingTypes';
import { SearchableDropdown } from '../SearchableDropdown';

interface Stage1TrainingPlanningProps {
  formData: FieldTrainingFormData;
  onChange: (data: Partial<FieldTrainingFormData>) => void;
  onSubmit: () => void;
  disabled: boolean;
  hideSubmitButton?: boolean;
}

interface Activity {
  id: string;
  name: string;
  manufacturing_unit_id: string | null;
}

export function Stage1TrainingPlanning({
  formData,
  onChange,
  onSubmit,
  disabled,
  hideSubmitButton = false
}: Stage1TrainingPlanningProps) {
  const { currentProject } = useProject();
  const [manufacturingUnits, setManufacturingUnits] = useState<any[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [personnel, setPersonnel] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);

  useEffect(() => {
    if (currentProject) {
      fetchDropdownData();
    }
  }, [currentProject]);

  const fetchDropdownData = async () => {
    if (!currentProject) return;

    // Fetch manufacturing units
    const { data: unitsData } = await supabase
      .from('project_manufacturing_units')
      .select('*')
      .eq('project_id', currentProject.id)
      .eq('is_active', true)
      .order('name');

    if (unitsData) setManufacturingUnits(unitsData);

    // Fetch activities with manufacturing_unit_id
    const { data: activitiesData } = await supabase
      .from('project_activities')
      .select('id, name, manufacturing_unit_id')
      .eq('project_id', currentProject.id)
      .eq('is_active', true)
      .order('name');

    if (activitiesData) setActivities(activitiesData);

    // Fetch personnel
    const { data: personnelData } = await supabase
      .from('personnel')
      .select('id, first_name, last_name, user_profiles(full_name)')
      .eq('project_id', currentProject.id);

    if (personnelData) setPersonnel(personnelData);

    // Fetch active companies
    const { data: companiesData } = await supabase
      .from('companies')
      .select('*')
      .eq('project_id', currentProject.id)
      .eq('is_active', true)
      .order('name');

    if (companiesData) setCompanies(companiesData);
  };

  // Cascade filter: Get activities for a specific manufacturing unit
  const getActivityOptions = (manufacturingUnitId: string | null | undefined) => {
    if (!manufacturingUnitId) {
      return [];
    }
    return activities
      .filter(a => a.manufacturing_unit_id === manufacturingUnitId)
      .map(a => ({ value: a.id, label: a.name }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.training_topic?.trim()) {
      alert('Lütfen eğitim konusunu girin');
      return;
    }

    if (!formData.trainer_name?.trim()) {
      alert('Lütfen eğitimi veren kişiyi girin');
      return;
    }

    if (!formData.organized_by_id) {
      alert('Lütfen eğitimi düzenleyen kişiyi seçin');
      return;
    }

    if (!formData.recipient_company_1_id) {
      alert('Lütfen en az bir eğitimi alacak firma seçin');
      return;
    }

    if (!formData.deadline_date) {
      alert('Lütfen eğitim son tarihini seçin');
      return;
    }

    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Form Numarası
        </label>
        <input
          type="text"
          value={formData.report_number || 'Otomatik oluşturulacak'}
          disabled
          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Eğitim Konusu <span className="text-red-600">*</span>
        </label>
        <input
          type="text"
          value={formData.training_topic || ''}
          onChange={(e) => onChange({ training_topic: e.target.value })}
          disabled={disabled}
          placeholder="Örn: İş Güvenliği Eğitimi"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          İmalat Birim
        </label>
        <SearchableDropdown
          options={manufacturingUnits.map(u => ({ value: u.id, label: u.name }))}
          value={formData.manufacturing_unit_id || ''}
          onChange={(value) => onChange({ manufacturing_unit_id: value, activity_id: null })}
          placeholder="İmalat birimi seçin..."
          disabled={disabled}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Aktivite
        </label>
        <SearchableDropdown
          options={getActivityOptions(formData.manufacturing_unit_id)}
          value={formData.activity_id || ''}
          onChange={(value) => onChange({ activity_id: value })}
          placeholder={formData.manufacturing_unit_id ? "Aktivite seçin..." : "Önce imalat birimi seçin"}
          disabled={disabled || !formData.manufacturing_unit_id}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Eğitimi Düzenleyen <span className="text-red-600">*</span>
        </label>
        <SearchableDropdown
          options={personnel.map(p => ({
            value: p.id,
            label: p.user_profiles?.full_name || `${p.first_name} ${p.last_name}`
          }))}
          value={formData.organized_by_id || ''}
          onChange={(value) => onChange({ organized_by_id: value })}
          placeholder="Personel seçin..."
          disabled={disabled}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Eğitimi Veren <span className="text-red-600">*</span>
        </label>
        <input
          type="text"
          value={formData.trainer_name || ''}
          onChange={(e) => onChange({ trainer_name: e.target.value })}
          disabled={disabled}
          placeholder="Eğitmen adı"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Eğitimi Alacak Firma -1 <span className="text-red-600">*</span>
        </label>
        <SearchableDropdown
          options={companies.map(c => ({ value: c.id, label: c.name }))}
          value={formData.recipient_company_1_id || ''}
          onChange={(value) => onChange({ recipient_company_1_id: value })}
          placeholder="Firma seçin..."
          disabled={disabled}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Eğitimi Alacak Firma -2
        </label>
        <SearchableDropdown
          options={companies.map(c => ({ value: c.id, label: c.name }))}
          value={formData.recipient_company_2_id || ''}
          onChange={(value) => onChange({ recipient_company_2_id: value })}
          placeholder="Firma seçin (opsiyonel)..."
          disabled={disabled}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          İç Eğitim / Dış Eğitim <span className="text-red-600">*</span>
        </label>
        <div className="flex space-x-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="training_type"
              value="internal"
              checked={formData.training_type === 'internal'}
              onChange={(e) => onChange({ training_type: e.target.value as 'internal' | 'external' })}
              disabled={disabled}
              className="mr-2"
            />
            <span className="text-gray-700">İç Eğitim</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="training_type"
              value="external"
              checked={formData.training_type === 'external'}
              onChange={(e) => onChange({ training_type: e.target.value as 'internal' | 'external' })}
              disabled={disabled}
              className="mr-2"
            />
            <span className="text-gray-700">Dış Eğitim</span>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Eğitim Son Tarihi <span className="text-red-600">*</span>
        </label>
        <input
          type="date"
          value={formData.deadline_date || ''}
          onChange={(e) => onChange({ deadline_date: e.target.value })}
          disabled={disabled}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          required
        />
      </div>

      {!disabled && !hideSubmitButton && (
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Planlamayı Kaydet
          </button>
        </div>
      )}
    </form>
  );
}
