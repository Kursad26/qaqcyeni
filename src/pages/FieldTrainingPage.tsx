import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { useAuth } from '../contexts/AuthContext';
import { useProject } from '../contexts/ProjectContext';
import { supabase } from '../lib/supabase';
import { ResizableTable } from '../components/ResizableTable';
import {
  GraduationCap, Plus, Download, Search, Edit2, Trash2, FileText,
  Clock, CheckCircle2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, FileDown, X, Filter, Printer
} from 'lucide-react';
import NoAccessPage from './NoAccessPage';

interface FieldTrainingReport {
  id: string;
  project_id: string;
  report_number: string;
  status: string;
  training_topic: string;
  manufacturing_unit_id: string;
  organized_by_id: string;
  trainer_name: string;
  recipient_company_1_id: string;
  recipient_company_2_id: string;
  training_type: string;
  deadline_date: string;
  delivery_date: string;
  participant_count: number;
  training_duration: number;
  training_content: string;
  photos: string[];
  rejection_reason: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  project_manufacturing_units?: { name: string };
  organized_by?: { first_name: string; last_name: string; user_profiles?: { full_name: string } };
  recipient_company_1?: { name: string };
  recipient_company_2?: { name: string };
  creator?: { full_name: string };
}

interface FieldTrainingSettings {
  id: string;
  project_id: string;
  number_prefix: string;
  current_number: number;
}

