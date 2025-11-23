import { FieldObservationFormData, getStageFromStatus } from '../lib/fieldObservationTypes';

interface PDFExportViewProps {
  formData: FieldObservationFormData;
  projectName?: string;
  companyName?: string;
  responsiblePerson1Name?: string;
  responsiblePerson2Name?: string;
  buildingName?: string;
  blockName?: string;
  floorName?: string;
  manufacturingUnitName?: string;
  activityName?: string;
  creatorName?: string;
}

export function PDFExportView({
  formData,
  projectName,
  companyName,
  responsiblePerson1Name,
  responsiblePerson2Name,
  buildingName,
  blockName,
  floorName,
  manufacturingUnitName,
  activityName,
  creatorName
}: PDFExportViewProps) {
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

  const currentStage = getStageFromStatus(formData.status);

  const stages = [
    { number: 1, name: 'Form Oluşturma' },
    { number: 2, name: 'Ön Onay' },
    { number: 3, name: 'Veri Girişi' },
    { number: 4, name: 'Kapama İşlemi' },
    { number: 5, name: 'Kapama Onayı' }
  ];

  const companyLogo = 'https://cdnuploads.aa.com.tr/uploads/sirkethaberleri/Contents/2020/09/18/thumbs_b_c_d8e977daa3fba1989ddc793380b8b342.jpg';

  return (
    <div className="pdf-export-view">
      <style dangerouslySetInnerHTML={{
        __html: `
          @media screen {
            .pdf-export-view {
              display: none;
            }
          }

          @media print {
            /* Sadece PDF export view'ı göster */
            body * {
              visibility: hidden;
            }

            .pdf-export-view,
            .pdf-export-view * {
              visibility: visible !important;
            }

            .pdf-export-view {
              position: static !important;
              width: 100% !important;
              max-width: 100% !important;
              background: white !important;
              padding: 0 !important;
              margin: 0 !important;
            }

            @page {
              size: A4;
              margin: 15mm 12mm;
            }

            /* Sayfa geçiş kontrolü */
            .page-break {
              page-break-before: always !important;
              break-before: always !important;
            }

            .no-page-break {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }

            /* Resimler asla bölünmesin */
            img {
              max-width: 100% !important;
              height: auto !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              page-break-before: auto !important;
              page-break-after: auto !important;
              display: block !important;
            }

            /* Fotoğraf wrapper - En üst seviye kontrol */
            .pdf-photo-wrapper {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              page-break-before: auto !important;
              page-break-after: auto !important;
              display: inline-block !important;
              vertical-align: top !important;
              margin-bottom: 12px !important;
            }

            /* Fotoğraf container - İkinci seviye koruma */
            .pdf-photo-container {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              overflow: hidden !important;
            }

            /* Bilgi bölümleri sayfa içinde bölünmesin */
            .pdf-info-section {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              margin-bottom: 18px !important;
            }

            /* Başlıklar yalnız kalmasın */
            .pdf-section-header {
              page-break-after: avoid !important;
              break-after: avoid !important;
              orphans: 3;
              widows: 3;
            }

            /* Fotoğraf grid kontrolü */
            .pdf-photos-grid {
              page-break-inside: auto !important;
            }

            /* Info item'lar bölünmesin */
            .pdf-info-item {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }

            /* Box'lar bölünmesin */
            .pdf-info-box {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          }

          .pdf-export-view {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #1a1a1a;
            line-height: 1.4;
            width: 100%;
            max-width: 100%;
            background: white;
            padding: 0;
            margin: 0;
          }

          /* Header - İyileştirilmiş boşluklar */
          .pdf-header-wrapper {
            text-align: center;
            padding: 18px 0;
            margin-bottom: 25px;
            border-bottom: 2px solid #1e40af;
            page-break-after: avoid;
          }

          .pdf-logo {
            width: 180px;
            height: auto;
            margin: 0 auto 10px;
            display: block;
          }

          .pdf-main-title {
            font-size: 18px;
            font-weight: 700;
            color: #1e40af;
            margin: 0;
            text-transform: uppercase;
          }

          .pdf-subtitle {
            font-size: 12px;
            color: #64748b;
            margin: 5px 0 0 0;
          }

          .pdf-status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            background: #dbeafe;
            color: #1e40af;
            border: 1px solid #93c5fd;
            margin-top: 8px;
          }

          /* Stage Progress - İyileştirilmiş */
          .pdf-stage-progress {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 20px 0;
            padding: 15px;
            background: #f8fafc;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
            page-break-inside: avoid;
          }

          .pdf-stage-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            flex: 1;
            position: relative;
          }

          .pdf-stage-number {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 14px;
            margin-bottom: 8px;
            border: 2px solid #cbd5e1;
            background: white;
            color: #94a3b8;
          }

          .pdf-stage-item.active .pdf-stage-number {
            background: #1e40af;
            color: white;
            border-color: #1e40af;
          }

          .pdf-stage-item.completed .pdf-stage-number {
            background: #059669;
            color: white;
            border-color: #059669;
          }

          .pdf-stage-name {
            font-size: 10px;
            color: #64748b;
            text-align: center;
            font-weight: 500;
          }

          .pdf-stage-item.active .pdf-stage-name {
            color: #1e40af;
            font-weight: 600;
          }

          .pdf-stage-connector {
            position: absolute;
            top: 18px;
            left: 50%;
            width: 100%;
            height: 2px;
            background: #e2e8f0;
            z-index: 0;
          }

          .pdf-stage-item:last-child .pdf-stage-connector {
            display: none;
          }

          /* Info Cards - İyileştirilmiş boşluklar */
          .pdf-info-section {
            margin-bottom: 20px;
            padding: 15px;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            page-break-inside: avoid;
          }

          .pdf-section-header {
            font-size: 16px;
            font-weight: 700;
            color: #1e293b;
            margin: 0 0 18px 0;
            padding-bottom: 12px;
            border-bottom: 2px solid #e2e8f0;
            display: flex;
            align-items: center;
          }

          .pdf-section-header::before {
            content: '';
            width: 4px;
            height: 20px;
            background: #1e40af;
            margin-right: 10px;
            border-radius: 2px;
          }

          .pdf-info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 18px;
          }

          .pdf-info-item {
            margin-bottom: 10px;
          }

          .pdf-info-label {
            font-size: 11px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
            font-weight: 600;
          }

          .pdf-info-value {
            font-size: 13px;
            color: #1e293b;
            font-weight: 500;
            line-height: 1.6;
          }

          .pdf-info-box {
            background: #f8fafc;
            padding: 14px;
            border-radius: 6px;
            border-left: 3px solid #1e40af;
            margin-top: 8px;
          }

          .pdf-info-box .pdf-info-value {
            line-height: 1.7;
            word-wrap: break-word;
          }

          /* Photo Grid - Repeating group mantığı */
          .pdf-photos-section {
            margin-bottom: 25px;
            page-break-inside: auto;
          }

          .pdf-photos-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-top: 15px;
          }

          .pdf-photo-wrapper {
            width: calc(50% - 8px);
            display: inline-block;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            vertical-align: top;
            margin-bottom: 15px;
          }

          .pdf-photo-container {
            border-radius: 6px;
            overflow: hidden;
            border: 1px solid #e2e8f0;
            background: #f8fafc;
            width: 100%;
            height: 180px;
            margin-bottom: 6px;
          }

          .pdf-photo {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }

          .pdf-photo-caption {
            text-align: center;
            background: #f1f5f9;
            color: #475569;
            padding: 6px 10px;
            font-size: 10px;
            font-weight: 600;
            border-radius: 3px;
            border: 1px solid #e2e8f0;
            margin-top: 2px;
          }

          /* Badges */
          .pdf-severity-badge {
            display: inline-block;
            padding: 5px 14px;
            border-radius: 16px;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .pdf-severity-badge.major {
            background: #fee2e2;
            color: #991b1b;
            border: 1px solid #fca5a5;
          }

          .pdf-severity-badge.minor {
            background: #e0e7ff;
            color: #3730a3;
            border: 1px solid #a5b4fc;
          }

          /* Footer */
          .pdf-footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 2px solid #e2e8f0;
            text-align: center;
            font-size: 10px;
            color: #94a3b8;
            page-break-before: avoid;
          }

          .pdf-footer p {
            margin: 5px 0;
            line-height: 1.6;
          }

          /* Full width items */
          .pdf-full-width {
            grid-column: 1 / -1;
          }
        `
      }} />

      {/* Header Section - Basit ve Temiz */}
      <div className="pdf-header-wrapper">
        <img src={companyLogo} alt="Company Logo" className="pdf-logo" />
        <div className="pdf-main-title">
          {projectName || 'Proje'} - Saha Gözlem Raporu
        </div>
        <div className="pdf-subtitle">
          Uygunsuzluk Tespit ve Takip Formu
        </div>
        <div style={{ marginTop: '12px', fontSize: '11px', color: '#475569', lineHeight: '1.8' }}>
          <div><strong>Rapor No:</strong> {formData.report_number || '-'}</div>
          <div style={{ marginTop: '4px' }}>
            <strong>Düzenleyen:</strong> {creatorName || '-'}
            <span style={{ margin: '0 10px' }}>|</span>
            <strong>Açılış Tarihi:</strong> {formData.created_at ? new Date(formData.created_at).toLocaleDateString('tr-TR') : '-'}
            {formData.approved_date && (
              <>
                <span style={{ margin: '0 10px' }}>|</span>
                <strong>Onay Tarihi:</strong> {new Date(formData.approved_date).toLocaleDateString('tr-TR')}
              </>
            )}
          </div>
        </div>
        <div className="pdf-status-badge">{getStatusText(formData.status)}</div>
      </div>

      {/* Stage Progress */}
      <div className="pdf-stage-progress">
        {stages.map((stage, index) => (
          <div
            key={stage.number}
            className={`pdf-stage-item ${
              stage.number < currentStage ? 'completed' : stage.number === currentStage ? 'active' : ''
            }`}
          >
            {index < stages.length - 1 && <div className="pdf-stage-connector" />}
            <div className="pdf-stage-number">{stage.number}</div>
            <div className="pdf-stage-name">{stage.name}</div>
          </div>
        ))}
      </div>

      {/* General Information */}
      <div className="pdf-info-section">
        <div className="pdf-section-header">Genel Bilgiler</div>
        <div className="pdf-info-grid">
          <div className="pdf-info-item">
            <div className="pdf-info-label">Firma</div>
            <div className="pdf-info-value">{companyName || '-'}</div>
          </div>
          <div className="pdf-info-item">
            <div className="pdf-info-label">Sorumlu Personel 1</div>
            <div className="pdf-info-value">{responsiblePerson1Name || '-'}</div>
          </div>
          <div className="pdf-info-item">
            <div className="pdf-info-label">Sorumlu Personel 2</div>
            <div className="pdf-info-value">{responsiblePerson2Name || '-'}</div>
          </div>
          <div className="pdf-info-item">
            <div className="pdf-info-label">Bina</div>
            <div className="pdf-info-value">{buildingName || '-'}</div>
          </div>
          <div className="pdf-info-item">
            <div className="pdf-info-label">Blok</div>
            <div className="pdf-info-value">{blockName || '-'}</div>
          </div>
          <div className="pdf-info-item">
            <div className="pdf-info-label">Kat</div>
            <div className="pdf-info-value">{floorName || '-'}</div>
          </div>
          <div className="pdf-info-item">
            <div className="pdf-info-label">İmalat Birimi</div>
            <div className="pdf-info-value">{manufacturingUnitName || '-'}</div>
          </div>
          <div className="pdf-info-item">
            <div className="pdf-info-label">Aktivite</div>
            <div className="pdf-info-value">{activityName || '-'}</div>
          </div>
          <div className="pdf-info-item">
            <div className="pdf-info-label">Raporu Oluşturan</div>
            <div className="pdf-info-value">{creatorName || '-'}</div>
          </div>
        </div>
        {formData.location_description && (
          <div className="pdf-info-item pdf-full-width" style={{ marginTop: '10px' }}>
            <div className="pdf-info-label">Lokasyon Açıklaması</div>
            <div className="pdf-info-box">
              <div className="pdf-info-value">{formData.location_description}</div>
            </div>
          </div>
        )}
      </div>

      {/* Observation Details */}
      <div className="pdf-info-section">
        <div className="pdf-section-header">Uygunsuzluk Detayları</div>
        <div className="pdf-info-grid">
          <div className="pdf-info-item">
            <div className="pdf-info-label">Önem Derecesi</div>
            <div className="pdf-info-value">
              <span className={`pdf-severity-badge ${formData.severity}`}>
                {formData.severity === 'major' ? 'MAJÖR' : 'MİNÖR'}
              </span>
            </div>
          </div>
          <div className="pdf-info-item">
            <div className="pdf-info-label">Referans Döküman</div>
            <div className="pdf-info-value">{formData.reference_document || '-'}</div>
          </div>
        </div>
        {formData.observation_description && (
          <div className="pdf-info-item pdf-full-width" style={{ marginTop: '10px' }}>
            <div className="pdf-info-label">Gözlem / Uygunsuzluk Açıklaması</div>
            <div className="pdf-info-box">
              <div className="pdf-info-value">{formData.observation_description}</div>
            </div>
          </div>
        )}
        {formData.root_cause && (
          <div className="pdf-info-item pdf-full-width" style={{ marginTop: '10px' }}>
            <div className="pdf-info-label">Kök Sebep Analizi</div>
            <div className="pdf-info-box">
              <div className="pdf-info-value">{formData.root_cause}</div>
            </div>
          </div>
        )}
        {formData.suggested_action && (
          <div className="pdf-info-item pdf-full-width" style={{ marginTop: '10px' }}>
            <div className="pdf-info-label">Önerilen Düzeltici Faaliyet</div>
            <div className="pdf-info-box">
              <div className="pdf-info-value">{formData.suggested_action}</div>
            </div>
          </div>
        )}
      </div>

      {/* Opening Photos - 2 column grid */}
      {formData.photos && formData.photos.length > 0 && (
        <div className="pdf-photos-section pdf-info-section">
          <div className="pdf-section-header">Açma Fotoğrafları ({formData.photos.length} Adet)</div>
          <div className="pdf-photos-grid">
            {formData.photos.map((photo, index) => (
              <div key={index} className="pdf-photo-wrapper">
                <div className="pdf-photo-container">
                  <img src={photo} alt={`Açma Fotoğraf ${index + 1}`} className="pdf-photo" />
                </div>
                <div className="pdf-photo-caption">Fotoğraf {index + 1}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Corrective Actions */}
      {(formData.corrective_action_required || formData.planned_close_date || formData.closing_action) && (
        <div className="pdf-info-section page-break">
          <div className="pdf-section-header">Düzeltici Faaliyetler</div>
          <div className="pdf-info-grid">
            <div className="pdf-info-item">
              <div className="pdf-info-label">Düzeltici Faaliyet Gerekli</div>
              <div className="pdf-info-value">
                {formData.corrective_action_required ? '✓ Evet' : '✗ Hayır'}
              </div>
            </div>
            {formData.planned_close_date && (
              <div className="pdf-info-item">
                <div className="pdf-info-label">Planlanan Kapama Tarihi</div>
                <div className="pdf-info-value">
                  {new Date(formData.planned_close_date).toLocaleDateString('tr-TR')}
                </div>
              </div>
            )}
          </div>
          {formData.closing_action && (
            <div className="pdf-info-item pdf-full-width" style={{ marginTop: '10px' }}>
              <div className="pdf-info-label">Alınan Aksiyon / Kapama Açıklaması</div>
              <div className="pdf-info-box">
                <div className="pdf-info-value">{formData.closing_action}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Closing Photos - 2 column grid */}
      {formData.closing_photos && formData.closing_photos.length > 0 && (
        <div className="pdf-photos-section pdf-info-section">
          <div className="pdf-section-header">Kapama Fotoğrafları ({formData.closing_photos.length} Adet)</div>
          <div className="pdf-photos-grid">
            {formData.closing_photos.map((photo, index) => (
              <div key={index} className="pdf-photo-wrapper">
                <div className="pdf-photo-container">
                  <img src={photo} alt={`Kapama Fotoğraf ${index + 1}`} className="pdf-photo" />
                </div>
                <div className="pdf-photo-caption">Fotoğraf {index + 1}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="pdf-info-section">
        <div className="pdf-section-header">Zaman Çizelgesi</div>
        <div className="pdf-info-grid">
          {formData.created_at && (
            <div className="pdf-info-item">
              <div className="pdf-info-label">Oluşturulma Tarihi</div>
              <div className="pdf-info-value">
                {new Date(formData.created_at).toLocaleDateString('tr-TR')}
              </div>
            </div>
          )}
          {formData.approved_date && (
            <div className="pdf-info-item">
              <div className="pdf-info-label">Onay Tarihi</div>
              <div className="pdf-info-value">
                {new Date(formData.approved_date).toLocaleDateString('tr-TR')}
              </div>
            </div>
          )}
          {formData.data_entry_date && (
            <div className="pdf-info-item">
              <div className="pdf-info-label">Veri Giriş Tarihi</div>
              <div className="pdf-info-value">
                {new Date(formData.data_entry_date).toLocaleDateString('tr-TR')}
              </div>
            </div>
          )}
          {formData.closing_date && (
            <div className="pdf-info-item">
              <div className="pdf-info-label">Kapama Tarihi</div>
              <div className="pdf-info-value">
                {new Date(formData.closing_date).toLocaleDateString('tr-TR')}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="pdf-footer">
        <p><strong>Bu belge kalite yönetim sistemi kapsamında otomatik olarak oluşturulmuştur.</strong></p>
        <p>Yazdırma Tarihi ve Saati: {new Date().toLocaleDateString('tr-TR')} - {new Date().toLocaleTimeString('tr-TR')}</p>
        <p>{projectName || 'Proje'} © {new Date().getFullYear()} Tüm hakları saklıdır.</p>
      </div>
    </div>
  );
}
