import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { useAuth } from '../contexts/AuthContext';
import { useProject } from '../contexts/ProjectContext';
import { supabase } from '../lib/supabase';
import { ResizableTable, ColumnDefinition } from '../components/ResizableTable';
import {
  ClipboardList, Plus, Download, Search, Calendar, Clock, AlertCircle,
  CheckCircle2, XCircle, Settings, ChevronDown, ChevronUp, RefreshCw,
  Edit2, Trash2, X, Filter
} from 'lucide-react';
import NoAccessPage from './NoAccessPage';
import { useNoiAccess } from '../hooks/useNoiAccess';
import {
  NoiRequestWithDetails,
  NoiSettings,
  getNoiStatusDisplay,
  getNoiStatusColor,
  shouldShowInPending,
  TIME_LOSS_GROUPS,
  formatNoiNumber,
  extractBaseNoiNumber,
  getNextRevisionNumber
} from '../lib/noiTypes';
import { NoiCreateModal } from '../components/NoiCreateModal';
import { NoiEditModal } from '../components/NoiEditModal';
import { SearchableFilterGroup } from '../components/SearchableFilterGroup';

export function NoiPage() {
  const { userProfile } = useAuth();
  const { currentProject, isProjectOwner } = useProject();
  const { hasAccess, isApprover, hasCreateAccess, loading: accessLoading } = useNoiAccess();
  const [noiRequests, setNoiRequests] = useState<NoiRequestWithDetails[]>([]);
  const [pendingNois, setPendingNois] = useState<NoiRequestWithDetails[]>([]);
  const [settings, setSettings] = useState<NoiSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [newPrefix, setNewPrefix] = useState('NOI');
  const [newCurrentNumber, setNewCurrentNumber] = useState(0);
  const [editingNoi, setEditingNoi] = useState<NoiRequestWithDetails | null>(null);
  const [resubmitNoi, setResubmitNoi] = useState<NoiRequestWithDetails | null>(null);

  // Filters
  const [filters, setFilters] = useState({
    status: [] as string[],
    company: [] as string[],
    constPersonnel: [] as string[],
    qcPersonnel: [] as string[],
    holdPoint: [] as string[],
    manufacturingUnit: [] as string[],
    startDate: '',
    endDate: ''
  });

  const [groupBy, setGroupBy] = useState<'none' | 'company' | 'const_personnel' | 'qc_personnel'>('none');
  const [groupToggles, setGroupToggles] = useState<{[key: string]: boolean}>({});
  const [showFilters, setShowFilters] = useState(false);

  // Pending NOIs filters (converted to multi-select)
  const [pendingSearchTerm, setPendingSearchTerm] = useState('');
  const [pendingShowFilters, setPendingShowFilters] = useState(false);
  const [pendingFilters, setPendingFilters] = useState({
    status: [] as string[],
    company: [] as string[],
    constPersonnel: [] as string[],
    qcPersonnel: [] as string[],
    holdPoint: [] as string[],
    manufacturingUnit: [] as string[]
  });
  const [pendingStartDate, setPendingStartDate] = useState('');
  const [pendingEndDate, setPendingEndDate] = useState('');

  // Toggle states for collapsible sections
  const [toggleStates, setToggleStates] = useState(() => {
    const saved = localStorage.getItem('noi-toggles');
    return saved ? JSON.parse(saved) : {
      myPending: true,
      allNois: true
    };
  });

  // Approval fields for pending NOIs
  const [approvalFields, setApprovalFields] = useState<{
    [noiId: string]: {
      approval_decision: string;
      delivery_time_minutes: string;
      time_loss_minutes: string;
      time_loss_group: string;
      notes: string;
    };
  }>({});

  // Postpone date modal
  const [postponeModal, setPostponeModal] = useState<{
    noiId: string;
    date: string;
  } | null>(null);

  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super_admin';

  useEffect(() => {
    localStorage.setItem('noi-toggles', JSON.stringify(toggleStates));
  }, [toggleStates]);

  const toggleSection = (section: keyof typeof toggleStates) => {
    setToggleStates(prev => ({ ...prev, [section]: !prev[section] }));
  };

  useEffect(() => {
    if (!accessLoading) {
      fetchData();
    }
  }, [userProfile, currentProject, accessLoading]);

  const fetchData = async () => {
    if (!userProfile || !currentProject) {
      setLoading(false);
      return;
    }

    await fetchSettings();
    await fetchNoiRequests();
    setLoading(false);
  };

  const fetchSettings = async () => {
    if (!currentProject) return;

    const { data, error } = await supabase
      .from('noi_settings')
      .select('*')
      .eq('project_id', currentProject.id)
      .maybeSingle();

    if (data) {
      setSettings(data);
      setNewPrefix(data.number_prefix);
      setNewCurrentNumber(data.current_number);
    } else if (!error) {
      // Create default settings
      const { data: newSettings } = await supabase
        .from('noi_settings')
        .insert({
          project_id: currentProject.id,
          number_prefix: 'NOI',
          current_number: 0
        })
        .select()
        .single();

      if (newSettings) {
        setSettings(newSettings);
        setNewPrefix(newSettings.number_prefix);
        setNewCurrentNumber(newSettings.current_number);
      }
    }
  };

  const fetchNoiRequests = async () => {
    if (!currentProject) return;

    const { data, error } = await supabase
      .from('noi_requests')
      .select(`
        *,
        companies(name),
        const_personnel:personnel!const_personnel_id(first_name, last_name, user_profiles(full_name)),
        qc_personnel:personnel!qc_personnel_id(first_name, last_name, user_profiles(full_name)),
        hold_point:project_control_steps(name),
        manufacturing_unit:project_manufacturing_units(name),
        creator:user_profiles!created_by(full_name)
      `)
      .eq('project_id', currentProject.id)
      .order('created_at', { ascending: false });

    if (data) {
      const noisWithDetails = data as NoiRequestWithDetails[];
      setNoiRequests(noisWithDetails);
      filterPendingNois(noisWithDetails);
    }
  };

  const filterPendingNois = (allNois: NoiRequestWithDetails[]) => {
    if (!userProfile) return;

    const pending = allNois.filter(noi =>
      shouldShowInPending(noi, userProfile.id, isApprover, isAdmin)
    );

    setPendingNois(pending);
  };

  const updateSettings = async () => {
    if (!currentProject || !settings) {
      alert('Ayarlar güncellenemiyor. Lütfen sayfayı yenileyin.');
      return;
    }

    if (!newPrefix.trim()) {
      alert('Numara prefix boş olamaz');
      return;
    }

    const currentNumberValue = parseInt(String(newCurrentNumber)) || 0;

    if (currentNumberValue < 0) {
      alert('Mevcut numara negatif olamaz');
      return;
    }

    const { data, error } = await supabase
      .from('noi_settings')
      .update({
        number_prefix: newPrefix.trim().toUpperCase(),
        current_number: currentNumberValue
      })
      .eq('id', settings.id)
      .select()
      .single();

    if (error) {
      console.error('Settings update error:', error);
      alert('Ayarlar güncellenirken hata oluştu: ' + error.message);
    } else if (data) {
      await fetchData();
      setShowSettings(false);
      alert(`NOI numarası ayarları başarıyla güncellendi!\n\nYeni prefix: ${data.number_prefix}\nMevcut numara: ${data.current_number}\n\nYeni oluşturulacak NOI: ${data.number_prefix}-${String(data.current_number + 1).padStart(3, '0')}`);
    }
  };

  const handleApprove = async (noiId: string) => {
    const fields = approvalFields[noiId];
    if (!fields) {
      alert('Lütfen tüm alanları doldurun');
      return;
    }

    // Teslimat Süresi, Kayıp Zaman ve Kayıp Zaman Grup zorunlu
    if (!fields.delivery_time_minutes || !fields.time_loss_minutes || !fields.time_loss_group) {
      alert('Teslimat Süresi, Kayıp Zaman ve Kayıp Zaman Grup alanları zorunludur');
      return;
    }

    const deliveryTime = parseInt(fields.delivery_time_minutes);
    if (isNaN(deliveryTime) || deliveryTime < 0) {
      alert('Teslimat süresi geçerli bir sayı olmalıdır');
      return;
    }

    const timeLoss = parseInt(fields.time_loss_minutes);
    if (isNaN(timeLoss) || timeLoss < 0) {
      alert('Kayıp Zaman geçerli bir sayı olmalıdır');
      return;
    }

    if (!confirm('Bu NOI talebini onaylamak istediğinizden emin misiniz?')) return;

    const { error } = await supabase
      .from('noi_requests')
      .update({
        status: 'approved',
        approval_decision: fields.approval_decision || null,
        delivery_time_minutes: deliveryTime,
        time_loss_minutes: timeLoss,
        time_loss_group: fields.time_loss_group,
        notes: fields.notes || null,
        approved_date: new Date().toISOString()
      })
      .eq('id', noiId);

    if (error) {
      console.error('Approve error:', error);
      alert('Onaylama sırasında hata oluştu: ' + error.message);
    } else {
      // Create history record
      await supabase.from('noi_history').insert({
        noi_id: noiId,
        user_id: userProfile!.id,
        action: 'approved',
        old_status: 'pending_approval',
        new_status: 'approved',
        notes: 'NOI talebi onaylandı'
      });

      await fetchData();
      // Clear approval fields
      setApprovalFields(prev => {
        const newFields = { ...prev };
        delete newFields[noiId];
        return newFields;
      });
    }
  };

  const handleReject = async (noiId: string) => {
    const fields = approvalFields[noiId];

    if (!fields) {
      alert('Lütfen tüm alanları doldurun');
      return;
    }

    const rejectReason = fields.notes || '';
    if (!rejectReason.trim()) {
      alert('Red sebebi girmelisiniz (Açıklama alanına yazın)');
      return;
    }

    // Teslimat Süresi, Kayıp Zaman ve Kayıp Zaman Grup zorunlu (red durumunda da)
    if (!fields.delivery_time_minutes || !fields.time_loss_minutes || !fields.time_loss_group) {
      alert('Teslimat Süresi, Kayıp Zaman ve Kayıp Zaman Grup alanları zorunludur');
      return;
    }

    const deliveryTime = parseInt(fields.delivery_time_minutes);
    if (isNaN(deliveryTime) || deliveryTime < 0) {
      alert('Teslimat süresi geçerli bir sayı olmalıdır');
      return;
    }

    const timeLoss = parseInt(fields.time_loss_minutes);
    if (isNaN(timeLoss) || timeLoss < 0) {
      alert('Kayıp Zaman geçerli bir sayı olmalıdır');
      return;
    }

    if (!confirm('Bu NOI talebini reddetmek istediğinizden emin misiniz?')) return;

    const { error } = await supabase
      .from('noi_requests')
      .update({
        status: 'rejected',
        delivery_time_minutes: deliveryTime,
        time_loss_minutes: timeLoss,
        time_loss_group: fields.time_loss_group,
        notes: rejectReason,
        rejected_date: new Date().toISOString()
      })
      .eq('id', noiId);

    if (error) {
      console.error('Reject error:', error);
      alert('Reddetme sırasında hata oluştu: ' + error.message);
    } else {
      // Create history record
      await supabase.from('noi_history').insert({
        noi_id: noiId,
        user_id: userProfile!.id,
        action: 'rejected',
        old_status: 'pending_approval',
        new_status: 'rejected',
        notes: `NOI talebi reddedildi: ${rejectReason}`
      });

      await fetchData();
    }
  };

  const handlePostpone = async () => {
    if (!postponeModal || !postponeModal.date) {
      alert('Lütfen erteleme tarihini seçin');
      return;
    }

    const { error } = await supabase
      .from('noi_requests')
      .update({
        date: postponeModal.date,
        postponed_date: postponeModal.date
      })
      .eq('id', postponeModal.noiId);

    if (error) {
      console.error('Postpone error:', error);
      alert('Erteleme sırasında hata oluştu: ' + error.message);
    } else {
      // Create history record
      await supabase.from('noi_history').insert({
        noi_id: postponeModal.noiId,
        user_id: userProfile!.id,
        action: 'postponed',
        old_status: 'pending_approval',
        new_status: 'pending_approval',
        notes: `NOI talebi ertelendi: ${postponeModal.date}`
      });

      await fetchData();
      setPostponeModal(null);
    }
  };

  const handleCancel = async (noiId: string) => {
    if (!confirm('Bu NOI talebini iptal etmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) return;

    const { error } = await supabase
      .from('noi_requests')
      .update({
        status: 'cancelled',
        cancelled_date: new Date().toISOString()
      })
      .eq('id', noiId);

    if (error) {
      console.error('Cancel error:', error);
      alert('İptal sırasında hata oluştu: ' + error.message);
    } else {
      // Create history record
      await supabase.from('noi_history').insert({
        noi_id: noiId,
        user_id: userProfile!.id,
        action: 'cancelled',
        old_status: 'rejected',
        new_status: 'cancelled',
        notes: 'NOI talebi iptal edildi'
      });

      await fetchData();
    }
  };

  const handleEdit = (noi: NoiRequestWithDetails) => {
    setEditingNoi(noi);
  };

  const handleDelete = async (noiId: string) => {
    if (!confirm('Bu NOI talebini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) return;

    const { error } = await supabase
      .from('noi_requests')
      .delete()
      .eq('id', noiId);

    if (error) {
      console.error('Delete error:', error);
      alert('Silme sırasında hata oluştu: ' + error.message);
    } else {
      // Create history record before deletion if possible
      await supabase.from('noi_history').insert({
        noi_id: noiId,
        user_id: userProfile!.id,
        action: 'deleted',
        old_status: null,
        new_status: null,
        notes: 'NOI talebi silindi'
      }).catch(() => {
        // Ignore history error if record can't be created
      });

      alert('NOI talebi başarıyla silindi.');
      await fetchData();
    }
  };


  const handleResubmit = (noi: NoiRequestWithDetails) => {
    // Open modal with pre-filled data
    setResubmitNoi(noi);
  };

  const exportToExcel = () => {
    // Check if there's filtered data to export
    if (filteredNois.length === 0) {
      alert('Export edilecek kayıt bulunamadı. Lütfen filtrelerinizi kontrol edin.');
      return;
    }

    const data = filteredNois.map(noi => ({
      'NOI Numarası': noi.noi_number,
      'Durum': getNoiStatusDisplay(noi.status),
      'Tarih': noi.date,
      'Saat': noi.time,
      'Firma': noi.companies?.name || '-',
      'İmalat Birimi': noi.manufacturing_unit?.name || '-',
      'Const Personel': noi.const_personnel?.user_profiles?.full_name ||
        `${noi.const_personnel?.first_name || ''} ${noi.const_personnel?.last_name || ''}`.trim() || '-',
      'QC Personel': noi.qc_personnel?.user_profiles?.full_name ||
        `${noi.qc_personnel?.first_name || ''} ${noi.qc_personnel?.last_name || ''}`.trim() || '-',
      'Mahal': noi.location || '-',
      'Hold Point': noi.hold_point?.name || '-',
      'Teslimat Süresi (Dk)': noi.delivery_time_minutes || '-',
      'Kayıp Zaman(Dk)': noi.time_loss_minutes || '-',
      'Kayıp Zaman Grup': noi.time_loss_group || '-',
      'Açıklama': noi.notes || '-',
      'Oluşturan': noi.creator?.full_name || '-',
      'Oluşturma Tarihi': new Date(noi.created_at).toLocaleString('tr-TR'),
      'Onay Tarihi': noi.approved_date ? new Date(noi.approved_date).toLocaleString('tr-TR') : '-',
      'Red Tarihi': noi.rejected_date ? new Date(noi.rejected_date).toLocaleString('tr-TR') : '-',
      'İptal Tarihi': noi.cancelled_date ? new Date(noi.cancelled_date).toLocaleString('tr-TR') : '-'
    }));

    const separator = ';';
    const headers = Object.keys(data[0] || {});
    const csvContent = [
      headers.join(separator),
      ...data.map(row => headers.map(h => {
        const value = (row as any)[h] || '';
        const stringValue = String(value).replace(/"/g, '""');
        return `"${stringValue}"`;
      }).join(separator))
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `noi-talepleri-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter and sort NOI requests
  const filteredNois = noiRequests.filter(noi => {
    // Text search filter
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      noi.noi_number.toLowerCase().includes(searchLower) ||
      noi.companies?.name?.toLowerCase().includes(searchLower) ||
      noi.location?.toLowerCase().includes(searchLower) ||
      getNoiStatusDisplay(noi.status).toLowerCase().includes(searchLower);

    // Status filter
    const matchesStatus = filters.status.length === 0 || filters.status.includes(noi.status);

    // Company filter
    const matchesCompany = filters.company.length === 0 || filters.company.includes(noi.company_id || '');

    // Const Personnel filter
    const matchesConstPersonnel = filters.constPersonnel.length === 0 || filters.constPersonnel.includes(noi.const_personnel_id || '');

    // QC Personnel filter
    const matchesQcPersonnel = filters.qcPersonnel.length === 0 || filters.qcPersonnel.includes(noi.qc_personnel_id || '');

    // Hold Point filter
    const matchesHoldPoint = filters.holdPoint.length === 0 || filters.holdPoint.includes(noi.hold_point_id || '');

    // Manufacturing Unit filter
    const matchesManufacturingUnit = filters.manufacturingUnit.length === 0 || filters.manufacturingUnit.includes(noi.manufacturing_unit_id || '');

    // Date range filter
    const noiDate = new Date(noi.date);
    const matchesStartDate = !filters.startDate || noiDate >= new Date(filters.startDate);
    const matchesEndDate = !filters.endDate || noiDate <= new Date(filters.endDate);

    return matchesSearch && matchesStatus && matchesCompany && matchesConstPersonnel && matchesQcPersonnel && matchesHoldPoint && matchesManufacturingUnit && matchesStartDate && matchesEndDate;
  });

  const sortedNois = [...filteredNois].sort((a, b) => {
    let aVal: any = a[sortColumn as keyof typeof a];
    let bVal: any = b[sortColumn as keyof typeof b];

    if (sortColumn === 'company') {
      aVal = a.companies?.name || '';
      bVal = b.companies?.name || '';
    } else if (sortColumn === 'const_personnel') {
      aVal = a.const_personnel?.user_profiles?.full_name || 
             `${a.const_personnel?.first_name || ''} ${a.const_personnel?.last_name || ''}`.trim() || '';
      bVal = b.const_personnel?.user_profiles?.full_name || 
             `${b.const_personnel?.first_name || ''} ${b.const_personnel?.last_name || ''}`.trim() || '';
    } else if (sortColumn === 'qc_personnel') {
      aVal = a.qc_personnel?.user_profiles?.full_name || 
             `${a.qc_personnel?.first_name || ''} ${a.qc_personnel?.last_name || ''}`.trim() || '';
      bVal = b.qc_personnel?.user_profiles?.full_name || 
             `${b.qc_personnel?.first_name || ''} ${b.qc_personnel?.last_name || ''}`.trim() || '';
    }

    // Handle null/undefined values
    if (aVal == null) aVal = '';
    if (bVal == null) bVal = '';

    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Gruplama mantığı
  const getGroupedNois = () => {
    if (groupBy === 'none') return null;

    const groups: { [key: string]: NoiRequestWithDetails[] } = {};

    sortedNois.forEach(noi => {
      let groupKey = '';

      if (groupBy === 'company') {
        groupKey = noi.companies?.name || 'Firma Atanmamış';
      } else if (groupBy === 'const_personnel') {
        groupKey = noi.const_personnel?.user_profiles?.full_name ||
                  `${noi.const_personnel?.first_name || ''} ${noi.const_personnel?.last_name || ''}`.trim() ||
                  'Şantiye Personeli Atanmamış';
      } else if (groupBy === 'qc_personnel') {
        groupKey = noi.qc_personnel?.user_profiles?.full_name ||
                  `${noi.qc_personnel?.first_name || ''} ${noi.qc_personnel?.last_name || ''}`.trim() ||
                  'QC Personeli Atanmamış';
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(noi);
    });

    return groups;
  };

  const groupedNois = getGroupedNois();

  // Filter pending NOIs
  const filteredPendingNois = pendingNois.filter(noi => {
    // Text search filter
    const searchLower = pendingSearchTerm.toLowerCase();
    const matchesSearch =
      noi.noi_number.toLowerCase().includes(searchLower) ||
      noi.companies?.name?.toLowerCase().includes(searchLower) ||
      noi.location?.toLowerCase().includes(searchLower);

    // Status filter
    const matchesStatus = pendingFilters.status.length === 0 || pendingFilters.status.includes(noi.status);

    // Company filter
    const matchesCompany = pendingFilters.company.length === 0 || pendingFilters.company.includes(noi.company_id || '');

    // Const Personnel filter
    const matchesConstPersonnel = pendingFilters.constPersonnel.length === 0 || pendingFilters.constPersonnel.includes(noi.const_personnel_id || '');

    // QC Personnel filter
    const matchesQcPersonnel = pendingFilters.qcPersonnel.length === 0 || pendingFilters.qcPersonnel.includes(noi.qc_personnel_id || '');

    // Hold Point filter
    const matchesHoldPoint = pendingFilters.holdPoint.length === 0 || pendingFilters.holdPoint.includes(noi.hold_point_id || '');

    // Manufacturing Unit filter
    const matchesManufacturingUnit = pendingFilters.manufacturingUnit.length === 0 || pendingFilters.manufacturingUnit.includes(noi.manufacturing_unit_id || '');

    // Date range filter
    const noiDate = new Date(noi.date);
    const matchesStartDate = !pendingStartDate || noiDate >= new Date(pendingStartDate);
    const matchesEndDate = !pendingEndDate || noiDate <= new Date(pendingEndDate);

    return matchesSearch && matchesStatus && matchesCompany && matchesConstPersonnel && matchesQcPersonnel && matchesHoldPoint && matchesManufacturingUnit && matchesStartDate && matchesEndDate;
  });

  // Sort pending NOIs with same logic
  const sortedPendingNois = [...filteredPendingNois].sort((a, b) => {
    let aVal: any = a[sortColumn as keyof typeof a];
    let bVal: any = b[sortColumn as keyof typeof b];

    if (sortColumn === 'company') {
      aVal = a.companies?.name || '';
      bVal = b.companies?.name || '';
    } else if (sortColumn === 'const_personnel') {
      aVal = a.const_personnel?.user_profiles?.full_name ||
             `${a.const_personnel?.first_name || ''} ${a.const_personnel?.last_name || ''}`.trim() || '';
      bVal = b.const_personnel?.user_profiles?.full_name ||
             `${b.const_personnel?.first_name || ''} ${b.const_personnel?.last_name || ''}`.trim() || '';
    } else if (sortColumn === 'qc_personnel') {
      aVal = a.qc_personnel?.user_profiles?.full_name ||
             `${a.qc_personnel?.first_name || ''} ${a.qc_personnel?.last_name || ''}`.trim() || '';
      bVal = b.qc_personnel?.user_profiles?.full_name ||
             `${b.qc_personnel?.first_name || ''} ${b.qc_personnel?.last_name || ''}`.trim() || '';
    }

    // Handle null/undefined values
    if (aVal == null) aVal = '';
    if (bVal == null) bVal = '';

    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Update approval field
  const updateApprovalField = (noiId: string, field: string, value: string) => {
    setApprovalFields(prev => ({
      ...prev,
      [noiId]: {
        ...prev[noiId],
        [field]: value
      }
    }));
  };

  // Define columns for pending NOIs table
  const pendingColumns: ColumnDefinition[] = [
    {
      key: 'noi_number',
      header: 'NOI No',
      width: 130,
      sortable: true,
      render: (row: NoiRequestWithDetails) => (
        <span className="font-mono font-semibold text-gray-900">{row.noi_number}</span>
      )
    },
    {
      key: 'status',
      header: 'Durum',
      width: 160,
      sortable: true,
      render: (row: NoiRequestWithDetails) => (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getNoiStatusColor(row.status)}`}>
          {getNoiStatusDisplay(row.status)}
        </span>
      )
    },
    {
      key: 'date',
      header: 'Tarih',
      width: 110,
      sortable: true,
      render: (row: NoiRequestWithDetails) => row.date
    },
    {
      key: 'time',
      header: 'Saat',
      width: 90,
      sortable: true,
      render: (row: NoiRequestWithDetails) => row.time
    },
    {
      key: 'company',
      header: 'Firma',
      width: 180,
      sortable: true,
      render: (row: NoiRequestWithDetails) => row.companies?.name || '-'
    },
    {
      key: 'manufacturing_unit',
      header: 'İmalat Birimi',
      width: 180,
      render: (row: NoiRequestWithDetails) => row.manufacturing_unit?.name || '-'
    },
    {
      key: 'const_personnel',
      header: 'Const Personel',
      width: 180,
      render: (row: NoiRequestWithDetails) =>
        row.const_personnel?.user_profiles?.full_name ||
        `${row.const_personnel?.first_name || ''} ${row.const_personnel?.last_name || ''}`.trim() || '-'
    },
    {
      key: 'qc_personnel',
      header: 'QC Personel',
      width: 180,
      render: (row: NoiRequestWithDetails) =>
        row.qc_personnel?.user_profiles?.full_name ||
        `${row.qc_personnel?.first_name || ''} ${row.qc_personnel?.last_name || ''}`.trim() || '-'
    },
    {
      key: 'location',
      header: 'Mahal',
      width: 250,
      render: (row: NoiRequestWithDetails) => row.location || '-'
    },
    {
      key: 'hold_point',
      header: 'Hold Point',
      width: 180,
      render: (row: NoiRequestWithDetails) => row.hold_point?.name || '-'
    },
    {
      key: 'delivery_time',
      header: 'Teslimat Süresi (Dk)',
      width: 140,
      render: (row: NoiRequestWithDetails) => {
        if (row.status !== 'pending_approval') {
          return <span>{row.delivery_time_minutes || '-'}</span>;
        }
        return (
          <input
            type="number"
            min="0"
            required
            className="w-full px-2 py-1 border border-red-300 rounded text-sm"
            value={approvalFields[row.id]?.delivery_time_minutes || ''}
            onChange={(e) => updateApprovalField(row.id, 'delivery_time_minutes', e.target.value)}
            placeholder="Zorunlu *"
          />
        );
      }
    },
    {
      key: 'time_loss_minutes',
      header: 'Kayıp Zaman(Dk)',
      width: 140,
      render: (row: NoiRequestWithDetails) => {
        if (row.status !== 'pending_approval') {
          return <span>{row.time_loss_minutes || '-'}</span>;
        }
        return (
          <input
            type="number"
            min="0"
            required
            className="w-full px-2 py-1 border border-red-300 rounded text-sm"
            value={approvalFields[row.id]?.time_loss_minutes || ''}
            onChange={(e) => updateApprovalField(row.id, 'time_loss_minutes', e.target.value)}
            placeholder="Zorunlu *"
          />
        );
      }
    },
    {
      key: 'time_loss_group',
      header: 'Kayıp Zaman Grup',
      width: 170,
      render: (row: NoiRequestWithDetails) => {
        if (row.status !== 'pending_approval') {
          return <span>{row.time_loss_group || '-'}</span>;
        }
        return (
          <select
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            value={approvalFields[row.id]?.time_loss_group || ''}
            onChange={(e) => updateApprovalField(row.id, 'time_loss_group', e.target.value)}
          >
            <option value="">Seçin</option>
            {TIME_LOSS_GROUPS.map(group => (
              <option key={group} value={group}>{group}</option>
            ))}
          </select>
        );
      }
    },
    {
      key: 'notes',
      header: 'Açıklama',
      width: 250,
      render: (row: NoiRequestWithDetails) => {
        if (row.status !== 'pending_approval') {
          return <span className="text-sm">{row.notes || '-'}</span>;
        }
        return (
          <textarea
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            rows={2}
            value={approvalFields[row.id]?.notes || ''}
            onChange={(e) => updateApprovalField(row.id, 'notes', e.target.value)}
            placeholder="Açıklama..."
          />
        );
      }
    },
    {
      key: 'actions',
      header: 'İşlemler',
      width: 250,
      render: (row: NoiRequestWithDetails) => {
        // For approvers and admins - pending approval
        if (row.status === 'pending_approval' && (isApprover || isAdmin)) {
          return (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => handleApprove(row.id)}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition"
              >
                Kabul
              </button>
              <button
                onClick={() => handleReject(row.id)}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition"
              >
                Red
              </button>
              <button
                onClick={() => setPostponeModal({ noiId: row.id, date: '' })}
                className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 transition"
              >
                Ertele
              </button>
              {isAdmin && (
                <button
                  onClick={() => handleEdit(row)}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition"
                  title="Düzenle"
                >
                  Düzenle
                </button>
              )}
            </div>
          );
        }
        // For creators - rejected
        if (row.status === 'rejected' && row.created_by === userProfile?.id) {
          return (
            <div className="flex gap-2">
              <button
                onClick={() => handleCancel(row.id)}
                className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition"
              >
                İptal Et
              </button>
              <button
                onClick={() => handleResubmit(row)}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition"
              >
                Tekrar Talep Oluştur
              </button>
            </div>
          );
        }
        // For admins - rejected (also show cancel button)
        if (row.status === 'rejected' && isAdmin) {
          return (
            <div className="flex gap-2">
              <button
                onClick={() => handleCancel(row.id)}
                className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition"
              >
                İptal Et
              </button>
              <button
                onClick={() => handleResubmit(row)}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition"
              >
                Tekrar Talep Oluştur
              </button>
            </div>
          );
        }
        return <span className="text-sm text-gray-500">-</span>;
      }
    }
  ];

  // Define columns for all NOIs table
  const allNoisColumns: ColumnDefinition[] = [
    {
      key: 'noi_number',
      header: 'NOI No',
      width: 130,
      sortable: true,
      render: (row: NoiRequestWithDetails) => (
        <span className="font-mono font-semibold text-gray-900">{row.noi_number}</span>
      )
    },
    {
      key: 'status',
      header: 'Durum',
      width: 160,
      sortable: true,
      render: (row: NoiRequestWithDetails) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getNoiStatusColor(row.status)}`}>
          {getNoiStatusDisplay(row.status)}
        </span>
      )
    },
    {
      key: 'date',
      header: 'Tarih',
      width: 110,
      sortable: true,
      render: (row: NoiRequestWithDetails) => row.date
    },
    {
      key: 'time',
      header: 'Saat',
      width: 90,
      render: (row: NoiRequestWithDetails) => row.time
    },
    {
      key: 'company',
      header: 'Firma',
      width: 180,
      sortable: true,
      render: (row: NoiRequestWithDetails) => row.companies?.name || '-'
    },
    {
      key: 'manufacturing_unit',
      header: 'İmalat Birimi',
      width: 180,
      render: (row: NoiRequestWithDetails) => row.manufacturing_unit?.name || '-'
    },
    {
      key: 'const_personnel',
      header: 'Const Personel',
      width: 180,
      render: (row: NoiRequestWithDetails) =>
        row.const_personnel?.user_profiles?.full_name ||
        `${row.const_personnel?.first_name || ''} ${row.const_personnel?.last_name || ''}`.trim() || '-'
    },
    {
      key: 'qc_personnel',
      header: 'QC Personel',
      width: 180,
      render: (row: NoiRequestWithDetails) =>
        row.qc_personnel?.user_profiles?.full_name ||
        `${row.qc_personnel?.first_name || ''} ${row.qc_personnel?.last_name || ''}`.trim() || '-'
    },
    {
      key: 'location',
      header: 'Mahal',
      width: 250,
      render: (row: NoiRequestWithDetails) => row.location || '-'
    },
    {
      key: 'hold_point',
      header: 'Hold Point',
      width: 180,
      render: (row: NoiRequestWithDetails) => row.hold_point?.name || '-'
    },
    {
      key: 'delivery_time',
      header: 'Teslimat Süresi (Dk)',
      width: 140,
      render: (row: NoiRequestWithDetails) => row.delivery_time_minutes || '-'
    },
    {
      key: 'time_loss_minutes',
      header: 'Kayıp Zaman(Dk)',
      width: 140,
      render: (row: NoiRequestWithDetails) => row.time_loss_minutes || '-'
    },
    {
      key: 'time_loss_group',
      header: 'Kayıp Zaman Grup',
      width: 170,
      render: (row: NoiRequestWithDetails) => row.time_loss_group || '-'
    },
    {
      key: 'creator',
      header: 'Oluşturan',
      width: 160,
      render: (row: NoiRequestWithDetails) => row.creator?.full_name || '-'
    },
    {
      key: 'created_at',
      header: 'Oluşturma Tarihi',
      width: 180,
      sortable: true,
      render: (row: NoiRequestWithDetails) => new Date(row.created_at).toLocaleString('tr-TR')
    },
    {
      key: 'actions',
      header: 'İşlemler',
      width: 120,
      render: (row: NoiRequestWithDetails) => {
        if (isAdmin) {
          return (
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => handleEdit(row)}
                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                title="Düzenle"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(row.id)}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                title="Sil"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        }
        return <span className="text-sm text-gray-500">-</span>;
      }
    }
  ];

  if (accessLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Yükleniyor...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!hasAccess && !isAdmin) {
    return <NoAccessPage />;
  }

  // Calculate statistics
  const stats = {
    pending: noiRequests.filter(n => n.status === 'pending_approval').length,
    approved: noiRequests.filter(n => n.status === 'approved').length,
    rejected: noiRequests.filter(
      n => n.status === 'rejected' || n.status === 'cancelled' || n.status === 'Reddedildi-Yeni Talep'
    ).length,
    total: noiRequests.length
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ClipboardList className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">NOI Talepleri</h1>
            </div>
            <div className="flex gap-3">
              {isAdmin && (
                <button
                  onClick={() => setShowSettings(true)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition flex items-center gap-2"
                >
                  <Settings className="w-5 h-5" />
                  NOI Numarası Ayarları
                </button>
              )}
              <button
                onClick={exportToExcel}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                Excel İndir
              </button>
              {hasCreateAccess && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  NOI Talebi Oluştur
                </button>
              )}
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Bekleyen Onay</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.pending}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Onaylanan</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.approved}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Reddedilen</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.rejected}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Toplam NOI</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <ClipboardList className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Benim İşlem Bekleyen NOI'lerim */}
          {pendingNois.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div
                className="p-4 border-b border-gray-200 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                onClick={() => toggleSection('myPending')}
              >
                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-yellow-600" />
                  <h2 className="text-xl font-bold text-gray-900">
                    Benim İşlem Bekleyen NOI'lerim
                  </h2>
                </div>
                {toggleStates.myPending ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
              {toggleStates.myPending && (
                <div className="p-4">
                  <div className="mb-4 space-y-4">
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        placeholder="NOI No, Firma veya Mahal ile ara..."
                        value={pendingSearchTerm}
                        onChange={(e) => setPendingSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Filtreler Butonu */}
                    <button
                      onClick={() => setPendingShowFilters(!pendingShowFilters)}
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                    >
                      <Filter className="w-5 h-5" />
                      <span>Filtreler</span>
                    </button>

                    {/* Filters */}
                    {pendingShowFilters && (
                      <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                        {/* Date Range Filter */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Başlangıç Tarihi</label>
                        <input
                          type="date"
                          value={pendingStartDate}
                          onChange={(e) => setPendingStartDate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Bitiş Tarihi</label>
                        <input
                          type="date"
                          value={pendingEndDate}
                          onChange={(e) => setPendingEndDate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                      {/* Status Filter */}
                      <SearchableFilterGroup
                        label="Durum"
                        options={[
                          { value: 'pending_approval', label: 'Talep Aşaması' },
                          { value: 'approved', label: 'Onaylandı' },
                          { value: 'rejected', label: 'Reddedildi' },
                          { value: 'cancelled', label: 'İptal Edildi' }
                        ]}
                        selectedValues={pendingFilters.status}
                        onChange={(values) => setPendingFilters({ ...pendingFilters, status: values })}
                        maxHeight="200px"
                      />

                      {/* Company Filter */}
                      <SearchableFilterGroup
                        label="Firma"
                        options={Array.from(new Set(pendingNois.filter(n => n.company_id).map(n => n.company_id)))
                          .map(companyId => {
                            const company = pendingNois.find(n => n.company_id === companyId)?.companies;
                            return company ? { value: companyId as string, label: company.name } : null;
                          })
                          .filter((opt): opt is { value: string; label: string } => opt !== null)}
                        selectedValues={pendingFilters.company}
                        onChange={(values) => setPendingFilters({ ...pendingFilters, company: values })}
                        maxHeight="200px"
                      />

                      {/* Manufacturing Unit Filter */}
                      <SearchableFilterGroup
                        label="İmalat Birimi"
                        options={Array.from(new Set(pendingNois.filter(n => n.manufacturing_unit_id).map(n => n.manufacturing_unit_id)))
                          .map(unitId => {
                            const unit = pendingNois.find(n => n.manufacturing_unit_id === unitId)?.manufacturing_unit;
                            return unit ? { value: unitId as string, label: unit.name } : null;
                          })
                          .filter((opt): opt is { value: string; label: string } => opt !== null)}
                        selectedValues={pendingFilters.manufacturingUnit}
                        onChange={(values) => setPendingFilters({ ...pendingFilters, manufacturingUnit: values })}
                        maxHeight="200px"
                      />

                      {/* Const Personnel Filter */}
                      <SearchableFilterGroup
                        label="Şantiye Personeli"
                        options={Array.from(new Set(pendingNois.filter(n => n.const_personnel_id).map(n => n.const_personnel_id)))
                          .map(personnelId => {
                            const personnel = pendingNois.find(n => n.const_personnel_id === personnelId)?.const_personnel;
                            return personnel ? {
                              value: personnelId as string,
                              label: personnel.user_profiles?.full_name || `${personnel.first_name} ${personnel.last_name}`
                            } : null;
                          })
                          .filter((opt): opt is { value: string; label: string } => opt !== null)}
                        selectedValues={pendingFilters.constPersonnel}
                        onChange={(values) => setPendingFilters({ ...pendingFilters, constPersonnel: values })}
                        maxHeight="200px"
                      />

                      {/* QC Personnel Filter */}
                      <SearchableFilterGroup
                        label="QC Personeli"
                        options={Array.from(new Set(pendingNois.filter(n => n.qc_personnel_id).map(n => n.qc_personnel_id)))
                          .map(personnelId => {
                            const personnel = pendingNois.find(n => n.qc_personnel_id === personnelId)?.qc_personnel;
                            return personnel ? {
                              value: personnelId as string,
                              label: personnel.user_profiles?.full_name || `${personnel.first_name} ${personnel.last_name}`
                            } : null;
                          })
                          .filter((opt): opt is { value: string; label: string } => opt !== null)}
                        selectedValues={pendingFilters.qcPersonnel}
                        onChange={(values) => setPendingFilters({ ...pendingFilters, qcPersonnel: values })}
                        maxHeight="200px"
                      />

                      {/* Hold Point Filter */}
                      <SearchableFilterGroup
                        label="Hold Point"
                        options={Array.from(new Set(pendingNois.filter(n => n.hold_point_id).map(n => n.hold_point_id)))
                          .map(holdPointId => {
                            const holdPoint = pendingNois.find(n => n.hold_point_id === holdPointId)?.hold_point;
                            return holdPoint ? { value: holdPointId as string, label: holdPoint.name } : null;
                          })
                          .filter((opt): opt is { value: string; label: string } => opt !== null)}
                        selectedValues={pendingFilters.holdPoint}
                        onChange={(values) => setPendingFilters({ ...pendingFilters, holdPoint: values })}
                        maxHeight="200px"
                      />
                    </div>

                    {/* Active Filters Display */}
                    {(pendingFilters.status.length > 0 || pendingFilters.company.length > 0 || pendingFilters.manufacturingUnit.length > 0 || pendingFilters.constPersonnel.length > 0 || pendingFilters.qcPersonnel.length > 0 || pendingFilters.holdPoint.length > 0 || pendingStartDate || pendingEndDate) && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-gray-600">Aktif Filtreler:</span>
                        {pendingFilters.status.length > 0 && (
                          <button
                            onClick={() => setPendingFilters({ ...pendingFilters, status: [] })}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-1 hover:bg-blue-200 transition"
                          >
                            Durum ({pendingFilters.status.length})
                            <X className="w-3 h-3" />
                          </button>
                        )}
                        {pendingFilters.company.length > 0 && (
                          <button
                            onClick={() => setPendingFilters({ ...pendingFilters, company: [] })}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-1 hover:bg-blue-200 transition"
                          >
                            Firma ({pendingFilters.company.length})
                            <X className="w-3 h-3" />
                          </button>
                        )}
                        {pendingFilters.constPersonnel.length > 0 && (
                          <button
                            onClick={() => setPendingFilters({ ...pendingFilters, constPersonnel: [] })}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-1 hover:bg-blue-200 transition"
                          >
                            Const Personel ({pendingFilters.constPersonnel.length})
                            <X className="w-3 h-3" />
                          </button>
                        )}
                        {pendingFilters.qcPersonnel.length > 0 && (
                          <button
                            onClick={() => setPendingFilters({ ...pendingFilters, qcPersonnel: [] })}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-1 hover:bg-blue-200 transition"
                          >
                            QC Personel ({pendingFilters.qcPersonnel.length})
                            <X className="w-3 h-3" />
                          </button>
                        )}
                        {pendingFilters.holdPoint.length > 0 && (
                          <button
                            onClick={() => setPendingFilters({ ...pendingFilters, holdPoint: [] })}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-1 hover:bg-blue-200 transition"
                          >
                            Hold Point ({pendingFilters.holdPoint.length})
                            <X className="w-3 h-3" />
                          </button>
                        )}
                        {pendingStartDate && (
                          <button
                            onClick={() => setPendingStartDate('')}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-1 hover:bg-blue-200 transition"
                          >
                            Başlangıç: {pendingStartDate}
                            <X className="w-3 h-3" />
                          </button>
                        )}
                        {pendingEndDate && (
                          <button
                            onClick={() => setPendingEndDate('')}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-1 hover:bg-blue-200 transition"
                          >
                            Bitiş: {pendingEndDate}
                            <X className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setPendingFilters({
                              status: [],
                              company: [],
                              constPersonnel: [],
                              qcPersonnel: [],
                              holdPoint: []
                            });
                            setPendingStartDate('');
                            setPendingEndDate('');
                          }}
                          className="px-3 py-1 text-red-600 text-sm hover:underline"
                        >
                          Tümünü Temizle
                        </button>
                      </div>
                    )}
                    </div>
                  )}
                  </div>

                  <ResizableTable
                    columns={pendingColumns}
                    data={sortedPendingNois}
                    storageKey="noi-pending-columns"
                    onSort={handleSort}
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                  />
                </div>
              )}
            </div>
          )}

          {/* Tüm NOI'ler */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div
              className="p-4 border-b border-gray-200 flex items-center justify-between cursor-pointer hover:bg-gray-50"
              onClick={() => toggleSection('allNois')}
            >
              <div className="flex items-center space-x-3">
                <ClipboardList className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">
                  Tüm NOI'ler ({noiRequests.length})
                </h2>
              </div>
              {toggleStates.allNois ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
            {toggleStates.allNois && (
              <div className="p-4">
                {/* Grouping and Filter Buttons */}
                <div className="mb-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => setGroupBy(groupBy === 'company' ? 'none' : 'company')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                      groupBy === 'company'
                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span>Firma Bazlı</span>
                  </button>
                  <button
                    onClick={() => setGroupBy(groupBy === 'const_personnel' ? 'none' : 'const_personnel')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                      groupBy === 'const_personnel'
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span>Şantiye Personeli Bazlı</span>
                  </button>
                  <button
                    onClick={() => setGroupBy(groupBy === 'qc_personnel' ? 'none' : 'qc_personnel')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                      groupBy === 'qc_personnel'
                        ? 'bg-teal-600 text-white hover:bg-teal-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span>QC Personeli Bazlı</span>
                  </button>
                  <div className="h-8 w-px bg-gray-300"></div>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                  >
                    <Filter className="w-5 h-5" />
                    <span>Filtreler</span>
                  </button>
                </div>

                {/* Filter Panel */}
                {showFilters && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-700">Filtreler</h3>
                      <button
                        onClick={() => {
                          setFilters({
                            status: [],
                            company: [],
                            constPersonnel: [],
                            qcPersonnel: [],
                            holdPoint: [],
                            manufacturingUnit: [],
                            startDate: '',
                            endDate: ''
                          });
                          setGroupBy('none');
                        }}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        Filtreleri Temizle
                      </button>
                    </div>
                    {/* Date Range Filter */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">Başlangıç Tarihi</label>
                        <input
                          type="date"
                          value={filters.startDate}
                          onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">Bitiş Tarihi</label>
                        <input
                          type="date"
                          value={filters.endDate}
                          onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                      {/* Status Filter */}
                      <SearchableFilterGroup
                        label="Durum"
                        options={[
                          { value: 'pending_approval', label: 'Talep Aşaması' },
                          { value: 'approved', label: 'Onaylandı' },
                          { value: 'rejected', label: 'Reddedildi' },
                          { value: 'Reddedildi-Yeni Talep', label: 'Reddedildi-Yeni Talep' },
                          { value: 'cancelled', label: 'İptal Edildi' }
                        ]}
                        selectedValues={filters.status}
                        onChange={(values) => setFilters({ ...filters, status: values })}
                        maxHeight="200px"
                      />

                      {/* Company Filter */}
                      <SearchableFilterGroup
                        label="Firma"
                        options={Array.from(new Set(noiRequests.filter(n => n.company_id).map(n => n.company_id)))
                          .map(companyId => {
                            const company = noiRequests.find(n => n.company_id === companyId)?.companies;
                            return company ? { value: companyId as string, label: company.name } : null;
                          })
                          .filter((item): item is { value: string; label: string } => item !== null)
                        }
                        selectedValues={filters.company}
                        onChange={(values) => setFilters({ ...filters, company: values })}
                        maxHeight="200px"
                      />

                      {/* Manufacturing Unit Filter */}
                      <SearchableFilterGroup
                        label="İmalat Birimi"
                        options={Array.from(new Set(noiRequests.filter(n => n.manufacturing_unit_id).map(n => n.manufacturing_unit_id)))
                          .map(unitId => {
                            const unit = noiRequests.find(n => n.manufacturing_unit_id === unitId)?.manufacturing_unit;
                            return unit ? { value: unitId as string, label: unit.name } : null;
                          })
                          .filter((item): item is { value: string; label: string } => item !== null)
                        }
                        selectedValues={filters.manufacturingUnit}
                        onChange={(values) => setFilters({ ...filters, manufacturingUnit: values })}
                        maxHeight="200px"
                      />

                      {/* Const Personnel Filter */}
                      <SearchableFilterGroup
                        label="Şantiye Personeli"
                        options={Array.from(new Set(noiRequests.filter(n => n.const_personnel_id).map(n => n.const_personnel_id)))
                          .map(personnelId => {
                            const personnel = noiRequests.find(n => n.const_personnel_id === personnelId)?.const_personnel;
                            return personnel ? {
                              value: personnelId as string,
                              label: personnel.user_profiles?.full_name || `${personnel.first_name} ${personnel.last_name}`
                            } : null;
                          })
                          .filter((item): item is { value: string; label: string } => item !== null)
                        }
                        selectedValues={filters.constPersonnel}
                        onChange={(values) => setFilters({ ...filters, constPersonnel: values })}
                        maxHeight="200px"
                      />

                      {/* QC Personnel Filter */}
                      <SearchableFilterGroup
                        label="QC Personeli"
                        options={Array.from(new Set(noiRequests.filter(n => n.qc_personnel_id).map(n => n.qc_personnel_id)))
                          .map(personnelId => {
                            const personnel = noiRequests.find(n => n.qc_personnel_id === personnelId)?.qc_personnel;
                            return personnel ? {
                              value: personnelId as string,
                              label: personnel.user_profiles?.full_name || `${personnel.first_name} ${personnel.last_name}`
                            } : null;
                          })
                          .filter((item): item is { value: string; label: string } => item !== null)
                        }
                        selectedValues={filters.qcPersonnel}
                        onChange={(values) => setFilters({ ...filters, qcPersonnel: values })}
                        maxHeight="200px"
                      />

                      {/* Hold Point Filter */}
                      <SearchableFilterGroup
                        label="Hold Point"
                        options={Array.from(new Set(noiRequests.filter(n => n.hold_point_id).map(n => n.hold_point_id)))
                          .map(holdPointId => {
                            const holdPoint = noiRequests.find(n => n.hold_point_id === holdPointId)?.hold_point;
                            return holdPoint ? { value: holdPointId as string, label: holdPoint.name } : null;
                          })
                          .filter((item): item is { value: string; label: string } => item !== null)
                        }
                        selectedValues={filters.holdPoint}
                        onChange={(values) => setFilters({ ...filters, holdPoint: values })}
                        maxHeight="200px"
                      />
                    </div>
                  </div>
                )}

                {/* Search */}
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="NOI No, Firma, Mahal veya Durum ile ara..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Grouped or Normal Table View */}
                {groupedNois ? (
                  <div className="space-y-6">
                    {Object.entries(groupedNois).sort(([a], [b]) => a.localeCompare(b, 'tr')).map(([groupName, groupNois]) => {
                      const colors = groupBy === 'company' ? 'purple' : groupBy === 'const_personnel' ? 'indigo' : 'teal';
                      return (
                        <div key={groupName} className="border border-gray-200 rounded-lg overflow-hidden">
                          <div
                            className={`px-4 py-3 cursor-pointer flex items-center justify-between bg-${colors}-50 border-b border-${colors}-200`}
                            onClick={() => setGroupToggles(prev => ({ ...prev, [groupName]: !prev[groupName] }))}
                          >
                            <h3 className={`text-lg font-semibold text-${colors}-900`}>
                              {groupName} <span className="text-sm font-normal opacity-75">({groupNois.length} NOI)</span>
                            </h3>
                            {groupToggles[groupName] === false ? (
                              <ChevronDown className="w-5 h-5" />
                            ) : (
                              <ChevronUp className="w-5 h-5" />
                            )}
                          </div>
                          {groupToggles[groupName] !== false && (
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">NOI No</th>
                                  <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Durum</th>
                                  <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Tarih</th>
                                  <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Firma</th>
                                  <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Const Personel</th>
                                  <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">QC Personel</th>
                                  <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Mahal</th>
                                </tr>
                              </thead>
                              <tbody>
                                {groupNois.map(noi => (
                                  <tr key={noi.id} className="border-t border-gray-100 hover:bg-gray-50">
                                    <td className="py-3 px-4 font-mono font-semibold text-gray-900 text-sm">{noi.noi_number}</td>
                                    <td className="py-3 px-4">
                                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getNoiStatusColor(noi.status)}`}>
                                        {getNoiStatusDisplay(noi.status)}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-gray-700 text-sm">{noi.date}</td>
                                    <td className="py-3 px-4 text-gray-700 text-sm">{noi.companies?.name || '-'}</td>
                                    <td className="py-3 px-4 text-gray-700 text-sm">
                                      {noi.const_personnel?.user_profiles?.full_name ||
                                       `${noi.const_personnel?.first_name || ''} ${noi.const_personnel?.last_name || ''}`.trim() || '-'}
                                    </td>
                                    <td className="py-3 px-4 text-gray-700 text-sm">
                                      {noi.qc_personnel?.user_profiles?.full_name ||
                                       `${noi.qc_personnel?.first_name || ''} ${noi.qc_personnel?.last_name || ''}`.trim() || '-'}
                                    </td>
                                    <td className="py-3 px-4 text-gray-700 text-sm">{noi.location || '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <ResizableTable
                    columns={allNoisColumns}
                    data={sortedNois}
                    storageKey="noi-all-columns"
                    onSort={handleSort}
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">NOI Numarası Ayarları</h2>
              <p className="text-sm text-gray-600 mb-6">
                Bu proje için NOI numaralandırma sistemini buradan ayarlayabilirsiniz. Her proje kendi numaralandırma sistemine sahiptir.
              </p>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Numara Prefix (Ön Ek)
                  </label>
                  <input
                    type="text"
                    value={newPrefix}
                    onChange={(e) => setNewPrefix(e.target.value.toUpperCase())}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Örn: NOI, RKG-MPK-NOI"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mevcut Numara
                  </label>
                  <input
                    type="number"
                    value={newCurrentNumber}
                    onChange={(e) => setNewCurrentNumber(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Sonraki NOI: {newPrefix}-{String((newCurrentNumber || 0) + 1).padStart(3, '0')}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={updateSettings}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  Kaydet
                </button>
                <button
                  onClick={() => {
                    setShowSettings(false);
                    setNewPrefix(settings?.number_prefix || 'NOI');
                    setNewCurrentNumber(settings?.current_number || 0);
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition"
                >
                  İptal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Postpone Modal */}
        {postponeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">NOI Talebini Ertele</h2>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Erteleme Tarihi
                </label>
                <input
                  type="date"
                  value={postponeModal.date}
                  onChange={(e) => setPostponeModal({ ...postponeModal, date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handlePostpone}
                  className="flex-1 bg-yellow-600 text-white py-3 rounded-lg font-medium hover:bg-yellow-700 transition"
                >
                  Ertele
                </button>
                <button
                  onClick={() => setPostponeModal(null)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition"
                >
                  İptal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <NoiCreateModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={fetchData}
          />
        )}

        {/* Resubmit Modal */}
        {resubmitNoi && (
          <NoiCreateModal
            onClose={() => setResubmitNoi(null)}
            onSuccess={fetchData}
            initialData={resubmitNoi}
            isResubmit={true}
          />
        )}

        {/* Edit Modal */}
        {editingNoi && (
          <NoiEditModal
            noi={editingNoi}
            onClose={() => setEditingNoi(null)}
            onSuccess={fetchData}
          />
        )}
      </Layout>
    </ProtectedRoute>
  );
}