export function FieldTrainingPage() {
  const { userProfile } = useAuth();
  const { currentProject, isProjectOwner } = useProject();
  const [reports, setReports] = useState<FieldTrainingReport[]>([]);
  const [pendingReports, setPendingReports] = useState<FieldTrainingReport[]>([]);
  const [settings, setSettings] = useState<FieldTrainingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [canPlan, setCanPlan] = useState(false);
  const [isPlanner, setIsPlanner] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [showSettings, setShowSettings] = useState(false);
  const [newPrefix, setNewPrefix] = useState('SET');
  const [newCurrentNumber, setNewCurrentNumber] = useState(0);

  const [filters, setFilters] = useState({
    status: [] as string[],
    company: [] as string[],
    manufacturingUnit: [] as string[],
    organizedBy: [] as string[]
  });

  const [groupBy, setGroupBy] = useState<'none' | 'organizer' | 'unit'>('none');
  const [groupToggles, setGroupToggles] = useState<{[key: string]: boolean}>({});
  const [showFilters, setShowFilters] = useState(false);

  const [toggleStates, setToggleStates] = useState(() => {
    const saved = localStorage.getItem('field-training-toggles');
    return saved ? JSON.parse(saved) : {
      myPending: true,
      pendingApproval: true,
      allTrainings: true
    };
  });

  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super_admin';

  useEffect(() => {
    localStorage.setItem('field-training-toggles', JSON.stringify(toggleStates));
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
      setCanPlan(true);
      setIsPlanner(true);
    } else {
      const { data } = await supabase
        .from('personnel')
        .select('id, field_training_access, field_training_planner')
        .eq('user_id', userProfile.id)
        .eq('project_id', currentProject.id)
        .maybeSingle();

      personnelData = data;

      if (personnelData) {
        setHasAccess(personnelData.field_training_access === true);
        setCanPlan(personnelData.field_training_access === true);
        setIsPlanner(personnelData.field_training_planner === true);
      } else {
        setHasAccess(false);
        setCanPlan(false);
        setIsPlanner(false);
      }
    }

    await fetchSettings();
    await fetchReports(personnelData);
    setLoading(false);
  };

  const fetchSettings = async () => {
    if (!currentProject) return;

    const { data, error } = await supabase
      .from('field_training_settings')
      .select('*')
      .eq('project_id', currentProject.id)
      .maybeSingle();

    if (data) {
      setSettings(data);
      setNewPrefix(data.number_prefix);
      setNewCurrentNumber(data.current_number);
    } else if (!error) {
      const { data: newSettings } = await supabase
        .from('field_training_settings')
        .insert({
          project_id: currentProject.id,
          number_prefix: 'SET',
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
      .from('field_training_reports')
      .select(`
        *,
        project_manufacturing_units(name),
        organized_by:personnel!organized_by_id(first_name, last_name, user_profiles(full_name)),
        recipient_company_1:companies!recipient_company_1_id(name),
        recipient_company_2:companies!recipient_company_2_id(name),
        creator:user_profiles!created_by(full_name)
      `)
      .eq('project_id', currentProject.id)
      .order('created_at', { ascending: false });

    if (data) {
      setReports(data as any);
      filterPendingReports(data as any, personnelData);
    }
  };

  const filterPendingReports = async (allReports: FieldTrainingReport[], cachedPersonnelData?: any) => {
    if (!userProfile || !currentProject) return;

    // Check if user is admin or project owner
    const userIsAdmin = userProfile.role === 'admin' || userProfile.role === 'super_admin';
    const userIsProjectOwner = isProjectOwner;

    let personnelData = cachedPersonnelData;
    if (!personnelData) {
      const { data } = await supabase
        .from('personnel')
        .select('id, field_training_planner, field_training_access')
        .eq('user_id', userProfile.id)
        .eq('project_id', currentProject.id)
        .maybeSingle();
      personnelData = data;
    }

    const personnelId = personnelData?.id;
    const userIsPlanner = personnelData?.field_training_planner || false;
    const userHasAccess = personnelData?.field_training_access || false;

    const pending = allReports.filter(report => {
      // Stage 2: Organizer needs to execute training
      // Show to: organizer (if they have access), planners, admins
      if (report.status === 'planned' && personnelId && report.organized_by_id === personnelId) {
        if (userHasAccess || userIsPlanner || userIsAdmin || userIsProjectOwner) {
          return true;
        }
      }

      // Approval stage: Planners and admins can approve
      if (report.status === 'awaiting_approval' && (userIsPlanner || userIsAdmin || userIsProjectOwner)) {
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

      if (settings?.id) {
        const { data, error } = await supabase
          .from('field_training_settings')
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
        const { data, error } = await supabase
          .from('field_training_settings')
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
      alert('Ayarlar güncellenirken hata oluştu:\n' + (error.message || 'Bilinmeyen hata'));
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: { label: string; color: string; icon: any } } = {
      planned: { label: 'Planlandı', color: 'bg-blue-100 text-blue-800', icon: Clock },
      awaiting_approval: { label: 'Onay Bekleniyor', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      completed: { label: 'Tamamlandı', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
      cancelled: { label: 'İptal Edildi', color: 'bg-red-100 text-red-800', icon: X }
    };

    const badge = badges[status] || { label: status, color: 'bg-gray-100 text-gray-800', icon: Clock };
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3.5 h-3.5" />
        <span>{badge.label}</span>
      </span>
    );
  };

  const exportToExcel = () => {
    const data = filteredReports.map(report => ({
      'Form Numarası': report.report_number,
      'Durum': report.status === 'planned' ? 'Planlandı' : report.status === 'awaiting_approval' ? 'Onay Bekleniyor' : report.status === 'cancelled' ? 'İptal Edildi' : 'Tamamlandı',
      'Oluşturan': report.creator?.full_name || '-',
      'Eğitim Konusu': report.training_topic || '-',
      'İmalat Birimi': report.project_manufacturing_units?.name || '-',
      'Eğitimi Düzenleyen': report.organized_by?.user_profiles?.full_name ||
                           `${report.organized_by?.first_name} ${report.organized_by?.last_name}` || '-',
      'Eğitimi Veren': report.trainer_name || '-',
      'Eğitimi Alacak Firma 1': report.recipient_company_1?.name || '-',
      'Eğitimi Alacak Firma 2': report.recipient_company_2?.name || '-',
      'Eğitim Tipi': report.training_type === 'internal' ? 'İç Eğitim' : 'Dış Eğitim',
      'Eğitim Son Tarihi': report.deadline_date ? new Date(report.deadline_date).toLocaleDateString('tr-TR') : '-',
      'Eğitim Veriliş Tarihi': report.delivery_date ? new Date(report.delivery_date).toLocaleDateString('tr-TR') : '-',
      'Katılımcı Sayısı': (report as any).participant_count || '-',
      'Eğitim Süresi (Dakika)': (report as any).training_duration || '-',
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
    link.setAttribute('download', `saha-egitimleri-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generatePDF = async (report: FieldTrainingReport) => {
    try {
      const apiToken = import.meta.env.VITE_CARBONE_API_TOKEN;
      const templateId = import.meta.env.VITE_CARBONE_TEMPLATE_ID;

      if (!apiToken || !templateId) {
        alert('Carbone API ayarları yapılmamış. Lütfen .env dosyasını kontrol edin.');
        return;
      }

      // HTML içeriğini temizle ve düz metne çevir
      const cleanHtmlContent = (html: string): string => {
        if (!html) return '-';

        // Geçici bir div oluştur
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        // <br> etiketlerini satır sonuna çevir
        const brs = tempDiv.querySelectorAll('br');
        brs.forEach(br => {
          const textNode = document.createTextNode('\n');
          br.parentNode?.replaceChild(textNode, br);
        });

        // <p> etiketlerini paragraf sonuna çevir
        const paragraphs = tempDiv.querySelectorAll('p');
        paragraphs.forEach(p => {
          const textNode = document.createTextNode('\n');
          p.appendChild(textNode);
        });

        // <div> etiketlerini satır sonuna çevir
        const divs = tempDiv.querySelectorAll('div');
        divs.forEach(div => {
          const textNode = document.createTextNode('\n');
          div.appendChild(textNode);
        });

        // Sadece text içeriğini al (tüm HTML etiketleri kaldırılır)
        let text = tempDiv.textContent || tempDiv.innerText || '';

        // Satır sonlarını Carbone/Word için Windows formatına çevir (\r\n)
        // Bu, Word'de paragraf sonlarının düzgün görünmesini sağlar
        text = text.replace(/\n/g, '\r\n');

        // Fazla boşlukları temizle ama tek satır boşluklarını koru
        text = text.replace(/\r\n{4,}/g, '\r\n\r\n'); // 4'ten fazla satır sonu varsa 2'ye düşür
        text = text.trim();

        return text || '-';
      };

      // Prepare data for Carbone template
      const fotograflar = (report.photos || []).map((foto, index) => ({
        sira: (index + 1).toString(),
        foto: foto
      }));

      const data = {
        tarihSaat: report.delivery_date ? new Date(report.delivery_date).toLocaleDateString('tr-TR') : '-',
        formNo: report.report_number || '-',
        egitimVeren: report.trainer_name || '-',
        raporlayan: report.trainer_name || '-',
        egitimKonusu: report.training_topic || '-',
        imalatBirim: report.project_manufacturing_units?.name || '-',
        tip: report.training_type === 'internal' ? 'İç Eğitim' : 'Dış Eğitim',
        katilimciSayisi: report.participant_count?.toString() || '-',
        egitimSuresi: report.training_duration?.toString() || '-',
        egitimIcerigi: cleanHtmlContent(report.training_content),
        fotograflar: fotograflar
      };

      console.log('Carbone API\'ye gönderilen veri:', data);

      // Call Carbone API to render the report
      const response = await fetch(`https://api.carbone.io/render/${templateId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
          'carbone-version': '5'
        },
        body: JSON.stringify({ data, convertTo: 'pdf' })
      });

      const result = await response.json();
      console.log('Carbone API yanıtı:', result);

      if (!response.ok) {
        const errorMsg = result.message || result.error || response.statusText;
        throw new Error(`Carbone API hatası (${response.status}): ${errorMsg}`);
      }

      if (result.success && result.data && result.data.renderId) {
        // Download the generated PDF
        const downloadUrl = `https://api.carbone.io/render/${result.data.renderId}`;
        const downloadResponse = await fetch(downloadUrl, {
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'carbone-version': '5'
          }
        });

        if (!downloadResponse.ok) {
          throw new Error(`PDF indirme hatası (${downloadResponse.status})`);
        }

        const blob = await downloadResponse.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${report.report_number}_egitim_raporu.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        console.error('Beklenmeyen API yanıtı:', result);
        throw new Error('PDF oluşturulamadı. API yanıtı beklenmeyen formatta.');
      }
    } catch (error: any) {
      console.error('PDF oluşturma hatası:', error);
      alert('PDF oluşturulurken hata oluştu:\n\n' + (error.message || 'Bilinmeyen hata') + '\n\nDetaylar için konsolu kontrol edin.');
    }
  };

  const deleteReport = async (reportId: string) => {
    if (!confirm('Bu eğitimi silmek istediğinizden emin misiniz?')) return;

    const { error } = await supabase
      .from('field_training_reports')
      .delete()
      .eq('id', reportId);

    if (!error) {
      await fetchReports();
      alert('Eğitim başarıyla silindi');
    } else {
      alert('Eğitim silinirken hata oluştu');
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
    const matchesSearch = (
      report.report_number.toLowerCase().includes(searchLower) ||
      report.training_topic?.toLowerCase().includes(searchLower) ||
      report.trainer_name?.toLowerCase().includes(searchLower) ||
      report.organized_by?.user_profiles?.full_name?.toLowerCase().includes(searchLower) ||
      report.organized_by?.first_name?.toLowerCase().includes(searchLower) ||
      report.organized_by?.last_name?.toLowerCase().includes(searchLower) ||
      report.recipient_company_1?.name?.toLowerCase().includes(searchLower) ||
      report.recipient_company_2?.name?.toLowerCase().includes(searchLower) ||
      report.project_manufacturing_units?.name?.toLowerCase().includes(searchLower) ||
      (report.training_type === 'internal' ? 'iç eğitim' : 'dış eğitim').includes(searchLower)
    );

    const matchesStatus = filters.status.length === 0 || filters.status.includes(report.status);
    const matchesCompany = filters.company.length === 0 ||
      filters.company.includes(report.recipient_company_1_id || '') ||
      filters.company.includes(report.recipient_company_2_id || '');
    const matchesUnit = filters.manufacturingUnit.length === 0 ||
      filters.manufacturingUnit.includes(report.manufacturing_unit_id || '');
    const matchesOrganizer = filters.organizedBy.length === 0 ||
      filters.organizedBy.includes(report.organized_by_id || '');

    return matchesSearch && matchesStatus && matchesCompany && matchesUnit && matchesOrganizer;
  });

  const sortedReports = [...filteredReports].sort((a, b) => {
    let aValue: any = a[sortColumn as keyof FieldTrainingReport];
    let bValue: any = b[sortColumn as keyof FieldTrainingReport];

    if (sortColumn === 'organized_by') {
      aValue = a.organized_by?.user_profiles?.full_name ||
               `${a.organized_by?.first_name} ${a.organized_by?.last_name}`;
      bValue = b.organized_by?.user_profiles?.full_name ||
               `${b.organized_by?.first_name} ${b.organized_by?.last_name}`;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Gruplama mantığı
  const getGroupedReports = () => {
    if (groupBy === 'none') return null;

    const groups: { [key: string]: FieldTrainingReport[] } = {};

    sortedReports.forEach(report => {
      let groupKey = '';

      if (groupBy === 'organizer') {
        groupKey = report.organized_by?.user_profiles?.full_name ||
                  `${report.organized_by?.first_name} ${report.organized_by?.last_name}` ||
                  'Düzenleyen Atanmamış';
      } else if (groupBy === 'unit') {
        groupKey = report.project_manufacturing_units?.name || 'İmalat Birimi Atanmamış';
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(report);
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

  const plannedCount = reports.filter(r => r.status === 'planned').length;
  const completedCount = reports.filter(r => r.status === 'completed').length;
  const pendingApprovalCount = reports.filter(r => r.status === 'awaiting_approval').length;

  const downloadParticipationForm = () => {
    window.open('https://docs.google.com/document/d/1GFpxpyjIvptjKJvH_fzEbfLp3na40Db-/edit?usp=sharing&ouid=107778559473678496370&rtpof=true&sd=true', '_blank');
  };

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
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <GraduationCap className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Saha Eğitimleri</h1>
                <p className="text-gray-600 mt-1">Proje: {currentProject?.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={downloadParticipationForm}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                <FileDown className="w-5 h-5" />
                <span>Eğitim Katılım Form İmza Tutanağı</span>
              </button>
              {(isAdmin || isProjectOwner) && (
                <button
                  onClick={() => setShowSettings(true)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                >
                  Form Numarası Ayarları
                </button>
              )}
              {(isPlanner || isAdmin) && (
                <a
                  href="/field-training/new"
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <Plus className="w-5 h-5" />
                  <span>Eğitim Planla</span>
                </a>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Planlanan</span>
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{plannedCount}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Onay Bekliyor</span>
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{pendingApprovalCount}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Tamamlanan</span>
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{completedCount}</p>
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
                  Benim İşlem Bekleyen Eğitimlerim
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
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Form No</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Durum</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Eğitim Konusu</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Son Tarih</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingReports.map(report => {
                      const getActionText = (status: string) => {
                        switch (status) {
                          case 'planned': return 'Eğitimi Gerçekleştir';
                          case 'awaiting_approval': return 'Onayla';
                          default: return 'Görüntüle';
                        }
                      };

                      return (
                        <tr key={report.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                          <td className="py-4 px-4 font-medium text-gray-900">{report.report_number}</td>
                          <td className="py-4 px-4">{getStatusBadge(report.status)}</td>
                          <td className="py-4 px-4 text-gray-700">{report.training_topic || '-'}</td>
                          <td className="py-4 px-4 text-gray-700">
                            {report.deadline_date ? new Date(report.deadline_date).toLocaleDateString('tr-TR') : '-'}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <a
                              href={`/field-training/${report.id}`}
                              className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                            >
                              {getActionText(report.status)}
                            </a>
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
              onClick={() => toggleSection('allTrainings')}
            >
              <h2 className="text-xl font-bold text-gray-900">
                Tüm Eğitimler
                <span className="ml-2 text-sm font-normal text-gray-600">({reports.length} adet)</span>
              </h2>
              {toggleStates.allTrainings ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
            </div>
            {toggleStates.allTrainings && (
            <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div></div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setGroupBy(groupBy === 'organizer' ? 'none' : 'organizer')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                    groupBy === 'organizer'
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span>Düzenleyen Bazlı</span>
                </button>
                <button
                  onClick={() => setGroupBy(groupBy === 'unit' ? 'none' : 'unit')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                    groupBy === 'unit'
                      ? 'bg-teal-600 text-white hover:bg-teal-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span>İmalat Birimi Bazlı</span>
                </button>
                <div className="h-6 w-px bg-gray-300"></div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
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
                        manufacturingUnit: [],
                        organizedBy: []
                      });
                      setGroupBy('none');
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    Filtreleri Temizle
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Durum</label>
                    <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-white">
                      {[
                        { value: 'planned', label: 'Planlandı' },
                        { value: 'awaiting_approval', label: 'Onay Bekliyor' },
                        { value: 'completed', label: 'Tamamlandı' },
                        { value: 'cancelled', label: 'İptal Edildi' }
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
                      {Array.from(new Set(reports.flatMap(r => [r.recipient_company_1_id, r.recipient_company_2_id].filter(Boolean))))
                        .map(companyId => {
                          const company = reports.find(r => r.recipient_company_1_id === companyId)?.recipient_company_1 ||
                                         reports.find(r => r.recipient_company_2_id === companyId)?.recipient_company_2;
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
                    <label className="block text-xs font-medium text-gray-700 mb-2">İmalat Birimi</label>
                    <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-white">
                      {Array.from(new Set(reports.map(r => r.manufacturing_unit_id).filter(Boolean)))
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
                    <label className="block text-xs font-medium text-gray-700 mb-2">Düzenleyen</label>
                    <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-white">
                      {Array.from(new Set(reports.map(r => r.organized_by_id).filter(Boolean)))
                        .map(organizerId => {
                          const organizer = reports.find(r => r.organized_by_id === organizerId)?.organized_by;
                          return organizer ? (
                            <label key={organizerId} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                              <input
                                type="checkbox"
                                checked={filters.organizedBy.includes(organizerId as string)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFilters({ ...filters, organizedBy: [...filters.organizedBy, organizerId as string] });
                                  } else {
                                    setFilters({ ...filters, organizedBy: filters.organizedBy.filter(o => o !== organizerId) });
                                  }
                                }}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">
                                {organizer.user_profiles?.full_name || `${organizer.first_name} ${organizer.last_name}`}
                              </span>
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
                  placeholder="Tüm başlıklarda ara (form no, konu, eğitmen, firma, düzenleyen vb.)..."
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
                <GraduationCap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Henüz eğitim oluşturulmamış</p>
              </div>
            ) : groupedReports ? (
              <div className="space-y-6">
                {Object.entries(groupedReports).sort(([a], [b]) => a.localeCompare(b, 'tr')).map(([groupName, groupReports]) => {
                  const colors = groupBy === 'organizer' ? 'indigo' : 'teal';
                  return (
                    <div key={groupName} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div
                        className={`px-4 py-3 cursor-pointer flex items-center justify-between bg-${colors}-50 border-b border-${colors}-200`}
                        onClick={() => setGroupToggles(prev => ({ ...prev, [groupName]: !prev[groupName] }))}
                      >
                        <h3 className={`text-lg font-semibold text-${colors}-900`}>
                          {groupName} <span className="text-sm font-normal opacity-75">({groupReports.length} eğitim)</span>
                        </h3>
                        {groupToggles[groupName] === false ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronUp className="w-5 h-5" />
                        )}
                      </div>
                      {groupToggles[groupName] !== false && (
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
                            width: 180,
                            minWidth: 150,
                            sortable: true,
                            render: (report) => getStatusBadge(report.status)
                          },
                          {
                            key: 'training_topic',
                            header: 'Eğitim Konusu',
                            width: 250,
                            minWidth: 150,
                            sortable: true,
                            render: (report) => (
                              <span className="text-gray-700">{report.training_topic || '-'}</span>
                            )
                          },
                          {
                            key: 'manufacturing_unit',
                            header: 'İmalat Birimi',
                            width: 180,
                            minWidth: 120,
                            sortable: true,
                            render: (report) => (
                              <span className="text-gray-700">{report.project_manufacturing_units?.name || '-'}</span>
                            )
                          },
                          {
                            key: 'organized_by',
                            header: 'Düzenleyen',
                            width: 180,
                            minWidth: 120,
                            sortable: true,
                            render: (report) => (
                              <span className="text-gray-700">
                                {report.organized_by?.user_profiles?.full_name ||
                                 `${report.organized_by?.first_name} ${report.organized_by?.last_name}`}
                              </span>
                            )
                          },
                          {
                            key: 'trainer_name',
                            header: 'Eğitmen',
                            width: 180,
                            minWidth: 120,
                            sortable: true,
                            render: (report) => (
                              <span className="text-gray-700">{report.trainer_name || '-'}</span>
                            )
                          },
                          {
                            key: 'training_type',
                            header: 'Tip',
                            width: 120,
                            minWidth: 80,
                            sortable: true,
                            render: (report) => (
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                report.training_type === 'internal'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-orange-100 text-orange-800'
                              }`}>
                                {report.training_type === 'internal' ? 'İç Eğitim' : 'Dış Eğitim'}
                              </span>
                            )
                          },
                          {
                            key: 'deadline_date',
                            header: 'Son Tarih',
                            width: 120,
                            minWidth: 100,
                            sortable: true,
                            render: (report) => (
                              <span className="text-gray-700">
                                {report.deadline_date ? new Date(report.deadline_date).toLocaleDateString('tr-TR') : '-'}
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
                                <a
                                  href={`/field-training/${report.id}`}
                                  className="text-blue-600 hover:text-blue-700 p-1.5"
                                  title="Görüntüle"
                                >
                                  <FileText className="w-5 h-5" />
                                </a>
                                {isAdmin && (
                                  <>
                                    <button
                                      onClick={() => generatePDF(report)}
                                      className="text-green-600 hover:text-green-700 p-1.5"
                                      title="PDF Yazdır"
                                    >
                                      <Printer className="w-5 h-5" />
                                    </button>
                                    <a
                                      href={`/field-training/${report.id}`}
                                      className="text-gray-600 hover:text-blue-600 p-1.5"
                                      title="Düzenle"
                                    >
                                      <Edit2 className="w-5 h-5" />
                                    </a>
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
                        data={groupReports}
                        storageKey={`field-training-columns-${currentProject?.id}-${groupName}`}
                        onSort={handleSort}
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                      />
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
                    width: 180,
                    minWidth: 150,
                    sortable: true,
                    render: (report) => getStatusBadge(report.status)
                  },
                  {
                    key: 'training_topic',
                    header: 'Eğitim Konusu',
                    width: 250,
                    minWidth: 150,
                    sortable: true,
                    render: (report) => (
                      <span className="text-gray-700">{report.training_topic || '-'}</span>
                    )
                  },
                  {
                    key: 'manufacturing_unit',
                    header: 'İmalat Birimi',
                    width: 180,
                    minWidth: 120,
                    sortable: true,
                    render: (report) => (
                      <span className="text-gray-700">{report.project_manufacturing_units?.name || '-'}</span>
                    )
                  },
                  {
                    key: 'organized_by',
                    header: 'Düzenleyen',
                    width: 180,
                    minWidth: 120,
                    sortable: true,
                    render: (report) => (
                      <span className="text-gray-700">
                        {report.organized_by?.user_profiles?.full_name ||
                         `${report.organized_by?.first_name} ${report.organized_by?.last_name}`}
                      </span>
                    )
                  },
                  {
                    key: 'trainer_name',
                    header: 'Eğitmen',
                    width: 180,
                    minWidth: 120,
                    sortable: true,
                    render: (report) => (
                      <span className="text-gray-700">{report.trainer_name || '-'}</span>
                    )
                  },
                  {
                    key: 'training_type',
                    header: 'Tip',
                    width: 120,
                    minWidth: 80,
                    sortable: true,
                    render: (report) => (
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        report.training_type === 'internal'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {report.training_type === 'internal' ? 'İç Eğitim' : 'Dış Eğitim'}
                      </span>
                    )
                  },
                  {
                    key: 'deadline_date',
                    header: 'Son Tarih',
                    width: 120,
                    minWidth: 100,
                    sortable: true,
                    render: (report) => (
                      <span className="text-gray-700">
                        {report.deadline_date ? new Date(report.deadline_date).toLocaleDateString('tr-TR') : '-'}
                      </span>
                    )
                  },
                  {
                    key: 'created_at',
                    header: 'Oluşturulma',
                    width: 120,
                    minWidth: 100,
                    sortable: true,
                    render: (report) => (
                      <span className="text-gray-700">{new Date(report.created_at).toLocaleDateString('tr-TR')}</span>
                    )
                  },
                  {
                    key: 'delivery_date',
                    header: 'Eğitim Veriliş Tarihi',
                    width: 140,
                    minWidth: 120,
                    sortable: true,
                    render: (report) => (
                      <span className="text-gray-700">
                        {report.delivery_date ? new Date(report.delivery_date).toLocaleDateString('tr-TR') : '-'}
                      </span>
                    )
                  },
                  {
                    key: 'participant_count',
                    header: 'Katılımcı Sayısı',
                    width: 130,
                    minWidth: 100,
                    sortable: true,
                    render: (report) => (
                      <span className="text-gray-700">
                        {report.participant_count || '-'}
                      </span>
                    )
                  },
                  {
                    key: 'training_duration',
                    header: 'Eğitim Süresi (Dk)',
                    width: 140,
                    minWidth: 100,
                    sortable: true,
                    render: (report) => (
                      <span className="text-gray-700">
                        {report.training_duration ? `${report.training_duration} dk` : '-'}
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
                        <a
                          href={`/field-training/${report.id}`}
                          className="text-blue-600 hover:text-blue-700 p-1.5"
                          title="Görüntüle"
                        >
                          <FileText className="w-5 h-5" />
                        </a>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => generatePDF(report)}
                              className="text-green-600 hover:text-green-700 p-1.5"
                              title="PDF Yazdır"
                            >
                              <Printer className="w-5 h-5" />
                            </button>
                            <a
                              href={`/field-training/${report.id}`}
                              className="text-gray-600 hover:text-blue-600 p-1.5"
                              title="Düzenle"
                            >
                              <Edit2 className="w-5 h-5" />
                            </a>
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
                storageKey={`field-training-columns-${currentProject?.id}`}
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
                    placeholder="Örn: SET"
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
                    setNewPrefix(settings?.number_prefix || 'SET');
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
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
