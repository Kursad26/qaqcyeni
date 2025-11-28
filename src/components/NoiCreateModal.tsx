import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Copy } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useProject } from '../contexts/ProjectContext';
import { SearchableDropdown } from './SearchableDropdown';
import { NoiCreateRow, validateNoiRow, NoiRequestWithDetails, extractBaseNoiNumber, getNextRevisionNumber, formatNoiNumber } from '../lib/noiTypes';
import { useAuth } from '../contexts/AuthContext';

interface NoiCreateModalProps {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: NoiRequestWithDetails;
  isResubmit?: boolean;
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
  noi_access?: boolean;
  role_id?: string;
  user_profiles?: { full_name: string };
}

interface ControlStep {
  id: string;
  name: string;
  is_active: boolean;
  activity_id: string | null;
}

interface ActivityType {
  id: string;
  name: string;
  is_active: boolean;
  manufacturing_unit_id: string | null;
}

interface ManufacturingUnit {
  id: string;
  name: string;
}

export function NoiCreateModal({ onClose, onSuccess, initialData, isResubmit }: NoiCreateModalProps) {
  const { currentProject } = useProject();
  const { userProfile } = useAuth();
  const [rows, setRows] = useState<NoiCreateRow[]>([
    initialData ? {
      tempId: `row-${Date.now()}`,
      date: initialData.date,
      time: initialData.time,
      company_id: initialData.company_id,
      const_personnel_id: initialData.const_personnel_id || '',
      qc_personnel_id: initialData.qc_personnel_id || '',
      location: initialData.location || '',
      hold_point_id: initialData.hold_point_id || '',
      manufacturing_unit_id: initialData.manufacturing_unit_id || '',
      activity_id: initialData.activity_id || ''
    } : {
      tempId: `row-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      company_id: '',
      const_personnel_id: '',
      qc_personnel_id: '',
      location: '',
      hold_point_id: '',
      manufacturing_unit_id: '',
      activity_id: ''
    }
  ]);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [allPersonnel, setAllPersonnel] = useState<Personnel[]>([]);
  const [constPersonnel, setConstPersonnel] = useState<Personnel[]>([]);
  const [qcPersonnel, setQcPersonnel] = useState<Personnel[]>([]);
  const [controlSteps, setControlSteps] = useState<ControlStep[]>([]);
  const [activities, setActivities] = useState<ActivityType[]>([]);
  const [manufacturingUnits, setManufacturingUnits] = useState<ManufacturingUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [duplicateRows, setDuplicateRows] = useState<Set<string>>(new Set()); // Geçmişte onaylanmış NOI'ler
  const [formDuplicateRows, setFormDuplicateRows] = useState<Set<string>>(new Set()); // Form içinde duplicate satırlar

  useEffect(() => {
    fetchData();
  }, [currentProject]);

  // Check for duplicate approved NOIs
  useEffect(() => {
    const checkDuplicates = async () => {
      if (!currentProject || rows.length === 0) return;

      const newDuplicateRows = new Set<string>();

      for (const row of rows) {
        // Only check if all required fields are filled
        if (!row.company_id || !row.hold_point_id || !row.location) {
          continue;
        }

        const { data } = await supabase
          .from('noi_requests')
          .select('id')
          .eq('project_id', currentProject.id)
          .eq('company_id', row.company_id)
          .eq('hold_point_id', row.hold_point_id)
          .eq('location', row.location.trim())
          .eq('status', 'approved')
          .limit(1);

        if (data && data.length > 0) {
          newDuplicateRows.add(row.tempId);
        }
      }

      setDuplicateRows(newDuplicateRows);
    };

    // Debounce the check
    const timeoutId = setTimeout(() => {
      checkDuplicates();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [rows, currentProject]);

  // Check for duplicate rows within the form (same date, time, company, personnel, location, hold point)
  useEffect(() => {
    const checkFormDuplicates = () => {
      const newFormDuplicateRows = new Set<string>();
      const rowSignatures = new Map<string, string[]>();

      // Create signature for each row
      rows.forEach(row => {
        // Only check if all required fields are filled
        if (!row.date || !row.time || !row.company_id || !row.const_personnel_id || 
            !row.qc_personnel_id || !row.location || !row.hold_point_id) {
          return;
        }

        const signature = `${row.date}|${row.time}|${row.company_id}|${row.const_personnel_id}|${row.qc_personnel_id}|${row.location.trim()}|${row.hold_point_id}`;
        
        if (!rowSignatures.has(signature)) {
          rowSignatures.set(signature, []);
        }
        rowSignatures.get(signature)!.push(row.tempId);
      });

      // Mark duplicates (if signature appears more than once)
      rowSignatures.forEach((tempIds, signature) => {
        if (tempIds.length > 1) {
          tempIds.forEach(tempId => newFormDuplicateRows.add(tempId));
        }
      });

      setFormDuplicateRows(newFormDuplicateRows);
    };

    // Debounce the check
    const timeoutId = setTimeout(() => {
      checkFormDuplicates();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [rows]);

  const fetchData = async () => {
    if (!currentProject) return;

    const [
      companiesRes,
      personnelRes,
      controlStepsRes,
      activitiesRes,
      manufacturingUnitsRes,
      constAllowedRolesRes,
      qcAllowedRolesRes
    ] = await Promise.all([
      supabase
        .from('companies')
        .select('id, name')
        .eq('project_id', currentProject.id)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('personnel')
        .select('id, first_name, last_name, company_id, noi_access, role_id, user_profiles(full_name)')
        .eq('project_id', currentProject.id)
        .order('first_name'),
      supabase
        .from('project_control_steps')
        .select('id, name, is_active, activity_id')
        .eq('project_id', currentProject.id)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('project_activities')
        .select('id, name, is_active, manufacturing_unit_id')
        .eq('project_id', currentProject.id)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('project_manufacturing_units')
        .select('id, name')
        .eq('project_id', currentProject.id)
        .order('name'),
      supabase
        .from('noi_const_personnel_allowed_roles')
        .select('role_id')
        .eq('project_id', currentProject.id)
        .eq('is_active', true),
      supabase
        .from('noi_qc_personnel_allowed_roles')
        .select('role_id')
        .eq('project_id', currentProject.id)
        .eq('is_active', true)
    ]);

    if (companiesRes.error) {
      console.error('Companies fetch error:', companiesRes.error);
    }
    if (personnelRes.error) {
      console.error('Personnel fetch error:', personnelRes.error);
    }
    if (controlStepsRes.error) {
      console.error('Control steps fetch error:', controlStepsRes.error);
    }
    if (activitiesRes.error) {
      console.error('Activities fetch error:', activitiesRes.error);
    }
    if (manufacturingUnitsRes.error) {
      console.error('Manufacturing units fetch error:', manufacturingUnitsRes.error);
    }

    console.log('Fetched control steps:', controlStepsRes.data);
    console.log('Fetched activities:', activitiesRes.data);

    // Get allowed role IDs
    const constAllowedRoleIds = constAllowedRolesRes.data?.map(ar => ar.role_id) || [];
    const qcAllowedRoleIds = qcAllowedRolesRes.data?.map(ar => ar.role_id) || [];

    // Filter personnel based on noi_access and allowed roles
    let allPersonnelList = personnelRes.data as Personnel[] || [];
    let constPersonnelList = allPersonnelList;
    let qcPersonnelList = allPersonnelList;

    // Filter const personnel
    if (constAllowedRoleIds.length > 0) {
      constPersonnelList = allPersonnelList.filter(p =>
        p.noi_access === true &&
        p.role_id &&
        constAllowedRoleIds.includes(p.role_id)
      );
    } else {
      // If no allowed roles configured, show all personnel with noi_access
      constPersonnelList = allPersonnelList.filter(p => p.noi_access === true);
    }

    // Filter qc personnel
    if (qcAllowedRoleIds.length > 0) {
      qcPersonnelList = allPersonnelList.filter(p =>
        p.noi_access === true &&
        p.role_id &&
        qcAllowedRoleIds.includes(p.role_id)
      );
    } else {
      // If no allowed roles configured, show all personnel with noi_access
      qcPersonnelList = allPersonnelList.filter(p => p.noi_access === true);
    }

    // Sort personnel lists by name
    const sortPersonnel = (list: Personnel[]) => {
      return list.sort((a, b) => {
        const nameA = a.user_profiles?.full_name || `${a.first_name} ${a.last_name}`.trim() || '';
        const nameB = b.user_profiles?.full_name || `${b.first_name} ${b.last_name}`.trim() || '';
        return nameA.localeCompare(nameB, 'tr');
      });
    };

    if (companiesRes.data) setCompanies(companiesRes.data);
    if (allPersonnelList) setAllPersonnel(allPersonnelList);
    setConstPersonnel(sortPersonnel(constPersonnelList));
    setQcPersonnel(sortPersonnel(qcPersonnelList));
    if (controlStepsRes.data) setControlSteps(controlStepsRes.data);
    if (activitiesRes.data) setActivities(activitiesRes.data);
    if (manufacturingUnitsRes.data) setManufacturingUnits(manufacturingUnitsRes.data);

    setLoading(false);
  };

  const addRow = () => {
    setRows([
      ...rows,
      {
        tempId: `row-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().slice(0, 5),
        company_id: '',
        const_personnel_id: '',
        qc_personnel_id: '',
        location: '',
        hold_point_id: '',
        manufacturing_unit_id: '',
        activity_id: ''
      }
    ]);
  };

  const removeRow = (tempId: string) => {
    if (rows.length === 1) {
      alert('En az bir satır olmalıdır');
      return;
    }
    setRows(rows.filter(row => row.tempId !== tempId));
    setDuplicateRows(prev => {
      const newSet = new Set(prev);
      newSet.delete(tempId);
      return newSet;
    });
    setFormDuplicateRows(prev => {
      const newSet = new Set(prev);
      newSet.delete(tempId);
      return newSet;
    });
  };

  const copyRow = (tempId: string) => {
    const rowToCopy = rows.find(row => row.tempId === tempId);
    if (!rowToCopy) return;

    const newRow: NoiCreateRow = {
      tempId: `row-${Date.now()}-${Math.random()}`,
      date: rowToCopy.date,
      time: rowToCopy.time,
      company_id: rowToCopy.company_id,
      const_personnel_id: rowToCopy.const_personnel_id,
      qc_personnel_id: rowToCopy.qc_personnel_id,
      location: '', // Mahal boş kalacak
      hold_point_id: rowToCopy.hold_point_id,
      manufacturing_unit_id: rowToCopy.manufacturing_unit_id,
      activity_id: rowToCopy.activity_id
    };

    const rowIndex = rows.findIndex(row => row.tempId === tempId);
    const newRows = [...rows];
    newRows.splice(rowIndex + 1, 0, newRow);
    setRows(newRows);
  };

  const updateRow = (tempId: string, field: keyof NoiCreateRow, value: string) => {
    setRows(rows.map(row => {
      if (row.tempId !== tempId) return row;

      // Cascade clearing: When manufacturing unit changes, clear activity and control step
      if (field === 'manufacturing_unit_id') {
        return { ...row, manufacturing_unit_id: value, activity_id: '', hold_point_id: '' };
      }

      // Cascade clearing: When activity changes, clear control step
      if (field === 'activity_id') {
        return { ...row, activity_id: value, hold_point_id: '' };
      }

      return { ...row, [field]: value };
    }));
  };

  const handleSubmit = async () => {
    // Validate all rows
    const errors: { [tempId: string]: string } = {};
    rows.forEach(row => {
      const error = validateNoiRow(row);
      if (error) {
        errors[row.tempId] = error;
      }
    });

    if (Object.keys(errors).length > 0) {
      const errorMessages = Object.values(errors).join('\n');
      alert(`Lütfen tüm zorunlu alanları doldurun:\n\n${errorMessages}`);
      return;
    }

    // Check for duplicate rows within the form (skip for resubmit)
    if (!isResubmit && formDuplicateRows.size > 0) {
      const duplicateCount = formDuplicateRows.size;
      alert(
        `UYARI: Form içinde ${duplicateCount} adet mükerrer (aynı) satır bulunmaktadır.\n\n` +
        `Aynı Tarih, Saat, Firma, Const Personel, QC Personel, Mahal ve Hold Point bilgilerine sahip ` +
        `satırlar tekrar kayıt açılamaz. Lütfen sarı renkle işaretlenmiş mükerrer satırları kontrol ediniz.`
      );
      return;
    }

    // Check for duplicate approved NOIs (skip for resubmit)
    if (!isResubmit && duplicateRows.size > 0) {
      const duplicateCount = duplicateRows.size;
      alert(
        `UYARI: ${duplicateCount} adet satır için geçmişte onaylanmış NOI bulunmaktadır.\n\n` +
        `Aynı Mahal, Hold Point ve Firma kombinasyonu ile daha önce onaylanmış NOI kaydı olduğu için ` +
        `bu kayıtlar oluşturulamaz. Lütfen kırmızı renkle işaretlenmiş satırları kontrol ediniz.`
      );
      return;
    }

    // Different confirmation message for resubmit
    const confirmMessage = isResubmit
      ? 'Yeni revizyon oluşturulacak. Onaylıyor musunuz?'
      : `${rows.length} adet NOI talebi oluşturulacak. Onaylıyor musunuz?`;

    if (!confirm(confirmMessage)) return;

    setSaving(true);

    try {
      // Special handling for resubmit
      if (isResubmit && initialData) {
        const row = rows[0]; // Resubmit için tek satır var

        // 1. Update old NOI status
        await supabase
          .from('noi_requests')
          .update({ status: 'Reddedildi-Yeni Talep' })
          .eq('id', initialData.id);

        // 2. Create new revision
        const baseNumber = extractBaseNoiNumber(initialData.noi_number);
        const nextRevision = getNextRevisionNumber(initialData.noi_number);
        const newNoiNumber = formatNoiNumber(baseNumber, nextRevision);

        const { error } = await supabase
          .from('noi_requests')
          .insert({
            project_id: currentProject!.id,
            noi_number: newNoiNumber,
            status: 'pending_approval',
            date: row.date,
            time: row.time,
            company_id: row.company_id,
            const_personnel_id: row.const_personnel_id,
            qc_personnel_id: row.qc_personnel_id,
            location: row.location,
            hold_point_id: row.hold_point_id || null,
            manufacturing_unit_id: row.manufacturing_unit_id || null,
            activity_id: row.activity_id || null,
            revision_number: nextRevision,
            original_noi_number: baseNumber,
            created_by: userProfile!.id
          });

        if (error) throw error;

        alert(`Yeni revizyon başarıyla oluşturuldu: ${newNoiNumber}`);
      } else {
        // Create NOI requests using the database function
        const results = await Promise.all(
          rows.map(row =>
            supabase.rpc('create_noi_request', {
              p_project_id: currentProject!.id,
              p_date: row.date,
              p_time: row.time,
              p_company_id: row.company_id,
              p_const_personnel_id: row.const_personnel_id,
              p_qc_personnel_id: row.qc_personnel_id,
              p_location: row.location,
              p_hold_point_id: row.hold_point_id || null,
              p_manufacturing_unit_id: row.manufacturing_unit_id || null,
              p_activity_id: row.activity_id || null
            })
          )
        );

        // Check for errors
        const failed = results.filter(r => r.error);
        if (failed.length > 0) {
          console.error('Some NOI requests failed:', failed);
          alert(`${failed.length} adet NOI talebi oluşturulurken hata oluştu. Lütfen tekrar deneyin.`);
          setSaving(false);
          return;
        }

        alert(`${rows.length} adet NOI talebi başarıyla oluşturuldu!`);
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating NOI requests:', error);
      alert('NOI talepleri oluşturulurken hata oluştu: ' + error.message);
      setSaving(false);
    }
  };

  const getConstPersonnelOptions = () => {
    return constPersonnel.map(p => ({
      value: p.id,
      label: p.user_profiles?.full_name || `${p.first_name} ${p.last_name}`
    }));
  };

  const getQcPersonnelOptions = () => {
    return qcPersonnel.map(p => ({
      value: p.id,
      label: p.user_profiles?.full_name || `${p.first_name} ${p.last_name}`
    }));
  };

  // Cascade filter: Get activities for a specific manufacturing unit
  const getActivityOptions = (manufacturingUnitId: string) => {
    if (!manufacturingUnitId) {
      return [];
    }
    return activities
      .filter(a => a.manufacturing_unit_id === manufacturingUnitId)
      .map(a => ({
        value: a.id,
        label: a.name
      }));
  };

  // Cascade filter: Get control steps for a specific activity
  const getControlStepOptions = (activityId: string) => {
    if (!activityId) {
      return [];
    }
    return controlSteps
      .filter(cs => cs.activity_id === activityId)
      .map(cs => ({
        value: cs.id,
        label: cs.name
      }));
  };

  const companyOptions = companies.map(c => ({
    value: c.id,
    label: c.name
  }));

  const manufacturingUnitOptions = manufacturingUnits.map(mu => ({
    value: mu.id,
    label: mu.name
  }));

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
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-[95vw] h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {isResubmit ? 'Yeni Revizyon Oluştur' : 'NOI Talebi Oluştur'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {isResubmit
                ? 'Bilgileri düzenleyerek yeni revizyon oluşturun. '
                : 'Alt alta satır ekleyerek talep bilgilerini girin. '}
              <span className="text-red-600 font-semibold">Tüm alanlar zorunludur.</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto px-6 py-4 pb-96">
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap w-[120px]">
                    Tarih <span className="text-red-600">*</span>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap w-[100px]">
                    Saat <span className="text-red-600">*</span>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap w-[200px]">
                    Firma <span className="text-red-600">*</span>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap w-[200px]">
                    İmalat Birimi <span className="text-red-600">*</span>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap w-[200px]">
                    Aktivite <span className="text-red-600">*</span>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap w-[200px]">
                    Hold Point <span className="text-red-600">*</span>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap w-[200px]">
                    Const Personel <span className="text-red-600">*</span>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap w-[200px]">
                    QC Personel <span className="text-red-600">*</span>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap w-[150px]">
                    Mahal <span className="text-red-600">*</span>
                  </th>
                  {!isResubmit && (
                    <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 whitespace-nowrap w-[100px]">
                      İşlem
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.map((row) => {
                  const isDuplicate = duplicateRows.has(row.tempId); // Geçmişte onaylanmış
                  const isFormDuplicate = formDuplicateRows.has(row.tempId); // Form içinde duplicate
                  return (
                  <tr 
                    key={row.tempId} 
                    className={`hover:bg-gray-50 ${
                      isDuplicate 
                        ? 'bg-red-50 border-l-4 border-red-500' 
                        : isFormDuplicate 
                        ? 'bg-yellow-50 border-l-4 border-yellow-500' 
                        : ''
                    }`}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="date"
                        value={row.date}
                        onChange={(e) => updateRow(row.tempId, 'date', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="time"
                        value={row.time}
                        onChange={(e) => updateRow(row.tempId, 'time', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <SearchableDropdown
                        options={companyOptions}
                        value={row.company_id}
                        onChange={(value) => updateRow(row.tempId, 'company_id', value || '')}
                        placeholder="Firma seçin"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <SearchableDropdown
                        options={manufacturingUnitOptions}
                        value={row.manufacturing_unit_id}
                        onChange={(value) => updateRow(row.tempId, 'manufacturing_unit_id', value || '')}
                        placeholder="İmalat birimi seçin"
                        disabled={isResubmit}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <SearchableDropdown
                        options={getActivityOptions(row.manufacturing_unit_id)}
                        value={row.activity_id || ''}
                        onChange={(value) => updateRow(row.tempId, 'activity_id', value || '')}
                        placeholder={row.manufacturing_unit_id ? "Aktivite seçin" : "Önce imalat birimi seçin"}
                        disabled={!row.manufacturing_unit_id || isResubmit}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <SearchableDropdown
                        options={getControlStepOptions(row.activity_id || '')}
                        value={row.hold_point_id}
                        onChange={(value) => updateRow(row.tempId, 'hold_point_id', value || '')}
                        placeholder={row.activity_id ? "Hold point seçin" : "Önce aktivite seçin"}
                        disabled={!row.activity_id || isResubmit}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <SearchableDropdown
                        options={getConstPersonnelOptions()}
                        value={row.const_personnel_id}
                        onChange={(value) => updateRow(row.tempId, 'const_personnel_id', value || '')}
                        placeholder="Const personel seçin"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <SearchableDropdown
                        options={getQcPersonnelOptions()}
                        value={row.qc_personnel_id}
                        onChange={(value) => updateRow(row.tempId, 'qc_personnel_id', value || '')}
                        placeholder="QC personel seçin"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={row.location}
                        onChange={(e) => updateRow(row.tempId, 'location', e.target.value)}
                        placeholder="Mahal"
                        disabled={isResubmit}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      {!isResubmit && (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => copyRow(row.tempId)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                            title="Satırı Kopyala"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeRow(row.tempId)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                            title="Satırı Sil"
                            disabled={rows.length === 1}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      {isDuplicate && (
                        <div className="mt-1 text-xs text-red-600 font-medium">
                          Geçmişte onaylanmış
                        </div>
                      )}
                      {!isDuplicate && isFormDuplicate && (
                        <div className="mt-1 text-xs text-yellow-600 font-medium">
                          Form içinde mükerrer
                        </div>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Add Row Button - Hide in resubmit mode */}
          {!isResubmit && (
            <button
              onClick={addRow}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Yeni Satır Ekle
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-600">
            {isResubmit
              ? 'Yeni revizyon oluşturulacak'
              : `Toplam ${rows.length} adet NOI talebi oluşturulacak`}
          </p>
          <div className="flex gap-3">
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
                  Oluşturuluyor...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Talep Oluştur
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
