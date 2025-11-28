import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { useAuth } from '../contexts/AuthContext';
import { useProject } from '../contexts/ProjectContext';
import { supabase } from '../lib/supabase';
import { ResizableTable, ColumnDefinition } from '../components/ResizableTable';
import { ImageLightbox } from '../components/ImageLightbox';
import {
  ClipboardList, Plus, Download, Search, Edit2, Trash2, FileText,
  AlertCircle, CheckCircle2, Clock, XCircle, ArrowUpDown, ChevronLeft, ChevronRight,
  ChevronDown, ChevronUp, Filter, Printer
} from 'lucide-react';
import NoAccessPage from './NoAccessPage';
import { FieldObservationFormPage } from './FieldObservationFormPage';
import { generateAndDownloadPDF } from '../lib/carboneService';

interface FieldObservationReport {
  id: string;
  project_id: string;
  report_number: string;
  status: string;
  company_id: string;
  responsible_person_1_id: string;
  responsible_person_2_id: string;
  building_id: string;
  block_id: string;
  floor_id: string;
  manufacturing_unit_id: string;
  activity_id: string;
  location_description: string;
  observation_description: string;
  severity: string;
  reference_document: string;
  photos: string[];
  root_cause: string;
  suggested_action: string;
  corrective_action_required: boolean;
  planned_close_date: string;
  closing_action: string;
  closing_photos: string[];
  rejection_reason: string;
  created_by: string;
  created_at: string;
  data_entry_date: string;
  closing_date: string;
  approved_date: string;
  updated_at: string;
  companies?: { name: string };
  responsible_person_1?: { first_name: string; last_name: string; user_profiles?: { full_name: string } };
  responsible_person_2?: { first_name: string; last_name: string; user_profiles?: { full_name: string } };
  project_buildings?: { name: string };
  project_blocks?: { name: string };
  project_floors?: { name: string };
  project_manufacturing_units?: { name: string };
  project_activities?: { name: string };
  creator?: { full_name: string };
}

interface FieldObservationSettings {
  id: string;
  project_id: string;
  number_prefix: string;
  current_number: number;
}

