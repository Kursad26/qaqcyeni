import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { StageProgress } from '../components/StageProgress';
import { Stage1TrainingPlanning } from '../components/stages/Stage1TrainingPlanning';
import { Stage2TrainingExecution } from '../components/stages/Stage2TrainingExecution';
import { useAuth } from '../contexts/AuthContext';
import { useProject } from '../contexts/ProjectContext';
import { supabase } from '../lib/supabase';
import {
  FieldTrainingFormData,
  getStageFromStatus,
  getCompletedStages,
  canUserEditStage
} from '../lib/fieldTrainingTypes';
import { GraduationCap, Download, Edit2 } from 'lucide-react';

interface FieldTrainingFormPageProps {
  reportId?: string;
}

export function FieldTrainingFormPage({ reportId }: FieldTrainingFormPageProps) {
  const { userProfile } = useAuth();
  const { currentProject } = useProject();
  const [formData, setFormData] = useState<FieldTrainingFormData>({
    project_id: currentProject?.id || '',
    status: 'planned',
    training_topic: '',
    manufacturing_unit_id: null,
    organized_by_id: null,
    trainer_name: '',
    recipient_company_1_id: null,
    recipient_company_2_id: null,
    training_type: 'internal',
    deadline_date: '',
    delivery_date: '',
    participant_count: 0,
    training_duration: 0,
    training_content: '',
    photos: [],
    documents: [],
    rejection_reason: ''
  });
  const [loading, setLoading] = useState(!!reportId);
  const [saving, setSaving] = useState(false);
  const [isPlanner, setIsPlanner] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [personnelId, setPersonnelId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [displayNames, setDisplayNames] = useState<{
    manufacturingUnitName?: string;
    organizerName?: string;
    company1Name?: string;
    company2Name?: string;
  }>({});

  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super_admin';

  const currentStage = !reportId ? 1 : getStageFromStatus(formData.status);
  const completedStages = !reportId ? [] : getCompletedStages(formData.status);
  const canEdit = !reportId ? true : (isEditMode && isAdmin) ? true : canUserEditStage(
    currentStage,
    formData.status,
    isCreator,
    isOrganizer,
    isPlanner,
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

    const { data: personnelData } = await supabase
      .from('personnel')
      .select('id, field_training_planner')
      .eq('user_id', userProfile.id)
      .eq('project_id', currentProject.id)
      .maybeSingle();

    if (personnelData) {
      setIsPlanner(personnelData.field_training_planner);
      setPersonnelId(personnelData.id);
    }
  };

  const fetchReport = async () => {
    if (!reportId || !userProfile || !currentProject) return;

    try {
      const { data, error } = await supabase
        .from('field_training_reports')
        .select(`
          *,
          project_manufacturing_units(name),
          organized_by:personnel!organized_by_id(first_name, last_name, user_profiles(full_name)),
          recipient_company_1:companies!recipient_company_1_id(name),
          recipient_company_2:companies!recipient_company_2_id(name)
        `)
        .eq('id', reportId)
        .eq('project_id', currentProject.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setFormData(data as FieldTrainingFormData);
        setIsCreator(data.created_by === userProfile.id);

        setDisplayNames({
          manufacturingUnitName: (data.project_manufacturing_units as any)?.name,
          organizerName: (data.organized_by as any)?.user_profiles?.full_name ||
            `${(data.organized_by as any)?.first_name || ''} ${(data.organized_by as any)?.last_name || ''}`.trim(),
          company1Name: (data.recipient_company_1 as any)?.name,
          company2Name: (data.recipient_company_2 as any)?.name
        });

        const { data: personnelData } = await supabase
          .from('personnel')
          .select('id, field_training_planner')
          .eq('user_id', userProfile.id)
          .eq('project_id', currentProject.id)
          .maybeSingle();

        if (personnelData) {
          setPersonnelId(personnelData.id);
          setIsPlanner(personnelData.field_training_planner);
          setIsOrganizer(personnelData.id === data.organized_by_id);
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

    const { error } = await supabase.from('field_training_history').insert({
      report_id: formData.id,
      user_id: userProfile.id,
      action,
      old_status: oldStatus,
      new_status: newStatus,
      notes: notes || null
    });

    if (error) {
      console.error('History insert error:', error);
      throw new Error(`History kaydı oluşturulamadı: ${error.message}`);
    }
  };

  const handleFormDataChange = (data: Partial<FieldTrainingFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const handleAdminSave = async () => {
    if (!formData.id || !isAdmin) return;

    // Validate required fields
    if (!formData.training_topic?.trim()) {
      alert('Eğitim konusu boş olamaz');
      return;
    }
    if (!formData.organized_by_id) {
      alert('Eğitimi düzenleyen kişi seçilmelidir');
      return;
    }
    if (!formData.trainer_name?.trim()) {
      alert('Eğitimi veren kişi adı boş olamaz');
      return;
    }
    if (!formData.recipient_company_1_id) {
      alert('En az bir firma seçilmelidir');
      return;
    }
    if (!formData.deadline_date) {
      alert('Eğitim son tarihi seçilmelidir');
      return;
    }

    if (!confirm('Formdaki değişiklikleri kaydetmek istediğinizden emin misiniz?')) return;

    setSaving(true);
    try {
      const updateData: any = {
        training_topic: formData.training_topic,
        organized_by_id: formData.organized_by_id,
        trainer_name: formData.trainer_name,
        recipient_company_1_id: formData.recipient_company_1_id,
        training_type: formData.training_type || 'internal',
        deadline_date: formData.deadline_date,
        updated_at: new Date().toISOString()
      };

      // Optional fields
      if (formData.manufacturing_unit_id) updateData.manufacturing_unit_id = formData.manufacturing_unit_id;
      if (formData.recipient_company_2_id) updateData.recipient_company_2_id = formData.recipient_company_2_id;
      if (formData.delivery_date) updateData.delivery_date = formData.delivery_date;
      if (formData.participant_count) updateData.participant_count = formData.participant_count;
      if (formData.training_duration) updateData.training_duration = formData.training_duration;
      if (formData.training_content) updateData.training_content = formData.training_content;
      if (formData.photos && formData.photos.length > 0) updateData.photos = formData.photos;
      if (formData.documents && formData.documents.length > 0) updateData.documents = formData.documents;
      if (formData.rejection_reason) updateData.rejection_reason = formData.rejection_reason;

      const { error } = await supabase
        .from('field_training_reports')
        .update(updateData)
        .eq('id', formData.id);

      if (error) {
        console.error('Update error:', error);
        throw new Error(`Database hatası: ${error.message}`);
      }

      // Try to add history, but don't fail if it errors
      try {
        await addHistory('admin_edit', formData.status, formData.status, 'Admin tarafından düzenlendi');
      } catch (historyError) {
        console.error('History error (non-critical):', historyError);
        // Continue anyway - history is not critical
      }

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

  const handleExportExcel = async () => {
    if (!formData.id) return;

    try {
      const { data: report, error } = await supabase
        .from('field_training_reports')
        .select(`
          *,
          project_manufacturing_units(name),
          organized_by:personnel!organized_by_id(first_name, last_name, user_profiles(full_name)),
          recipient_company_1:companies!recipient_company_1_id(name),
          recipient_company_2:companies!recipient_company_2_id(name),
          creator:user_profiles!created_by(full_name)
        `)
        .eq('id', formData.id)
        .maybeSingle();

      if (error) throw error;
      if (!report) return;

      const exportData = [{
        'Form Numarası': report.report_number,
        'Durum': getStatusText(report.status),
        'Eğitim Konusu': report.training_topic || '-',
        'İmalat Birimi': (report.project_manufacturing_units as any)?.name || '-',
        'Eğitimi Düzenleyen': (report.organized_by as any)?.user_profiles?.full_name ||
                              `${(report.organized_by as any)?.first_name || ''} ${(report.organized_by as any)?.last_name || ''}`.trim() || '-',
        'Eğitimi Veren': report.trainer_name || '-',
        'Eğitimi Alacak Firma 1': (report.recipient_company_1 as any)?.name || '-',
        'Eğitimi Alacak Firma 2': (report.recipient_company_2 as any)?.name || '-',
        'Eğitim Tipi': report.training_type === 'internal' ? 'İç Eğitim' : 'Dış Eğitim',
        'Eğitim Son Tarihi': report.deadline_date ? new Date(report.deadline_date).toLocaleDateString('tr-TR') : '-',
        'Eğitim Veriliş Tarihi': report.delivery_date ? new Date(report.delivery_date).toLocaleDateString('tr-TR') : '-',
        'Katılımcı Sayısı': (report as any).participant_count || '-',
        'Eğitim Süresi (Dakika)': (report as any).training_duration || '-',
        'Eğitim İçeriği': report.training_content || '-',
        'Fotoğraflar': report.photos?.join(', ') || '-',
        'Red Sebebi': report.rejection_reason || '-',
        'Oluşturan': (report.creator as any)?.full_name || '-',
        'Oluşturulma Tarihi': new Date(report.created_at).toLocaleDateString('tr-TR')
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
      'planned': 'Planlandı',
      'awaiting_approval': 'Onay Bekleniyor',
      'completed': 'Tamamlandı'
    };
    return statusMap[status] || status;
  };

  const handleStage1Submit = async () => {
    if (!userProfile || !currentProject) return;

    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('create_field_training_report', {
        p_project_id: currentProject.id,
        p_training_topic: formData.training_topic,
        p_manufacturing_unit_id: formData.manufacturing_unit_id,
        p_organized_by_id: formData.organized_by_id,
        p_trainer_name: formData.trainer_name,
        p_recipient_company_1_id: formData.recipient_company_1_id,
        p_recipient_company_2_id: formData.recipient_company_2_id || null,
        p_training_type: formData.training_type,
        p_deadline_date: formData.deadline_date,
        p_activity_id: formData.activity_id
      });

      if (error) {
        console.error('Detailed error:', error);
        throw error;
      }

      alert('Eğitim başarıyla planlandı. Listeden eğitime tekrar girebilirsiniz.');
      window.location.href = '/field-training';
    } catch (error: any) {
      console.error('Error creating training:', error);
      const errorMessage = error?.message || 'Eğitim planlanırken hata oluştu';
      alert(`Eğitim planlanırken hata oluştu: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const handleStage2Submit = async () => {
    if (!formData.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('field_training_reports')
        .update({
          delivery_date: formData.delivery_date,
          participant_count: formData.participant_count,
          training_duration: formData.training_duration,
          training_content: formData.training_content,
          photos: formData.photos,
          documents: formData.documents || [],
          status: 'awaiting_approval',
          updated_at: new Date().toISOString()
        })
        .eq('id', formData.id);

      if (error) {
        console.error('Update error:', error);
        throw new Error(`Database hatası: ${error.message}`);
      }

      // Try to add history, but don't fail if it errors
      try {
        await addHistory('submitted_for_approval', 'planned', 'awaiting_approval', 'Onay için gönderildi');
      } catch (historyError) {
        console.error('History error (non-critical):', historyError);
        // Continue anyway - history is not critical
      }

      alert('Eğitim tamamlandı ve onay için gönderildi');
      window.location.href = '/field-training';
    } catch (error: any) {
      console.error('Error submitting training:', error);
      alert(`Eğitim gönderilirken hata oluştu: ${error?.message || 'Bilinmeyen hata'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!formData.id) return;

    if (!confirm('Eğitimi onaylamak istediğinizden emin misiniz?')) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('field_training_reports')
        .update({
          status: 'completed',
          completion_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', formData.id);

      if (error) throw error;

      // Try to add history, but don't fail if it errors
      try {
        await addHistory('approved', 'awaiting_approval', 'completed', 'Eğitim onaylandı');
      } catch (historyError) {
        console.error('History error (non-critical):', historyError);
      }

      alert('Eğitim onaylandı');
      window.location.href = '/field-training';
    } catch (error) {
      console.error('Error approving training:', error);
      alert('Eğitim onaylanırken hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!formData.id) return;
    if (formData.status !== 'planned') {
      alert('Sadece planlandı durumundaki eğitimler iptal edilebilir');
      return;
    }

    const reason = prompt('İptal sebebini girin:');
    if (!reason || reason.trim() === '') {
      alert('İptal sebebi girilmelidir');
      return;
    }

    if (!confirm('Eğitimi iptal etmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) return;

    setSaving(true);
    try {
      console.log('Starting cancellation:', {
        id: formData.id,
        userId: userProfile?.id,
        projectId: formData.project_id,
        currentStatus: formData.status
      });

      // Check current auth session
      const { data: sessionData } = await supabase.auth.getSession();
      console.log('Auth session:', sessionData.session?.user?.id);

      const { data, error } = await supabase
        .from('field_training_reports')
        .update({
          status: 'cancelled',
          cancellation_reason: reason.trim(),
          cancelled_at: new Date().toISOString(),
          cancelled_by: userProfile?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', formData.id)
        .select();

      if (error) {
        console.error('Cancellation error:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      console.log('Cancellation successful:', data);

      // Try to add history, but don't fail if it errors
      try {
        await addHistory('cancelled', 'planned', 'cancelled', `Eğitim iptal edildi: ${reason}`);
      } catch (historyError) {
        console.error('History error (non-critical):', historyError);
      }

      alert('Eğitim iptal edildi');
      window.location.href = '/field-training';
    } catch (error: any) {
      console.error('Error cancelling training:', error);
      alert('Eğitim iptal edilirken hata oluştu:\n' + (error.message || JSON.stringify(error)));
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async (reason: string) => {
    if (!formData.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('field_training_reports')
        .update({
          status: 'planned',
          rejection_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', formData.id);

      if (error) throw error;

      // Try to add history, but don't fail if it errors
      try {
        await addHistory('rejected', 'awaiting_approval', 'planned', `Eğitim reddedildi: ${reason}`);
      } catch (historyError) {
        console.error('History error (non-critical):', historyError);
      }

      alert('Eğitim reddedildi ve düzenleyene geri gönderildi');
      window.location.href = '/field-training';
    } catch (error) {
      console.error('Error rejecting training:', error);
      alert('Eğitim reddedilirken hata oluştu');
    } finally {
      setSaving(false);
    }
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

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <a href="/field-training" className="text-gray-500 hover:text-gray-700 transition">
                <GraduationCap className="w-6 h-6" />
              </a>
              <span className="text-gray-400">/</span>
              <h1 className="text-2xl font-bold text-gray-900">
                {reportId ? formData.report_number : 'Yeni Eğitim'}
              </h1>
            </div>
            {reportId && (
              <div className="flex items-center space-x-2">
                {/* İptal Et Butonu - Sadece Planlandı durumundayken ve admin/planner ise göster */}
                {formData.status === 'planned' && (isAdmin || isPlanner) && !isEditMode && (
                  <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                  >
                    <span>Eğitimi İptal Et</span>
                  </button>
                )}
                {isAdmin && !isEditMode && (
                  <button
                    onClick={() => setIsEditMode(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>Düzenle</span>
                  </button>
                )}
                {isAdmin && isEditMode && (
                  <>
                    <button
                      onClick={handleAdminSave}
                      disabled={saving}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                    >
                      <span>Kaydet</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsEditMode(false);
                        fetchReport();
                      }}
                      disabled={saving}
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition disabled:opacity-50"
                    >
                      <span>Düzenlemeyi İptal</span>
                    </button>
                  </>
                )}
                <button
                  onClick={handleExportExcel}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Excel İndir</span>
                </button>
              </div>
            )}
          </div>

          <StageProgress currentStage={currentStage} completedStages={completedStages} />

          {/* İptal Edilmiş Form Uyarısı */}
          {formData.status === 'cancelled' && formData.cancellation_reason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-red-800">Bu eğitim iptal edilmiştir</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p><strong>İptal Sebebi:</strong> {formData.cancellation_reason}</p>
                    {formData.cancelled_at && (
                      <p className="mt-1"><strong>İptal Tarihi:</strong> {new Date(formData.cancelled_at).toLocaleString('tr-TR')}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!reportId && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
              <Stage1TrainingPlanning
                formData={formData}
                onChange={handleFormDataChange}
                onSubmit={handleStage1Submit}
                disabled={saving}
              />
            </div>
          )}

          {reportId && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h2 className="text-lg font-semibold text-gray-900">Aşama 1: Eğitim Planlama</h2>
                  {completedStages.includes(1) && (
                    <p className="text-sm text-green-600 mt-1">✓ Tamamlandı</p>
                  )}
                </div>
                <div className="p-6 md:p-8">
                  <Stage1TrainingPlanning
                    formData={formData}
                    onChange={handleFormDataChange}
                    onSubmit={handleStage1Submit}
                    disabled={!((isEditMode && isAdmin) || canUserEditStage(1, formData.status, isCreator, isOrganizer, isPlanner, isAdmin))}
                    hideSubmitButton={!!reportId}
                  />
                </div>
              </div>

              {currentStage >= 2 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h2 className="text-lg font-semibold text-gray-900">Aşama 2: Eğitim Gerçekleştirme</h2>
                    {completedStages.includes(2) && (
                      <p className="text-sm text-green-600 mt-1">✓ Tamamlandı</p>
                    )}
                    {currentStage === 2 && canEdit && (
                      <p className="text-sm text-blue-600 mt-1">→ Şu an bu aşamayı düzenleyebilirsiniz</p>
                    )}
                  </div>
                  <div className="p-6 md:p-8">
                    <Stage2TrainingExecution
                      formData={formData}
                      onChange={handleFormDataChange}
                      onSubmit={handleStage2Submit}
                      onApprove={handleApprove}
                      onReject={handleReject}
                      disabled={
                        (isEditMode && isAdmin)
                          ? saving  // Admin düzenleme modunda: sadece kayıt sırasında kilitli
                          : (!canUserEditStage(2, formData.status, isCreator, isOrganizer, isPlanner, isAdmin) || formData.status === 'completed' || saving)
                      }
                      isApprovalStage={formData.status === 'awaiting_approval' && (isPlanner || isAdmin) && !(isEditMode && isAdmin)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
