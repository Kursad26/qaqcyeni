import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useProject } from '../contexts/ProjectContext';
import { SearchableDropdown } from './SearchableDropdown';
import { NoiRequestWithDetails, TIME_LOSS_GROUPS, APPROVAL_DECISIONS } from '../lib/noiTypes';

interface NoiEditModalProps {
  noi: NoiRequestWithDetails;
  onClose: () => void;
  onSuccess: () => void;
}

interface Company {
  id: string;
  name: string;
}

interface Personnel {
  id: string;
  first_name: string;
  last_name: string;
  company_id: string;
  user_profiles?: { full_name: string };
}

interface ControlStep {
  id: string;
  name: string;
  is_active: boolean;
}

interface ManufacturingUnit {
  id: string;
  name: string;
}

export function NoiEditModal({ noi, onClose, onSuccess }: NoiEditModalProps) {
  const { currentProject } = useProject();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [allPersonnel, setAllPersonnel] = useState<Personnel[]>([]);
  const [controlSteps, setControlSteps] = useState<ControlStep[]>([]);
  const [manufacturingUnits, setManufacturingUnits] = useState<ManufacturingUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    date: noi.date,
    time: noi.time,
    company_id: noi.company_id || '',
    const_personnel_id: noi.const_personnel_id || '',
    qc_personnel_id: noi.qc_personnel_id || '',
    location: noi.location || '',
    hold_point_id: noi.hold_point_id || '',
    manufacturing_unit_id: noi.manufacturing_unit_id || '',
    approval_decision: noi.approval_decision || '',
    delivery_time_minutes: noi.delivery_time_minutes?.toString() || '',
    time_loss_minutes: noi.time_loss_minutes?.toString() || '',
    time_loss_group: noi.time_loss_group || '',
    notes: noi.notes || ''
  });

  useEffect(() => {
    fetchData();
  }, [currentProject]);

  const fetchData = async () => {
    if (!currentProject) return;

    const [companiesRes, personnelRes, controlStepsRes, manufacturingUnitsRes] = await Promise.all([
      supabase
        .from('companies')
        .select('id, name')
        .eq('project_id', currentProject.id)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('personnel')
        .select('id, first_name, last_name, company_id, user_profiles(full_name)')
        .eq('project_id', currentProject.id)
        .order('first_name'),
      supabase
        .from('project_control_steps')
        .select('id, name, is_active')
        .eq('project_id', currentProject.id)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('project_manufacturing_units')
        .select('id, name')
        .eq('project_id', currentProject.id)
        .order('name')
    ]);

    if (companiesRes.data) setCompanies(companiesRes.data);
    if (personnelRes.data) setAllPersonnel(personnelRes.data as Personnel[]);
    if (controlStepsRes.data) setControlSteps(controlStepsRes.data);
    if (manufacturingUnitsRes.data) setManufacturingUnits(manufacturingUnitsRes.data);

    setLoading(false);
  };

  const getPersonnelOptions = () => {
    return allPersonnel.map(p => ({
      value: p.id,
      label: p.user_profiles?.full_name || `${p.first_name} ${p.last_name}`
    }));
  };

  const companyOptions = companies.map(c => ({
    value: c.id,
    label: c.name
  }));

  const controlStepOptions = controlSteps.map(cs => ({
    value: cs.id,
    label: cs.name
  }));

  const manufacturingUnitOptions = manufacturingUnits.map(mu => ({
    value: mu.id,
    label: mu.name
  }));

  const handleSubmit = async () => {
    if (!formData.date || !formData.time || !formData.company_id ||
        !formData.const_personnel_id || !formData.qc_personnel_id ||
        !formData.location || !formData.hold_point_id || !formData.manufacturing_unit_id ||
        !formData.time_loss_group) {
      alert('Lütfen tüm zorunlu alanları doldurun');
      return;
    }

    if (!confirm('NOI talebini güncellemek istediğinizden emin misiniz?')) return;

    setSaving(true);

    try {
      const updateData: any = {
        date: formData.date,
        time: formData.time,
        company_id: formData.company_id || null,
        const_personnel_id: formData.const_personnel_id || null,
        qc_personnel_id: formData.qc_personnel_id || null,
        location: formData.location || null,
        hold_point_id: formData.hold_point_id || null,
        manufacturing_unit_id: formData.manufacturing_unit_id || null,
        approval_decision: formData.approval_decision || null,
        delivery_time_minutes: formData.delivery_time_minutes ? parseInt(formData.delivery_time_minutes) : null,
        time_loss_minutes: formData.time_loss_minutes ? parseInt(formData.time_loss_minutes) : null,
        time_loss_group: formData.time_loss_group || null,
        notes: formData.notes || null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('noi_requests')
        .update(updateData)
        .eq('id', noi.id);

      if (error) {
        console.error('Update error:', error);
        alert('Güncelleme sırasında hata oluştu: ' + error.message);
        setSaving(false);
        return;
      }

      alert('NOI talebi başarıyla güncellendi!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating NOI:', error);
      alert('NOI talebi güncellenirken hata oluştu: ' + error.message);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">NOI Talebini Düzenle</h2>
            <p className="text-sm text-gray-600 mt-1">
              NOI No: <span className="font-mono font-semibold">{noi.noi_number}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tarih <span className="text-red-600">*</span>
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Saat <span className="text-red-600">*</span>
              </label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Firma <span className="text-red-600">*</span>
              </label>
              <SearchableDropdown
                options={companyOptions}
                value={formData.company_id}
                onChange={(value) => setFormData({ ...formData, company_id: value || '' })}
                placeholder="Firma seçin"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                İmalat Birimi <span className="text-red-600">*</span>
              </label>
              <SearchableDropdown
                options={manufacturingUnitOptions}
                value={formData.manufacturing_unit_id}
                onChange={(value) => setFormData({ ...formData, manufacturing_unit_id: value || '' })}
                placeholder="İmalat birimi seçin"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Const Personel <span className="text-red-600">*</span>
              </label>
              <SearchableDropdown
                options={getPersonnelOptions()}
                value={formData.const_personnel_id}
                onChange={(value) => setFormData({ ...formData, const_personnel_id: value || '' })}
                placeholder="Const personel seçin"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                QC Personel <span className="text-red-600">*</span>
              </label>
              <SearchableDropdown
                options={getPersonnelOptions()}
                value={formData.qc_personnel_id}
                onChange={(value) => setFormData({ ...formData, qc_personnel_id: value || '' })}
                placeholder="QC personel seçin"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hold Point <span className="text-red-600">*</span>
              </label>
              <SearchableDropdown
                options={controlStepOptions}
                value={formData.hold_point_id}
                onChange={(value) => setFormData({ ...formData, hold_point_id: value || '' })}
                placeholder="Hold point seçin"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mahal <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Mahal"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kabul/Red
              </label>
              <select
                value={formData.approval_decision}
                onChange={(e) => setFormData({ ...formData, approval_decision: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Seçin</option>
                {APPROVAL_DECISIONS.map(decision => (
                  <option key={decision} value={decision}>{decision}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Teslimat Süresi (Dk)
              </label>
              <input
                type="number"
                min="0"
                value={formData.delivery_time_minutes}
                onChange={(e) => setFormData({ ...formData, delivery_time_minutes: e.target.value })}
                placeholder="Dk"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kayıp Zaman(Dk)
              </label>
              <input
                type="number"
                min="0"
                value={formData.time_loss_minutes}
                onChange={(e) => setFormData({ ...formData, time_loss_minutes: e.target.value })}
                placeholder="Dk (Opsiyonel)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kayıp Zaman Grup *
              </label>
              <select
                value={formData.time_loss_group}
                onChange={(e) => setFormData({ ...formData, time_loss_group: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Seçin</option>
                {TIME_LOSS_GROUPS.map(group => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Açıklama
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Açıklama..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 sticky bottom-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition text-sm font-medium"
            disabled={saving}
          >
            İptal
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Kaydediliyor...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Kaydet
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

