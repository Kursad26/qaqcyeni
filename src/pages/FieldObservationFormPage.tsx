import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { StageProgress } from '../components/StageProgress';
import { Stage1FormCreation } from '../components/stages/Stage1FormCreation';
import { Stage2PreApproval } from '../components/stages/Stage2PreApproval';
import { Stage3DataEntry } from '../components/stages/Stage3DataEntry';
import { Stage4ClosingProcess } from '../components/stages/Stage4ClosingProcess';
import { Stage5ClosingApproval } from '../components/stages/Stage5ClosingApproval';
import { useAuth } from '../contexts/AuthContext';
import { useProject } from '../contexts/ProjectContext';
import { supabase } from '../lib/supabase';
import {
  FieldObservationFormData,
  getStageFromStatus,
  getCompletedStages,
  canUserEditStage
} from '../lib/fieldObservationTypes';
import { Home, ClipboardList, Download, Printer, Edit2, X } from 'lucide-react';
import { PDFExportView } from '../components/PDFExportView';
interface FieldObservationFormPageProps {
  reportId?: string;
  isSidePanel?: boolean;
  onClose?: () => void;
}

export function FieldObservationFormPage({ reportId, isSidePanel = false, onClose }: FieldObservationFormPageProps) {
  const { userProfile } = useAuth();
  const { currentProject } = useProject();
  const [formData, setFormData] = useState<FieldObservationFormData>({
    project_id: currentProject?.id || '',
    status: 'pre_approval',
    company_id: null,
    responsible_person_1_id: null,
    responsible_person_2_id: null,
    building_id: null,
    block_id: null,
    floor_id: null,
    manufacturing_unit_id: null,
    activity_id: null,
    location_description: '',
    observation_description: '',
    severity: 'minor',
    reference_document: '',
    photos: [],
    root_cause: '',
    suggested_action: '',
    corrective_action_required: false,
    planned_close_date: '',
    closing_action: '',
    closing_photos: [],
    rejection_reason: ''
  });
  const [loading, setLoading] = useState(!!reportId);
  const [saving, setSaving] = useState(false);
  const [isApprover, setIsApprover] = useState(false);
  const [isResponsible, setIsResponsible] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [personnelId, setPersonnelId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [displayNames, setDisplayNames] = useState<{
    companyName?: string;
    responsiblePerson1Name?: string;
    responsiblePerson2Name?: string;
    buildingName?: string;
    blockName?: string;
    floorName?: string;
    manufacturingUnitName?: string;
    activityName?: string;
    creatorName?: string;
  }>({});

  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super_admin';

  // Yeni form oluşturuluyorsa (reportId yok) her zaman Aşama 1'den başla
  const currentStage = !reportId ? 1 : getStageFromStatus(formData.status);
  const completedStages = !reportId ? [] : getCompletedStages(formData.status);
  const canEdit = !reportId ? true : (isEditMode && isAdmin) ? true : canUserEditStage(
    currentStage,
    formData.status,
    userProfile?.role,
    isCreator,
    isApprover,
    isResponsible,
    isAdmin
  );

  useEffect(() => {
    if (reportId) {
      fetchReport();
    } else {
      checkPermissions();
    }
  }, [reportId, userProfile, currentProject]);

  const checkPermissions = async () => {
    if (!userProfile || !currentProject) return;

    const { data: personnelData, error } = await supabase
   .from('personnel')
  .select('id, field_observation_approver')
  .eq('user_id', userProfile.id)
  .eq('project_id', currentProject.id)
  .eq('dashboard_access', true)
  .maybeSingle();

    if (personnelData) {
      setIsApprover(personnelData.field_observation_approver);
      setPersonnelId(personnelData.id);
    }
  };

  const fetchReport = async () => {
    if (!reportId || !userProfile || !currentProject) return;

    try {
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
        .eq('id', reportId)
        .eq('project_id', currentProject.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setFormData(data as FieldObservationFormData);
        setIsCreator(data.created_by === userProfile.id);

        // Set display names for Stage 3 and PDF export
        setDisplayNames({
          companyName: (data.companies as any)?.name,
          responsiblePerson1Name: (data.responsible_person_1 as any)?.user_profiles?.full_name ||
            `${(data.responsible_person_1 as any)?.first_name || ''} ${(data.responsible_person_1 as any)?.last_name || ''}`.trim(),
          responsiblePerson2Name: (data.responsible_person_2 as any)?.user_profiles?.full_name ||
            (data.responsible_person_2 ? `${(data.responsible_person_2 as any)?.first_name || ''} ${(data.responsible_person_2 as any)?.last_name || ''}`.trim() : undefined),
          buildingName: (data.project_buildings as any)?.name,
          blockName: (data.project_blocks as any)?.name,
          floorName: (data.project_floors as any)?.name,
          manufacturingUnitName: (data.project_manufacturing_units as any)?.name,
          activityName: (data.project_activities as any)?.name,
          creatorName: (data.creator as any)?.full_name
        });

       const { data: personnelData, error } = await supabase
  .from('personnel')
  .select('id, field_observation_approver')
  .eq('user_id', userProfile.id)
  .eq('project_id', currentProject.id)
  .eq('dashboard_access', true)
  .maybeSingle();

        if (personnelData) {
          setPersonnelId(personnelData.id);
          setIsApprover(personnelData.field_observation_approver);
          setIsResponsible(
            personnelData.id === data.responsible_person_1_id ||
            personnelData.id === data.responsible_person_2_id
          );
        }
      }
    } catch (error) {
      console.error('Error fetching report:', error);
      alert('Form yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const addHistory = async (action: string, oldStatus: string, newStatus: string, notes?: string) => {
    if (!formData.id || !userProfile) return;

    await supabase.from('field_observation_history').insert({
      report_id: formData.id,
      user_id: userProfile.id,
      action,
      old_status: oldStatus,
      new_status: newStatus,
      notes: notes || null
    });
  };

  const handleFormDataChange = (data: Partial<FieldObservationFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const handleAdminSave = async () => {
    if (!formData.id || !isAdmin) return;

    if (!confirm('Formdaki değişiklikleri kaydetmek istediğinizden emin misiniz?')) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('field_observation_reports')
        .update({
          company_id: formData.company_id || null,
          responsible_person_1_id: formData.responsible_person_1_id,
          responsible_person_2_id: formData.responsible_person_2_id || null,
          building_id: formData.building_id || null,
          block_id: formData.block_id || null,
          floor_id: formData.floor_id || null,
          manufacturing_unit_id: formData.manufacturing_unit_id || null,
          activity_id: formData.activity_id || null,
          location_description: formData.location_description || '',
          observation_description: formData.observation_description || '',
          severity: formData.severity || 'minor',
          reference_document: formData.reference_document || '',
          photos: formData.photos || [],
          root_cause: formData.root_cause || '',
          suggested_action: formData.suggested_action || '',
          corrective_action_required: formData.corrective_action_required || false,
          planned_close_date: formData.planned_close_date || null,
          closing_action: formData.closing_action || '',
          closing_photos: formData.closing_photos || [],
          rejection_reason: formData.rejection_reason || '',
          updated_at: new Date().toISOString()
        })
        .eq('id', formData.id);

      if (error) {
        console.error('Update error:', error);
        throw new Error(`Database hatası: ${error.message}`);
      }

      await addHistory('admin_edit', formData.status, formData.status, 'Admin tarafından düzenlendi');

      alert('Form başarıyla güncellendi');
      setIsEditMode(false);
      await fetchReport();
    } catch (error: any) {
      console.error('Error saving form:', error);
      alert(`Form kaydedilirken hata oluştu: ${error?.message || 'Bilinmeyen hata'}`);
    } finally {
      setSaving(false);
    }
  };

  const handlePrintPDF = async () => {
    // Dosya adını belirle
    const fileName = formData.report_number || 'Rapor';

    // Orijinal title'ı sakla
    const originalTitle = document.title;

    // PDF dosya adını rapor numarası yap
    document.title = fileName;

    // Tarayıcının print dialog'unu kullan
    // Chrome/Edge: "PDF olarak kaydet" seçeneği ile rapor adıyla kaydedilir
    window.print();

    // Title'ı geri yükle
    const restoreTitle = () => {
      document.title = originalTitle;
    };

    try {
      // html2pdf kütüphanesini dinamik olarak yükle
      const html2pdf = (await import('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js' as any)).default;

      // PDF seçenekleri
      const opt = {
        margin: 10,
        filename: `${fileName}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      // PDF oluştur ve indir
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('PDF oluşturma hatası:', error);
      // Fallback: Normal print kullan
      const originalTitle = document.title;
      document.title = fileName;
      window.print();
      setTimeout(() => { document.title = originalTitle; }, 1000);
    }
  };

  const handleExportExcel = async () => {
    if (!formData.id) return;

    try {
      // Fetch full report data with relations
      const { data: report, error } = await supabase
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
        .eq('id', formData.id)
        .maybeSingle();

      if (error) throw error;
      if (!report) return;

      const exportData = [{
        'Form Numarası': report.report_number,
        'Durum': getStatusText(report.status),
        'Firma': (report.companies as any)?.name || '-',
        'Sorumlu Personel 1': (report.responsible_person_1 as any)?.user_profiles?.full_name ||
                               `${(report.responsible_person_1 as any)?.first_name || ''} ${(report.responsible_person_1 as any)?.last_name || ''}`.trim() || '-',
        'Sorumlu Personel 2': (report.responsible_person_2 as any)?.user_profiles?.full_name ||
                               (report.responsible_person_2 ? `${(report.responsible_person_2 as any)?.first_name || ''} ${(report.responsible_person_2 as any)?.last_name || ''}`.trim() : '-'),
        'Bina': (report.project_buildings as any)?.name || '-',
        'Blok': (report.project_blocks as any)?.name || '-',
        'Kat': (report.project_floors as any)?.name || '-',
        'İmalat Birimi': (report.project_manufacturing_units as any)?.name || '-',
        'Aktivite': (report.project_activities as any)?.name || '-',
        'Lokasyon Açıklaması': report.location_description || '-',
        'Uygunsuzluk Açıklaması': report.observation_description || '-',
        'Majör/Minör': report.severity === 'major' ? 'Majör' : 'Minör',
        'Referans Döküman': report.reference_document || '-',
        'Fotoğraflar': report.photos?.join(', ') || '-',
        'Kök Sebep': report.root_cause || '-',
        'Önerilen Faaliyet': report.suggested_action || '-',
        'Düzeltici Faaliyet Gerekli': report.corrective_action_required ? 'Evet' : 'Hayır',
        'Planlanan Kapama Tarihi': report.planned_close_date ? new Date(report.planned_close_date).toLocaleDateString('tr-TR') : '-',
        'Alınan Aksiyon': report.closing_action || '-',
        'Kapama Fotoğrafları': report.closing_photos?.join(', ') || '-',
        'Red Sebebi': report.rejection_reason || '-',
        'Oluşturan': (report.creator as any)?.full_name || '-',
        'Oluşturulma Tarihi': new Date(report.created_at).toLocaleDateString('tr-TR'),
        'Veri Giriş Tarihi': report.data_entry_date ? new Date(report.data_entry_date).toLocaleDateString('tr-TR') : '-',
        'Kapama Tarihi': report.closing_date ? new Date(report.closing_date).toLocaleDateString('tr-TR') : '-',
        'Onay Tarihi': report.approved_date ? new Date(report.approved_date).toLocaleDateString('tr-TR') : '-'
      }];

      const separator = ';';
      const headers = Object.keys(exportData[0]);
      const csvContent = [
        headers.join(separator),
        ...exportData.map(row => headers.map(h => {
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
      link.setAttribute('download', `${report.report_number}-detay.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Excel dosyası oluşturulurken hata oluştu');
    }
  };

  const getStatusText = (status: string): string => {
    const statusMap: { [key: string]: string } = {
      'pre_approval': 'Ön Onay Bekliyor',
      'waiting_data_entry': 'Veri Girişi Bekliyor',
      'open': 'Açık',
      'waiting_close_approval': 'Kapama Onayı Bekliyor',
      'closed_on_time': 'Kapalı - Zamanında',
      'closed_late': 'Kapalı - Gecikmiş'
    };
    return statusMap[status] || status;
  };

  const handleStage1Submit = async () => {
    if (!userProfile || !currentProject) return;

    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('create_field_observation_report', {
        p_project_id: currentProject.id,
        p_company_id: formData.company_id,
        p_responsible_person_1_id: formData.responsible_person_1_id,
        p_responsible_person_2_id: formData.responsible_person_2_id || null,
        p_building_id: formData.building_id,
        p_block_id: formData.block_id,
        p_floor_id: formData.floor_id,
        p_manufacturing_unit_id: formData.manufacturing_unit_id,
        p_activity_id: formData.activity_id,
        p_location_description: formData.location_description || '',
        p_observation_description: formData.observation_description || '',
        p_severity: formData.severity || 'minor',
        p_reference_document: formData.reference_document || '',
        p_photos: formData.photos || []
      });

      if (error) {
        console.error('Detailed error:', error);
        throw error;
      }

      alert('Form başarıyla oluşturuldu. Ön onay için listeden forma tekrar girebilirsiniz.');
      window.location.href = '/field-observation';
    } catch (error: any) {
      console.error('Error creating report:', error);
      const errorMessage = error?.message || 'Form oluşturulurken hata oluştu';
      alert(`Form oluşturulurken hata oluştu: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const handleStage2Approve = async () => {
    if (!formData.id || !currentProject) return;

    if (!confirm('Formu onaylamak istediğinizden emin misiniz?')) return;

    setSaving(true);
    try {
      const updateData = {
        company_id: formData.company_id || null,
        responsible_person_1_id: formData.responsible_person_1_id,
        responsible_person_2_id: formData.responsible_person_2_id || null,
        building_id: formData.building_id || null,
        block_id: formData.block_id || null,
        floor_id: formData.floor_id || null,
        manufacturing_unit_id: formData.manufacturing_unit_id || null,
        activity_id: formData.activity_id || null,
        location_description: formData.location_description || '',
        observation_description: formData.observation_description || '',
        severity: formData.severity || 'minor',
        reference_document: formData.reference_document || '',
        photos: formData.photos || [],
        status: 'waiting_data_entry',
        approved_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('field_observation_reports')
        .update(updateData)
        .eq('id', formData.id);

      if (error) {
        console.error('Update error:', error);
        throw new Error(`Database hatası: ${error.message}`);
      }

      await addHistory('approved', 'pre_approval', 'waiting_data_entry', 'Ön onay verildi');

      alert('Form onaylandı ve veri girişi için sorumlu personele gönderildi');
      window.location.href = '/field-observation';
    } catch (error: any) {
      console.error('Error approving report:', error);
      alert(`Form onaylanırken hata oluştu: ${error?.message || 'Bilinmeyen hata'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleStage2Reject = async () => {
    if (!formData.id) return;

    const reason = prompt('İptal sebebini giriniz:');
    if (!reason || reason.trim() === '') return;

    if (!confirm('Formu iptal etmek istediğinizden emin misiniz? Bu işlem geri alınamaz!')) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('field_observation_reports')
        .delete()
        .eq('id', formData.id);

      if (error) {
        console.error('Delete error:', error);
        throw new Error(`Form silinemedi: ${error.message}`);
      }

      alert('Form iptal edildi ve silindi');
      window.location.href = '/field-observation';
    } catch (error: any) {
      console.error('Error rejecting report:', error);
      alert(`Form iptal edilirken hata oluştu: ${error?.message || 'Bilinmeyen hata'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleStage3Submit = async () => {
    if (!formData.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('field_observation_reports')
        .update({
          root_cause: formData.root_cause,
          suggested_action: formData.suggested_action,
          corrective_action_required: formData.corrective_action_required,
          planned_close_date: formData.planned_close_date,
          status: 'open',
          data_entry_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', formData.id);

      if (error) {
        console.error('Update error:', error);
        throw new Error(`Database hatası: ${error.message}`);
      }

      await addHistory('data_entered', 'waiting_data_entry', 'open', 'Veri girişi tamamlandı');

      alert('Veri girişi tamamlandı');
      window.location.href = '/field-observation';
    } catch (error: any) {
      console.error('Error submitting data entry:', error);
      alert(`Veri girişi kaydedilirken hata oluştu: ${error?.message || 'Bilinmeyen hata'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleStage4Submit = async () => {
    if (!formData.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('field_observation_reports')
        .update({
          closing_action: formData.closing_action,
          closing_photos: formData.closing_photos,
          status: 'waiting_close_approval',
          closing_date: new Date().toISOString(),
          rejection_reason: '',
          updated_at: new Date().toISOString()
        })
        .eq('id', formData.id);

      if (error) {
        console.error('Update error:', error);
        throw new Error(`Database hatası: ${error.message}`);
      }

      await addHistory('closed_submitted', formData.status, 'waiting_close_approval', 'Kapama için onaya gönderildi');

      alert('Kapama işlemi tamamlandı ve onay için gönderildi');
      window.location.href = '/field-observation';
    } catch (error: any) {
      console.error('Error submitting closing:', error);
      alert(`Kapama işlemi kaydedilirken hata oluştu: ${error?.message || 'Bilinmeyen hata'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleStage5Approve = async () => {
    if (!formData.id) return;

    if (!confirm('Kapamayı onaylamak istediğinizden emin misiniz?')) return;

    setSaving(true);
    try {
      // Sadece tarihleri karşılaştır, saat bilgisini göz ardı et
      const plannedDate = new Date(formData.planned_close_date);
      plannedDate.setHours(23, 59, 59, 999); // Günün sonuna set et

      const closingDate = new Date(formData.closing_date || new Date());
      closingDate.setHours(0, 0, 0, 0); // Günün başına set et

      const newStatus = closingDate <= plannedDate ? 'closed_on_time' : 'closed_late';

      const { error } = await supabase
        .from('field_observation_reports')
        .update({
          status: newStatus,
          approved_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', formData.id);

      if (error) throw error;

      await addHistory('closed_approved', 'waiting_close_approval', newStatus, 'Kapama onaylandı');

      alert(`Kapama onaylandı - ${newStatus === 'closed_on_time' ? 'Zamanında' : 'Geç'}`);
      window.location.href = '/field-observation';
    } catch (error) {
      console.error('Error approving closing:', error);
      alert('Kapama onaylanırken hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleStage5Reject = async (reason: string) => {
    if (!formData.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('field_observation_reports')
        .update({
          status: 'open',
          rejection_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', formData.id);

      if (error) throw error;

      await addHistory('rejected', 'waiting_close_approval', 'open', `Kapama reddedildi: ${reason}`);

      alert('Kapama reddedildi ve sorumlu personele geri gönderildi');
      window.location.href = '/field-observation';
    } catch (error) {
      console.error('Error rejecting closing:', error);
      alert('Kapama reddedilirken hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    if (isSidePanel) {
      return (
        <div className="fixed right-0 top-0 h-full w-[900px] bg-white shadow-2xl z-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Yükleniyor...</p>
          </div>
        </div>
      );
    }
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

  // Side panel content
  const renderContent = () => (
    <div className="space-y-6 print:hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {!isSidePanel && (
            <>
              <a href="/field-observation" className="text-gray-500 hover:text-gray-700 transition">
                <ClipboardList className="w-6 h-6" />
              </a>
              <span className="text-gray-400">/</span>
            </>
          )}
          <h1 className="text-2xl font-bold text-gray-900">
            {reportId ? formData.report_number : 'Yeni Form'}
          </h1>
        </div>
        <div className="flex items-center space-x-2">
          {isSidePanel && onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              title="Kapat"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          )}
          {reportId && isAdmin && !isEditMode && (
            <button
              onClick={() => setIsEditMode(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition print:hidden"
            >
              <Edit2 className="w-4 h-4" />
              <span>Düzenle</span>
            </button>
          )}
          {reportId && isAdmin && isEditMode && (
            <>
              <button
                onClick={handleAdminSave}
                disabled={saving}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition print:hidden disabled:opacity-50"
              >
                <span>Kaydet</span>
              </button>
              <button
                onClick={() => {
                  setIsEditMode(false);
                  fetchReport();
                }}
                disabled={saving}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition print:hidden disabled:opacity-50"
              >
                <span>İptal</span>
              </button>
            </>
          )}
          {reportId && (
            <>
              <button
                onClick={handleExportExcel}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition print:hidden"
              >
                <Download className="w-4 h-4" />
                <span>Excel İndir</span>
              </button>
              <button
                onClick={handlePrintPDF}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition print:hidden"
              >
                <Printer className="w-4 h-4" />
                <span>PDF Yazdır</span>
              </button>
            </>
          )}
        </div>
      </div>

          <StageProgress currentStage={currentStage} completedStages={completedStages} />

          {/* Yeni form oluşturma - sadece stage 1 */}
          {!reportId && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
              <Stage1FormCreation
                formData={formData}
                onChange={handleFormDataChange}
                onSubmit={handleStage1Submit}
                disabled={saving}
              />
            </div>
          )}

          {/* Mevcut form görüntüleme - tüm aşamalar */}
          {reportId && (
            <div className="space-y-6">
              {/* Stage 1 - Form Oluşturma */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h2 className="text-lg font-semibold text-gray-900">Aşama 1: Form Oluşturma</h2>
                  {completedStages.includes(1) && (
                    <p className="text-sm text-green-600 mt-1">✓ Tamamlandı</p>
                  )}
                </div>
                <div className="p-6 md:p-8">
                  <Stage1FormCreation
                    formData={formData}
                    onChange={handleFormDataChange}
                    onSubmit={handleStage1Submit}
                    disabled={!isEditMode || !isAdmin}
                  />
                </div>
              </div>

              {/* Stage 2 - Ön Onay */}
              {currentStage >= 2 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h2 className="text-lg font-semibold text-gray-900">Aşama 2: Ön Onay</h2>
                    {completedStages.includes(2) && (
                      <p className="text-sm text-green-600 mt-1">✓ Tamamlandı</p>
                    )}
                    {currentStage === 2 && canEdit && (
                      <p className="text-sm text-blue-600 mt-1">→ Şu an bu aşamayı düzenleyebilirsiniz</p>
                    )}
                  </div>
                  <div className="p-6 md:p-8">
                    <Stage2PreApproval
                      formData={formData}
                      onChange={handleFormDataChange}
                      onApprove={handleStage2Approve}
                      onReject={handleStage2Reject}
                      disabled={(currentStage !== 2 || !canEdit || saving) && !isEditMode}
                    />
                  </div>
                </div>
              )}

              {/* Stage 3 - Veri Girişi */}
              {currentStage >= 3 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h2 className="text-lg font-semibold text-gray-900">Aşama 3: Veri Girişi</h2>
                    {completedStages.includes(3) && (
                      <p className="text-sm text-green-600 mt-1">✓ Tamamlandı</p>
                    )}
                    {currentStage === 3 && canEdit && (
                      <p className="text-sm text-blue-600 mt-1">→ Şu an bu aşamayı düzenleyebilirsiniz</p>
                    )}
                  </div>
                  <div className="p-6 md:p-8">
                    <Stage3DataEntry
                      formData={formData}
                      onChange={handleFormDataChange}
                      onSubmit={handleStage3Submit}
                      disabled={(currentStage !== 3 || !canEdit || saving) && !isEditMode}
                    />
                  </div>
                </div>
              )}

              {/* Stage 4 - Kapama İşlemi */}
              {currentStage >= 4 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h2 className="text-lg font-semibold text-gray-900">Aşama 4: Kapama İşlemi</h2>
                    {completedStages.includes(4) && (
                      <p className="text-sm text-green-600 mt-1">✓ Tamamlandı</p>
                    )}
                    {currentStage === 4 && canEdit && (
                      <p className="text-sm text-blue-600 mt-1">→ Şu an bu aşamayı düzenleyebilirsiniz</p>
                    )}
                  </div>
                  <div className="p-6 md:p-8">
                    <Stage4ClosingProcess
                      formData={formData}
                      onChange={handleFormDataChange}
                      onSubmit={handleStage4Submit}
                      disabled={(currentStage !== 4 || !canEdit || saving) && !isEditMode}
                    />
                  </div>
                </div>
              )}

              {/* Stage 5 - Kapama Onayı */}
              {currentStage >= 5 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h2 className="text-lg font-semibold text-gray-900">Aşama 5: Kapama Onayı</h2>
                    {completedStages.includes(5) && (
                      <p className="text-sm text-green-600 mt-1">✓ Tamamlandı</p>
                    )}
                    {currentStage === 5 && canEdit && (
                      <p className="text-sm text-blue-600 mt-1">→ Şu an bu aşamayı düzenleyebilirsiniz</p>
                    )}
                  </div>
                  <div className="p-6 md:p-8">
                    <Stage5ClosingApproval
                      formData={formData}
                      onApprove={handleStage5Approve}
                      onReject={handleStage5Reject}
                      disabled={(currentStage !== 5 || !canEdit || saving || ['closed_on_time', 'closed_late'].includes(formData.status)) && !isEditMode}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
    </div>
  );

  // Side panel render
  if (isSidePanel) {
    return (
      <>
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
        <div className="fixed right-0 top-0 h-full w-[900px] bg-white shadow-2xl z-50 overflow-y-auto">
          <div className="p-6">
            {renderContent()}
          </div>
          {/* PDF Export View - renderContent dışında */}
          {reportId && (
            <PDFExportView
              formData={formData}
              projectName={currentProject?.name}
              companyName={displayNames.companyName}
              responsiblePerson1Name={displayNames.responsiblePerson1Name}
              responsiblePerson2Name={displayNames.responsiblePerson2Name}
              buildingName={displayNames.buildingName}
              blockName={displayNames.blockName}
              floorName={displayNames.floorName}
              manufacturingUnitName={displayNames.manufacturingUnitName}
              activityName={displayNames.activityName}
              creatorName={displayNames.creatorName}
            />
          )}
        </div>
      </>
    );
  }

  // Normal page render
  return (
    <ProtectedRoute>
      <Layout>
        {renderContent()}
        {/* PDF Export View - renderContent dışında */}
        {reportId && (
          <PDFExportView
            formData={formData}
            projectName={currentProject?.name}
            companyName={displayNames.companyName}
            responsiblePerson1Name={displayNames.responsiblePerson1Name}
            responsiblePerson2Name={displayNames.responsiblePerson2Name}
            buildingName={displayNames.buildingName}
            blockName={displayNames.blockName}
            floorName={displayNames.floorName}
            manufacturingUnitName={displayNames.manufacturingUnitName}
            activityName={displayNames.activityName}
            creatorName={displayNames.creatorName}
          />
        )}
      </Layout>
    </ProtectedRoute>
  );

}