export function FieldObservationPage() {
  const { userProfile } = useAuth();
  const { currentProject, isProjectOwner } = useProject();
  const [reports, setReports] = useState<FieldObservationReport[]>([]);
  const [pendingReports, setPendingReports] = useState<FieldObservationReport[]>([]);
  const [settings, setSettings] = useState<FieldObservationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [canCreate, setCanCreate] = useState(false);
  const [isApprover, setIsApprover] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [newPrefix, setNewPrefix] = useState('FOR');
  const [newCurrentNumber, setNewCurrentNumber] = useState(0);
  const [viewingReportId, setViewingReportId] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    status: [] as string[],
    company: [] as string[],
    responsible: [] as string[],
    manufacturingUnit: [] as string[],
    creator: [] as string[],
    startDate: '',
    endDate: ''
  });

  const [groupBy, setGroupBy] = useState<'none' | 'company' | 'responsible'>('none');
  const [groupToggles, setGroupToggles] = useState<{[key: string]: boolean}>({});
  const [showFilters, setShowFilters] = useState(false);

  const [toggleStates, setToggleStates] = useState(() => {
    const saved = localStorage.getItem('field-observation-toggles');
    return saved ? JSON.parse(saved) : {
      myPending: true,
      allReports: true
    };
  });

  const [lightbox, setLightbox] = useState<{ images: string[]; currentIndex: number } | null>(null);

  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super_admin';

  useEffect(() => {
    localStorage.setItem('field-observation-toggles', JSON.stringify(toggleStates));
  }, [toggleStates]);

  const toggleSection = (section: keyof typeof toggleStates) => {
    setToggleStates(prev => ({ ...prev, [section]: !prev[section] }));
  };

  useEffect(() => {
    checkAccessAndFetchData();
  }, [userProfile, currentProject]);

  const checkAccessAndFetchData = async () => {
    if (!userProfile || !currentProject) {
      setLoading(false);
      return;
    }

    let personnelData = null;

    if (isProjectOwner || isAdmin) {
      setHasAccess(true);
      setCanCreate(true);
      setIsApprover(true);
    } else {
      const { data } = await supabase
        .from('personnel')
        .select('id, field_observation_access, field_observation_creator, field_observation_approver')
        .eq('user_id', userProfile.id)
        .eq('project_id', currentProject.id)
        .maybeSingle();

      personnelData = data;

      if (personnelData) {
        setHasAccess(personnelData.field_observation_access === true);
        setCanCreate(personnelData.field_observation_creator === true);
        setIsApprover(personnelData.field_observation_approver === true);
      } else {
        setHasAccess(false);
        setCanCreate(false);
        setIsApprover(false);
      }
    }

    await fetchSettings();
    await fetchReports(personnelData);
    setLoading(false);
  };

  const fetchSettings = async () => {
    if (!currentProject) return;

    const { data, error } = await supabase
      .from('field_observation_settings')
      .select('*')
      .eq('project_id', currentProject.id)
      .maybeSingle();

    if (data) {
      setSettings(data);
      setNewPrefix(data.number_prefix);
      setNewCurrentNumber(data.current_number);
    } else if (!error) {
      const { data: newSettings } = await supabase
        .from('field_observation_settings')
        .insert({
          project_id: currentProject.id,
          number_prefix: 'FOR',
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

  const fetchReports = async (personnelData?: any) => {
    if (!currentProject) return;

    const { data, error } = await supabase
      .from('field_observation_reports')
      .select(`
        *,
        companies(name),
        responsible_person_1:personnel!responsible_person_1_id(first_name, last_name, user_profiles(full_name)),
        responsible_person_2:personnel!responsible_person_2_id(first_name, last_name, user_profiles(full_name)),
        project_buildings(name),
        project_blocks(name),
        project_floors(name),
        project_manufacturing_units(name),
        project_activities(name),
        creator:user_profiles!created_by(full_name)
      `)
      .eq('project_id', currentProject.id)
      .order('created_at', { ascending: false });

    if (data) {
      setReports(data as any);
      filterPendingReports(data as any, personnelData);
    }
  };

  const filterPendingReports = async (allReports: FieldObservationReport[], cachedPersonnelData?: any) => {
    if (!userProfile || !currentProject) return;

    // Check if user is admin or project owner
    const userIsAdmin = isAdmin;
    const userIsProjectOwner = isProjectOwner;

    let personnelData = cachedPersonnelData;
    if (!personnelData) {
      const { data } = await supabase
        .from('personnel')
        .select('id, field_observation_approver, field_observation_access')
        .eq('user_id', userProfile.id)
        .eq('project_id', currentProject.id)
        .maybeSingle();
      personnelData = data;
    }

    const personnelId = personnelData?.id;
    const userIsApprover = personnelData?.field_observation_approver === true;
    const userHasAccess = personnelData?.field_observation_access === true;

    const pending = allReports.filter(report => {
      // Aşama 2: Ön onay bekleyen formlar - Admin, project owner ve approver'lar görsün
      if (report.status === 'pre_approval' && (userIsApprover || userIsAdmin || userIsProjectOwner)) {
        return true;
      }

      // Aşama 3: Veri girişi bekleyen formlar - Sorumlu personel (with access), admin'ler ve project owner'lar görsün
      if (report.status === 'waiting_data_entry') {
        if (userIsAdmin || userIsProjectOwner) return true;
        if (personnelId && (report.responsible_person_1_id === personnelId || report.responsible_person_2_id === personnelId)) {
          if (userHasAccess) return true;
        }
      }

      // Aşama 4: Açık formlar - Sorumlu personel (with access), admin'ler ve project owner'lar kapama yapacak
      if (report.status === 'open') {
        if (userIsAdmin || userIsProjectOwner) return true;
        if (personnelId && (report.responsible_person_1_id === personnelId || report.responsible_person_2_id === personnelId)) {
          if (userHasAccess) return true;
        }
      }

      // Aşama 5: Kapama onayı bekleyen formlar - Form oluşturan, approver, admin veya project owner onaylayacak
      if (report.status === 'waiting_close_approval' && (report.created_by === userProfile.id || userIsApprover || userIsAdmin || userIsProjectOwner)) {
        return true;
      }

      return false;
    });

    setPendingReports(pending);
  };

  const updateSettings = async () => {
    if (!currentProject) {
      alert('Proje bilgisi bulunamadı. Lütfen sayfayı yenileyin.');
      return;
    }

    if (!newPrefix.trim()) {
      alert('Numara prefix boş olamaz');
      return;
    }

    try {
      const currentNumberValue = parseInt(String(newCurrentNumber)) || 0;

      if (currentNumberValue < 0) {
        alert('Mevcut numara negatif olamaz');
        return;
      }

      // If settings exist, update them
      if (settings?.id) {
        console.log('Attempting update with:', {
          settingsId: settings.id,
          projectId: settings.project_id,
          newPrefix: newPrefix.trim().toUpperCase(),
          newNumber: currentNumberValue
        });

        const { data, error } = await supabase
          .from('field_observation_settings')
          .update({
            number_prefix: newPrefix.trim().toUpperCase(),
            current_number: currentNumberValue
          })
          .eq('id', settings.id)
          .select()
          .single();

        if (error) {
          console.error('Update error:', error);
          throw error;
        }

        if (data) {
          await fetchSettings();
          await fetchReports();
          setShowSettings(false);
          alert(`Form numarası ayarları başarıyla güncellendi!\n\nYeni prefix: ${data.number_prefix}\nMevcut numara: ${data.current_number}\n\nYeni oluşturulacak form: ${data.number_prefix}-${String(data.current_number + 1).padStart(3, '0')}`);
        }
      } else {
        // If settings don't exist, create them
        const { data, error } = await supabase
          .from('field_observation_settings')
          .insert({
            project_id: currentProject.id,
            number_prefix: newPrefix.trim().toUpperCase(),
            current_number: currentNumberValue
          })
          .select()
          .single();

        if (error) {
          console.error('Insert error:', error);
          throw error;
        }

        if (data) {
          await fetchSettings();
          await fetchReports();
          setShowSettings(false);
          alert(`Form numarası ayarları başarıyla oluşturuldu!\n\nYeni prefix: ${data.number_prefix}\nMevcut numara: ${data.current_number}\n\nYeni oluşturulacak form: ${data.number_prefix}-${String(data.current_number + 1).padStart(3, '0')}`);
        }
      }
    } catch (error: any) {
      console.error('Settings update error:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });

      if (error.code === '42501') {
        // Debug: Check user's role
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('role, email')
          .eq('id', (await supabase.auth.getUser()).data.user?.id)
          .single();

        // Debug: Check project membership
        const { data: projectMembership } = await supabase
          .from('project_users')
          .select('*')
          .eq('project_id', currentProject.id)
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .maybeSingle();

        console.log('Debug info:', {
          userProfile,
          projectMembership,
          settingsId: settings?.id,
          projectId: currentProject.id
        });

        alert(`Bu işlem için yetkiniz yok.\n\nDebug bilgisi:\nRole: ${userProfile?.role}\nProje üyesi: ${projectMembership ? 'Evet' : 'Hayır'}\nEmail: ${userProfile?.email}\n\nKonsolu kontrol edin.`);
      } else if (error.code === '23505') {
        alert('Bu proje için zaten ayarlar mevcut.');
      } else {
        alert('Ayarlar güncellenirken hata oluştu:\n' + (error.message || 'Bilinmeyen hata'));
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: { label: string; color: string; icon: any } } = {
      pre_approval: { label: 'Ön Onay Bekliyor', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      waiting_data_entry: { label: 'Veri Girişi Bekleniyor', color: 'bg-blue-100 text-blue-800', icon: Clock },
      open: { label: 'Açık', color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
      waiting_close_approval: { label: 'Kapama Onayı Bekleniyor', color: 'bg-purple-100 text-purple-800', icon: Clock },
      closed_on_time: { label: 'Kapalı - Zamanında', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2 },
      closed_late: { label: 'Kapalı - Geç', color: 'bg-red-100 text-red-800', icon: XCircle }
    };

    const badge = badges[status] || { label: status, color: 'bg-gray-100 text-gray-800', icon: AlertCircle };
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3.5 h-3.5" />
        <span>{badge.label}</span>
      </span>
    );
  };
  const getStatusText = (status: string): string => {
  const statusMap: { [key: string]: string } = {
    'pre_approval': 'Ön Onay Bekliyor',
    'waiting_data_entry': 'Veri Girişi Bekleniyor',
    'open': 'Açık',
    'waiting_close_approval': 'Kapama Onayı Bekleniyor',
    'closed_on_time': 'Kapalı - Zamanında',
    'closed_late': 'Kapalı - Geç'
  };
  return statusMap[status] || status;
};

  const exportToExcel = () => {
  const data = filteredReports.map(report => ({
    'Form Numarası': report.report_number,
    'Durum': getStatusText(report.status), // Burayı değiştirdik
    'Oluşturan': report.creator?.full_name || '-',
    'Firma': report.companies?.name || '-',
    'Sorumlu 1': report.responsible_person_1?.user_profiles?.full_name ||
                 `${report.responsible_person_1?.first_name} ${report.responsible_person_1?.last_name}`,
    'Sorumlu 2': report.responsible_person_2?.user_profiles?.full_name ||
                 (report.responsible_person_2 ? `${report.responsible_person_2?.first_name} ${report.responsible_person_2?.last_name}` : '-'),
    'Bina': report.project_buildings?.name || '-',
    'Blok': report.project_blocks?.name || '-',
    'Kat': report.project_floors?.name || '-',
    'İmalat Birimi': report.project_manufacturing_units?.name || '-',
    'Aktivite': report.project_activities?.name || '-',
    'Lokasyon Açıklaması': report.location_description || '-',
    'Uygunsuzluk Açıklaması': report.observation_description || '-',
    'Majör/Minör': report.severity === 'major' ? 'Majör' : 'Minör',
    'Referans Döküman': report.reference_document || '-',
    'Fotoğraflar': report.photos?.join(', ') || '-',
    'Kök Sebep': report.root_cause || '-',
    'Önerilen Faaliyet': report.suggested_action || '-',
    'Düzeltici Faaliyet Gerekli': report.corrective_action_required ? 'Evet' : 'Hayır',
    'Planlanan Kapama Tarihi': report.planned_close_date ? new Date(report.planned_close_date).toLocaleDateString('tr-TR') : '-',
    'Kapama Tarihi': report.closing_date ? new Date(report.closing_date).toLocaleDateString('tr-TR') : '-',
    'Alınan Aksiyon': report.closing_action || '-',
    'Kapama Fotoğrafları': report.closing_photos?.join(', ') || '-',
    'Oluşturulma Tarihi': new Date(report.created_at).toLocaleDateString('tr-TR')
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
    link.setAttribute('download', `saha-gozlem-raporlari-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const deleteReport = async (reportId: string) => {
    if (!confirm('Bu raporu silmek istediğinizden emin misiniz?')) return;

    const { error } = await supabase
      .from('field_observation_reports')
      .delete()
      .eq('id', reportId);

    if (!error) {
      await fetchReports();
      alert('Rapor başarıyla silindi');
    } else {
      alert('Rapor silinirken hata oluştu');
    }
  };

  const handlePrintReport = async (report: FieldObservationReport) => {
    try {
      // Carbone Template ID - .env dosyasından al
      const templateId = import.meta.env.VITE_CARBONE_TEMPLATE_FIELD_OBSERVATION;

      if (!templateId) {
        throw new Error('Saha Gözlem raporu template ID bulunamadı. .env dosyasını kontrol edin.');
      }

      // Uygunsuzluk açma fotoğraflarını seri olarak hazırla
      const fotograflar = (report.photos || []).map((foto, index) => ({
        sira: `sira${index + 1}`,
        foto: foto
      }));

      // Düzeltici işlem (kapama) fotoğraflarını seri olarak hazırla
      const fotograflarkapama = (report.closing_photos || []).map((foto, index) => ({
        sira: `sira${index + 1}`,
        foto: foto
      }));

      // Rapor verisini hazırla - Tüm alanları içerir
      const reportData = {
        formNumarasi: report.report_number,
        olusturulmatarihi: new Date(report.created_at).toLocaleDateString('tr-TR'),
        İmalatbirim: report.project_manufacturing_units?.name || '-',
        aktivite: report.project_activities?.name || '-',
        bina: report.project_buildings?.name || '-',
        blok: report.project_blocks?.name || '-',
        kat: report.project_floors?.name || '-',
        lokasyonekaçıklama: report.location_description || '-',
        referansdöküman: report.reference_document || '-',
        sorumluPersonel1: report.responsible_person_1?.user_profiles?.full_name ||
                          `${report.responsible_person_1?.first_name || ''} ${report.responsible_person_1?.last_name || ''}`.trim() || '-',
        sorumluPersonel2: report.responsible_person_2?.user_profiles?.full_name ||
                          `${report.responsible_person_2?.first_name || ''} ${report.responsible_person_2?.last_name || ''}`.trim() || '-',
        sorumluFirma: report.companies?.name || '-',
        majörMinör: report.severity === 'major' ? 'Majör' : 'Minör',
        raporOlusturan: report.creator?.full_name || '-',
        uygunsuzlukAcıklaması: report.observation_description || '-',
        kökSebep: report.root_cause || '-',
        önerilenFaaliyet: report.suggested_action || '-',
        planlanankapamatarihi: report.planned_close_date ? new Date(report.planned_close_date).toLocaleDateString('tr-TR') : '-',
        düzelticiFaliyetGereklimi: report.corrective_action_required ? 'Evet' : 'Hayır',
        alınanAksiyon: report.closing_action || '-',
        gerçekleşenKapama: report.closing_date ? new Date(report.closing_date).toLocaleDateString('tr-TR') : '-',
        fotograflar: fotograflar,
        fotograflarkapama: fotograflarkapama
      };

      // PDF oluştur ve indir
      await generateAndDownloadPDF(
        templateId,
        reportData,
        `saha-gozlem-${report.report_number}.pdf`
      );

      alert('PDF başarıyla oluşturuldu ve indirildi!');
    } catch (error) {
      console.error('Print error:', error);
      alert('PDF oluşturulurken hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

const filteredReports = reports.filter(report => {
  const searchLower = searchTerm.toLowerCase();

  const responsibleNames = [
    report.responsible_person_1?.user_profiles?.full_name,
    report.responsible_person_1 ? `${report.responsible_person_1.first_name} ${report.responsible_person_1.last_name}` : null,
    report.responsible_person_2?.user_profiles?.full_name,
    report.responsible_person_2 ? `${report.responsible_person_2.first_name} ${report.responsible_person_2.last_name}` : null
  ].filter(Boolean).map(name => name!.toLowerCase());

  const matchesSearch = (
    report.report_number?.toLowerCase().includes(searchLower) ||
    report.companies?.name?.toLowerCase().includes(searchLower) ||
    report.location_description?.toLowerCase().includes(searchLower) ||
    report.root_cause?.toLowerCase().includes(searchLower) ||
    report.suggested_action?.toLowerCase().includes(searchLower) ||
    report.closing_action?.toLowerCase().includes(searchLower) ||
    report.project_buildings?.name?.toLowerCase().includes(searchLower) ||
    report.project_blocks?.name?.toLowerCase().includes(searchLower) ||
    report.project_floors?.name?.toLowerCase().includes(searchLower) ||
    report.project_manufacturing_units?.name?.toLowerCase().includes(searchLower) ||
    report.project_activities?.name?.toLowerCase().includes(searchLower) ||
    report.reference_document?.toLowerCase().includes(searchLower) ||
    responsibleNames.some(name => name.includes(searchLower)) // burası tüm sorumluları kontrol ediyor
  );

  const matchesStatus = filters.status.length === 0 || filters.status.includes(report.status);
  const matchesCompany = filters.company.length === 0 || filters.company.includes(report.company_id || '');
  const matchesResponsible = filters.responsible.length === 0 ||
    filters.responsible.includes(report.responsible_person_1_id || '') ||
    filters.responsible.includes(report.responsible_person_2_id || '');
  const matchesManufacturingUnit = filters.manufacturingUnit.length === 0 || filters.manufacturingUnit.includes(report.manufacturing_unit_id || '');
  const matchesCreator = filters.creator.length === 0 || filters.creator.includes(report.created_by || '');

  // Date range filter
  const reportDate = new Date(report.data_entry_date || report.created_at);
  const matchesStartDate = !filters.startDate || reportDate >= new Date(filters.startDate);
  const matchesEndDate = !filters.endDate || reportDate <= new Date(filters.endDate);

  return matchesSearch && matchesStatus && matchesCompany && matchesResponsible && matchesManufacturingUnit && matchesCreator && matchesStartDate && matchesEndDate;
});

  const sortedReports = [...filteredReports].sort((a, b) => {
    let aValue: any = a[sortColumn as keyof FieldObservationReport];
    let bValue: any = b[sortColumn as keyof FieldObservationReport];

    if (sortColumn === 'companies.name') {
      aValue = a.companies?.name || '';
      bValue = b.companies?.name || '';
    } else if (sortColumn === 'responsible') {
      aValue = a.responsible_person_1?.user_profiles?.full_name ||
               `${a.responsible_person_1?.first_name} ${a.responsible_person_1?.last_name}`;
      bValue = b.responsible_person_1?.user_profiles?.full_name ||
               `${b.responsible_person_1?.first_name} ${b.responsible_person_1?.last_name}`;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Gruplama mantığı
  const getGroupedReports = () => {
    if (groupBy === 'none') return null;

    const groups: { [key: string]: FieldObservationReport[] } = {};

    sortedReports.forEach(report => {
      if (groupBy === 'company') {
        const groupKey = report.companies?.name || 'Firma Atanmamış';
        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        groups[groupKey].push(report);
      } else if (groupBy === 'responsible') {
        // Sorumlu 1'i ekle
        const resp1 = report.responsible_person_1?.user_profiles?.full_name ||
                     (report.responsible_person_1 ? `${report.responsible_person_1.first_name} ${report.responsible_person_1.last_name}` : null);
        if (resp1) {
          if (!groups[resp1]) {
            groups[resp1] = [];
          }
          groups[resp1].push(report);
        }

        // Sorumlu 2'yi ekle (varsa)
        const resp2 = report.responsible_person_2?.user_profiles?.full_name ||
                     (report.responsible_person_2 ? `${report.responsible_person_2.first_name} ${report.responsible_person_2.last_name}` : null);
        if (resp2) {
          if (!groups[resp2]) {
            groups[resp2] = [];
          }
          groups[resp2].push(report);
        }

        // Hiç sorumlu yoksa
        if (!resp1 && !resp2) {
          if (!groups['Sorumlu Atanmamış']) {
            groups['Sorumlu Atanmamış'] = [];
          }
          groups['Sorumlu Atanmamış'].push(report);
        }
      }
    });

    return groups;
  };

  const groupedReports = getGroupedReports();

  const totalPages = Math.ceil(sortedReports.length / ITEMS_PER_PAGE);
  const paginatedReports = sortedReports.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openReportsCount = reports.filter(r => r.status === 'open').length;
  const closedOnTimeCount = reports.filter(r => r.status === 'closed_on_time').length;
  const closedLateCount = reports.filter(r => r.status === 'closed_late').length;

  if (loading) {
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

  if (hasAccess === false) {
    return <NoAccessPage />;
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="max-w-[2400px] mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ClipboardList className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Saha Gözlem Raporu</h1>
                <p className="text-gray-600 mt-1">Proje: {currentProject?.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {(isAdmin || isProjectOwner) && (
                <button
                  onClick={() => setShowSettings(true)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                >
                  Form Numarası Ayarları
                </button>
              )}
              {canCreate && (
                <a
                  href="/field-observation/new"
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <Plus className="w-5 h-5" />
                  <span>Rapor Oluştur</span>
                </a>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Açık Raporlar</span>
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{openReportsCount}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Kapalı - Zamanında</span>
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{closedOnTimeCount}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Kapalı - Geç</span>
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{closedLateCount}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Bekleyen İşlemler</span>
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{pendingReports.length}</p>
            </div>
          </div>

          {pendingReports.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div
                className="p-6 cursor-pointer flex items-center justify-between hover:bg-gray-50 transition"
                onClick={() => toggleSection('myPending')}
              >
                <h2 className="text-xl font-bold text-gray-900">
                  Benim İşlem Bekleyen Raporlarım
                  <span className="ml-2 text-sm font-normal text-gray-600">({pendingReports.length} adet)</span>
                </h2>
                {toggleStates.myPending ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
              </div>
              {toggleStates.myPending && (
              <div className="px-6 pb-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Form No</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Durum</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Firma</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Sorumlular</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Lokasyon</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Uygunsuzluk Açıklama</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Açma Fotoğrafları</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Kapama Fotoğrafları</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Tarih</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Planlanan Kapanış</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700 text-sm">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingReports.map(report => {
                      const getActionText = (status: string) => {
                        switch (status) {
                          case 'pre_approval': return 'Ön Onay Yap';
                          case 'waiting_data_entry': return 'Veri Gir';
                          case 'open': return 'Kapat';
                          case 'waiting_close_approval': return 'Kapamayı Onayla';
                          default: return 'İlerlet';
                        }
                      };

                      const person1 = report.responsible_person_1?.user_profiles?.full_name ||
                                     `${report.responsible_person_1?.first_name || ''} ${report.responsible_person_1?.last_name || ''}`.trim();
                      const person2 = report.responsible_person_2?.user_profiles?.full_name ||
                                     `${report.responsible_person_2?.first_name || ''} ${report.responsible_person_2?.last_name || ''}`.trim();

                      return (
                        <tr key={report.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                          <td className="py-4 px-4 font-medium text-gray-900 text-sm">{report.report_number}</td>
                          <td className="py-4 px-4">{getStatusBadge(report.status)}</td>
                          <td className="py-4 px-4 text-gray-700 text-sm">{report.companies?.name || '-'}</td>
                          <td className="py-4 px-4 text-gray-700 text-sm">
                            {person1 && person2 ? `${person1} / ${person2}` : person1 || person2 || '-'}
                          </td>
                          <td className="py-4 px-4 text-gray-700 text-sm">{report.location_description || '-'}</td>
                          <td className="py-4 px-4 text-gray-700 text-sm">
                            <div className="max-w-md">
                              <p className="text-sm break-words">{report.observation_description || '-'}</p>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            {report.photos && report.photos.length > 0 ? (
                              <div className="flex items-center space-x-1">
                                <img
                                  src={report.photos[0]}
                                  alt="Açma"
                                  className="w-12 h-12 object-cover rounded cursor-pointer hover:opacity-75"
                                  onClick={() => setLightbox({ images: report.photos, currentIndex: 0 })}
                                />
                                {report.photos.length > 1 && (
                                  <span className="text-xs text-gray-500">+{report.photos.length - 1}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            {report.closing_photos && report.closing_photos.length > 0 ? (
                              <div className="flex items-center space-x-1">
                                <img
                                  src={report.closing_photos[0]}
                                  alt="Kapama"
                                  className="w-12 h-12 object-cover rounded cursor-pointer hover:opacity-75"
                                  onClick={() => setLightbox({ images: report.closing_photos, currentIndex: 0 })}
                                />
                                {report.closing_photos.length > 1 && (
                                  <span className="text-xs text-gray-500">+{report.closing_photos.length - 1}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-gray-700 text-sm">{new Date(report.created_at).toLocaleDateString('tr-TR')}</td>
                          <td className="py-4 px-4 text-gray-700 text-sm">{report.planned_close_date ? new Date(report.planned_close_date).toLocaleDateString('tr-TR') : '-'}</td>
                          <td className="py-4 px-4 text-right">
                            <button
                              onClick={() => setViewingReportId(report.id)}
                              className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                            >
                              {getActionText(report.status)}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              </div>
              )}
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div
              className="p-6 cursor-pointer flex items-center justify-between hover:bg-gray-50 transition border-b border-gray-200"
              onClick={() => toggleSection('allReports')}
            >
              <h2 className="text-xl font-bold text-gray-900">
                Tüm Raporlar
                <span className="ml-2 text-sm font-normal text-gray-600">({reports.length} adet)</span>
              </h2>
              {toggleStates.allReports ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
            </div>
            {toggleStates.allReports && (
            <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div></div>
              <div className="flex items-center space-x-3">
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
                  onClick={() => setGroupBy(groupBy === 'responsible' ? 'none' : 'responsible')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                    groupBy === 'responsible'
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span>Sorumlu Bazlı</span>
                </button>
                <div className="h-6 w-px bg-gray-300"></div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  <Filter className="w-5 h-5" />
                  <span>Filtreler</span>
                </button>
                <button
                  onClick={exportToExcel}
                  disabled={reports.length === 0}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                >
                  <Download className="w-5 h-5" />
                  <span>Excel İndir</span>
                </button>
              </div>
            </div>

            {showFilters && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">Filtreler</h3>
                  <button
                    onClick={() => {
                      setFilters({
                        status: [],
                        company: [],
                        responsible: [],
                        manufacturingUnit: [],
                        creator: [],
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Durum</label>
                    <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-white">
                      {[
                        { value: 'open', label: 'Açık' },
                        { value: 'pre_approval', label: 'Ön Onay Bekliyor' },
                        { value: 'waiting_data_entry', label: 'Veri Girişi Bekliyor' },
                        { value: 'waiting_close_approval', label: 'Kapanış Onayı Bekliyor' },
                        { value: 'closed_on_time', label: 'Zamanında Kapatıldı' },
                        { value: 'closed_late', label: 'Geç Kapatıldı' }
                      ].map(option => (
                        <label key={option.value} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                          <input
                            type="checkbox"
                            checked={filters.status.includes(option.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFilters({ ...filters, status: [...filters.status, option.value] });
                              } else {
                                setFilters({ ...filters, status: filters.status.filter(s => s !== option.value) });
                              }
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Firma</label>
                    <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-white">
                      {Array.from(new Set(reports.filter(r => r.company_id).map(r => r.company_id)))
                        .map(companyId => {
                          const company = reports.find(r => r.company_id === companyId)?.companies;
                          return company ? (
                            <label key={companyId} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                              <input
                                type="checkbox"
                                checked={filters.company.includes(companyId as string)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFilters({ ...filters, company: [...filters.company, companyId as string] });
                                  } else {
                                    setFilters({ ...filters, company: filters.company.filter(c => c !== companyId) });
                                  }
                                }}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">{company.name}</span>
                            </label>
                          ) : null;
                        })}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Sorumlu Kişi</label>
                    <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-white">
                      {Array.from(new Set(reports.flatMap(r => [r.responsible_person_1_id, r.responsible_person_2_id].filter(Boolean))))
                        .map(personId => {
                          const person = reports.find(r => r.responsible_person_1_id === personId)?.responsible_person_1 ||
                                        reports.find(r => r.responsible_person_2_id === personId)?.responsible_person_2;
                          return person ? (
                            <label key={personId} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                              <input
                                type="checkbox"
                                checked={filters.responsible.includes(personId as string)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFilters({ ...filters, responsible: [...filters.responsible, personId as string] });
                                  } else {
                                    setFilters({ ...filters, responsible: filters.responsible.filter(r => r !== personId) });
                                  }
                                }}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">
                                {person.user_profiles?.full_name || `${person.first_name} ${person.last_name}`}
                              </span>
                            </label>
                          ) : null;
                        })}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">İmalat Birimi</label>
                    <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-white">
                      {Array.from(new Set(reports.filter(r => r.manufacturing_unit_id).map(r => r.manufacturing_unit_id)))
                        .map(unitId => {
                          const unit = reports.find(r => r.manufacturing_unit_id === unitId)?.project_manufacturing_units;
                          return unit ? (
                            <label key={unitId} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                              <input
                                type="checkbox"
                                checked={filters.manufacturingUnit.includes(unitId as string)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFilters({ ...filters, manufacturingUnit: [...filters.manufacturingUnit, unitId as string] });
                                  } else {
                                    setFilters({ ...filters, manufacturingUnit: filters.manufacturingUnit.filter(u => u !== unitId) });
                                  }
                                }}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">{unit.name}</span>
                            </label>
                          ) : null;
                        })}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Raporu Oluşturan</label>
                    <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-white">
                      {Array.from(new Set(reports.filter(r => r.created_by).map(r => r.created_by)))
                        .map(creatorId => {
                          const creator = reports.find(r => r.created_by === creatorId)?.creator;
                          return creator ? (
                            <label key={creatorId} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                              <input
                                type="checkbox"
                                checked={filters.creator.includes(creatorId as string)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFilters({ ...filters, creator: [...filters.creator, creatorId as string] });
                                  } else {
                                    setFilters({ ...filters, creator: filters.creator.filter(c => c !== creatorId) });
                                  }
                                }}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">{creator.full_name}</span>
                            </label>
                          ) : null;
                        })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Tüm başlıklarda ara (form no, firma, sorumlu, lokasyon, uygunsuzluk, aksiyon, bina, kat, aktivite vb.)..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {reports.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Henüz rapor oluşturulmamış</p>
              </div>
            ) : groupedReports ? (
              <div className="space-y-6">
                {Object.entries(groupedReports).sort(([a], [b]) => a.localeCompare(b, 'tr')).map(([groupName, groupReports]) => {
                  const colors = groupBy === 'company' ? 'purple' : 'indigo';
                  return (
                    <div key={groupName} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div
                        className={`px-4 py-3 cursor-pointer flex items-center justify-between bg-${colors}-50 border-b border-${colors}-200`}
                        onClick={() => setGroupToggles(prev => ({ ...prev, [groupName]: !prev[groupName] }))}
                      >
                        <h3 className={`text-lg font-semibold text-${colors}-900`}>
                          {groupName} <span className="text-sm font-normal opacity-75">({groupReports.length} rapor)</span>
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
                              <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Form No</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Durum</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Firma</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Sorumlular</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Lokasyon</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Uygunsuzluk Açıklama</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Açma Fotoğrafları</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Kapama Fotoğrafları</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Tarih</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Planlanan Kapanış</th>
                              <th className="text-right py-3 px-4 font-semibold text-gray-700 text-sm">İşlem</th>
                            </tr>
                          </thead>
                          <tbody>
                            {groupReports.map(report => {
                              const person1 = report.responsible_person_1?.user_profiles?.full_name ||
                                `${report.responsible_person_1?.first_name || ''} ${report.responsible_person_1?.last_name || ''}`.trim();
                              const person2 = report.responsible_person_2?.user_profiles?.full_name ||
                                `${report.responsible_person_2?.first_name || ''} ${report.responsible_person_2?.last_name || ''}`.trim();
                              const responsibles = person1 && person2 ? `${person1} / ${person2}` : person1 || person2 || '-';

                              return (
                                <tr key={report.id} className="border-t border-gray-100 hover:bg-gray-50">
                                  <td className="py-3 px-4 font-medium text-gray-900 text-sm">{report.report_number}</td>
                                  <td className="py-3 px-4">{getStatusBadge(report.status)}</td>
                                  <td className="py-3 px-4 text-gray-700 text-sm">{report.companies?.name || '-'}</td>
                                  <td className="py-3 px-4 text-gray-700 text-sm">{responsibles}</td>
                                  <td className="py-3 px-4 text-gray-700 text-sm">{report.location_description || '-'}</td>
                                  <td className="py-3 px-4 text-gray-700 text-sm">
                                    <div className="break-words max-w-md">
                                      {report.observation_description || '-'}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    {report.photos && report.photos.length > 0 ? (
                                      <div className="flex items-center space-x-1">
                                        <img
                                          src={report.photos[0]}
                                          alt="Açma"
                                          className="w-12 h-12 object-cover rounded cursor-pointer hover:opacity-75"
                                          onClick={() => setLightbox({ images: report.photos, currentIndex: 0 })}
                                        />
                                        {report.photos.length > 1 && (
                                          <span className="text-xs text-gray-500">+{report.photos.length - 1}</span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-gray-400 text-sm">-</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4">
                                    {report.closing_photos && report.closing_photos.length > 0 ? (
                                      <div className="flex items-center space-x-1">
                                        <img
                                          src={report.closing_photos[0]}
                                          alt="Kapama"
                                          className="w-12 h-12 object-cover rounded cursor-pointer hover:opacity-75"
                                          onClick={() => setLightbox({ images: report.closing_photos, currentIndex: 0 })}
                                        />
                                        {report.closing_photos.length > 1 && (
                                          <span className="text-xs text-gray-500">+{report.closing_photos.length - 1}</span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-gray-400 text-sm">-</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-gray-700 text-sm">
                                    {new Date(report.created_at).toLocaleDateString('tr-TR')}
                                  </td>
                                  <td className="py-3 px-4 text-gray-700 text-sm">
                                    {report.planned_close_date ? new Date(report.planned_close_date).toLocaleDateString('tr-TR') : '-'}
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <button
                                      onClick={() => setViewingReportId(report.id)}
                                      className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                                    >
                                      Görüntüle
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
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
            
                columns={[
                  {
                    key: 'report_number',
                    header: 'Form No',
                    width: 150,
                    minWidth: 100,
                    sortable: true,
                    render: (report) => (
                      <span className="font-medium text-gray-900">{report.report_number}</span>
                    )
                 
                  },
                  {
                    key: 'status',
                    header: 'Durum',
                    width: 200,
                    minWidth: 150,
                    sortable: true,
                    render: (report) => getStatusBadge(report.status)
                  },
                  {
                    key: 'manufacturing_unit',
                    header: 'İmalat Birimi',
                    width: 150,
                    minWidth: 120,
                    sortable: true,
                    render: (report) => (
                      <span className="text-gray-700">{report.project_manufacturing_units?.name || '-'}</span>
                    )
                  },
                  {
                    key: 'companies.name',
                    header: 'Firma',
                    width: 150,
                    minWidth: 100,
                    sortable: true,
                    render: (report) => (
                      <span className="text-gray-700">{report.companies?.name || '-'}</span>
                    )
                  },
                  {
                  
  key: 'responsibles',
  header: 'Sorumlular',
  width: 200,
  minWidth: 150,
  sortable: false,
  render: (report) => {
    const person1 =
      report.responsible_person_1?.user_profiles?.full_name ||
      `${report.responsible_person_1?.first_name || ''} ${report.responsible_person_1?.last_name || ''}`.trim();

    const person2 =
      report.responsible_person_2?.user_profiles?.full_name ||
      `${report.responsible_person_2?.first_name || ''} ${report.responsible_person_2?.last_name || ''}`.trim();

    return (
      <span className="text-gray-700">
        {person1 && person2
          ? `${person1} / ${person2}`
          : person1 || person2 || '-'}
      </span>
    );
  }
                  },
                  {
                    key: 'location_description',
                    header: 'Lokasyon',
                    width: 180,
                    minWidth: 120,
                    sortable: true,
                    render: (report) => (
                      <span className="text-gray-700">{report.location_description || '-'}</span>
                    )
                  },
                  {
                    key: 'observation_description',
                    header: 'Uygunsuzluk Açıklama',
                    width: 450,
                    minWidth: 200,
                    maxWidth: 800,
                    render: (report) => (
                      <div className="break-words">
                        <p className="text-sm text-gray-700">{report.observation_description || '-'}</p>
                      </div>
                    )
                  },
                  {
                    key: 'photos',
                    header: 'Açma Fotoğrafları',
                    width: 150,
                    minWidth: 120,
                    render: (report) => (
                      report.photos && report.photos.length > 0 ? (
                        <div className="flex items-center space-x-1">
                          <img
                            src={report.photos[0]}
                            alt="Açma"
                            className="w-12 h-12 object-cover rounded cursor-pointer hover:opacity-75"
                            onClick={() => setLightbox({ images: report.photos, currentIndex: 0 })}
                          />
                          {report.photos.length > 1 && (
                            <span className="text-xs text-gray-500">+{report.photos.length - 1}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )
                    )
                  },
                  {
                    key: 'closing_photos',
                    header: 'Kapama Fotoğrafları',
                    width: 150,
                    minWidth: 120,
                    render: (report) => (
                      report.closing_photos && report.closing_photos.length > 0 ? (
                        <div className="flex items-center space-x-1">
                          <img
                            src={report.closing_photos[0]}
                            alt="Kapama"
                            className="w-12 h-12 object-cover rounded cursor-pointer hover:opacity-75"
                            onClick={() => setLightbox({ images: report.closing_photos, currentIndex: 0 })}
                          />
                          {report.closing_photos.length > 1 && (
                            <span className="text-xs text-gray-500">+{report.closing_photos.length - 1}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )
                    )
                  },
                  {
                    key: 'created_at',
                    header: 'Tarih',
                    width: 120,
                    minWidth: 100,
                    sortable: true,
                    render: (report) => (
                      <span className="text-gray-700">{new Date(report.created_at).toLocaleDateString('tr-TR')}</span>
                    )
                  },
                   {
  key: 'planned_close_date',
  header: 'Planlanan Kapanış Tarihi',
  width: 160,
  minWidth: 120,
  sortable: true,
  render: (report) => (
    <span className="text-gray-700">
      {report.planned_close_date
        ? new Date(report.planned_close_date).toLocaleDateString('tr-TR')
        : '-'}
    </span>
      )
                  },
                  {
                    key: 'actions',
                    header: 'İşlemler',
                    width: 160,
                    minWidth: 140,
                    render: (report) => (
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => setViewingReportId(report.id)}
                          className="text-blue-600 hover:text-blue-700 p-1.5"
                          title="Görüntüle"
                        >
                          <FileText className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handlePrintReport(report)}
                          className="text-green-600 hover:text-green-700 p-1.5"
                          title="PDF Yazdır"
                        >
                          <Printer className="w-5 h-5" />
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => setViewingReportId(report.id)}
                              className="text-gray-600 hover:text-blue-600 p-1.5"
                              title="Düzenle"
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => deleteReport(report.id)}
                              className="text-red-600 hover:text-red-700 p-1.5"
                              title="Sil"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </div>
                    )
                  }
                ]}
                data={paginatedReports}
                storageKey={`field-observation-columns-${currentProject?.id}`}
                onSort={handleSort}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
              />
            )}

            {!groupedReports && sortedReports.length > ITEMS_PER_PAGE && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Toplam {sortedReports.length} kayıt - Sayfa {currentPage} / {totalPages}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Önceki</span>
                  </button>

                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-2 border rounded-lg ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                  >
                    <span>Sonraki</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            </div>
            )}
          </div>
        </div>

        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Form Numarası Ayarları</h2>
              <p className="text-sm text-gray-600 mb-6">
                Bu proje için form numaralandırma sistemini buradan ayarlayabilirsiniz. Her proje kendi numaralandırma sistemine sahiptir.
              </p>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Numara Prefix
                  </label>
                  <input
                    type="text"
                    value={newPrefix}
                    onChange={(e) => setNewPrefix(e.target.value.toUpperCase())}
                    placeholder="Örn: RKG-MPK-SOR"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Örnek: {newPrefix}-{String(settings?.current_number || 1).padStart(3, '0')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mevcut Numara
                  </label>
                  <input
                    type="number"
                    value={newCurrentNumber}
                    onChange={(e) => setNewCurrentNumber(parseInt(e.target.value) || 0)}
                    min="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Bir sonraki form: {newPrefix}-{String(newCurrentNumber + 1).padStart(3, '0')}
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    ⚠️ Dikkat: Bu numarayı değiştirdiğinizde, yeni formlar bu numaradan devam eder.
                  </p>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={updateSettings}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  Kaydet
                </button>
                <button
                  onClick={() => {
                    setShowSettings(false);
                    setNewPrefix(settings?.number_prefix || 'FOR');
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

        {/* Side panel for viewing reports */}
        {viewingReportId && (
          <FieldObservationFormPage
            reportId={viewingReportId}
            isSidePanel={true}
            onClose={() => setViewingReportId(null)}
          />
        )}

        {/* Image Lightbox */}
        {lightbox && (
          <ImageLightbox
            images={lightbox.images}
            currentIndex={lightbox.currentIndex}
            onClose={() => setLightbox(null)}
            onNavigate={(index) => setLightbox({ ...lightbox, currentIndex: index })}
          />
        )}
      </Layout>
    </ProtectedRoute>
  );
}
