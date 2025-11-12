'use client';

import { useState, useEffect } from 'react';

interface CertificateType {
  id: string;
  name: string;
  description: string;
  source: string;
  infosimples_service: string | null;
  manual_url: string | null;
  is_required: boolean;
}

interface Certificate {
  id: string;
  certificate_type: string;
  status: string;
  issue_date: string | null;
  expiry_date: string | null;
  pdf_storage_path: string | null;
  fetched_at: string;
}

interface CertificatesChecklistProps {
  companyId: string;
}

export function CertificatesChecklist({ companyId }: CertificatesChecklistProps) {
  const [certificateTypes, setCertificateTypes] = useState<CertificateType[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [emitting, setEmitting] = useState<string | null>(null);

  useEffect(() => {
    loadCertificates();
  }, [companyId]);

  const loadCertificates = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/companies/${companyId}/certificates`);
      const data = await response.json();

      if (data.success) {
        setCertificateTypes(data.certificateTypes || []);
        setCertificates(data.certificates || []);
      }
    } catch (error) {
      console.error('Erro ao carregar certidões:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewPDF = async (certificateId: string) => {
    try {
      const response = await fetch(`/api/companies/${companyId}/certificates/${certificateId}/pdf`);
      const data = await response.json();

      if (data.success && data.url) {
        window.open(data.url, '_blank');
      } else {
        alert(`Erro ao abrir PDF: ${data.error}`);
      }
    } catch (error: any) {
      console.error('Erro ao abrir PDF:', error);
      alert(`Erro ao abrir PDF: ${error.message}`);
    }
  };

  const downloadPDF = async (certificateId: string, certificateName: string) => {
    try {
      const response = await fetch(`/api/companies/${companyId}/certificates/${certificateId}/pdf`);
      const data = await response.json();

      if (data.success && data.url) {
        // Criar link temporário para download
        const link = document.createElement('a');
        link.href = data.url;
        link.download = `${certificateName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert(`Erro ao baixar PDF: ${data.error}`);
      }
    } catch (error: any) {
      console.error('Erro ao baixar PDF:', error);
      alert(`Erro ao baixar PDF: ${error.message}`);
    }
  };

  const emitCertificate = async (certificateTypeId: string) => {
    try {
      setEmitting(certificateTypeId);
      const response = await fetch(`/api/companies/${companyId}/certificates/emit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ certificate_type: certificateTypeId }),
      });

      const data = await response.json();

      if (data.success) {
        await loadCertificates();
        const price = typeof data.infosimples?.price === 'number' ? data.infosimples.price : parseFloat(data.infosimples?.price || 0);
        alert(`Certidão emitida com sucesso! Custo: R$ ${price.toFixed(2)}`);
      } else {
        alert(`Erro ao emitir certidão: ${data.error}`);
      }
    } catch (error: any) {
      console.error('Erro ao emitir certidão:', error);
      alert(`Erro ao emitir certidão: ${error.message}`);
    } finally {
      setEmitting(null);
    }
  };

  const getCertificate = (typeId: string): Certificate | undefined => {
    return certificates.find((cert) => cert.certificate_type === typeId);
  };

  const getStatusBadge = (certificate: Certificate | undefined) => {
    if (!certificate) {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">Pendente</span>;
    }

    switch (certificate.status) {
      case 'regular':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">✅ Regular</span>;
      case 'irregular':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">❌ Irregular</span>;
      case 'obtida':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">✅ Obtida</span>;
      case 'error':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">❌ Erro</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">Pendente</span>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const obtainedCount = certificateTypes.filter((type) => getCertificate(type.id)).length;
  const totalCount = certificateTypes.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com contador */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Certidões de Compliance</h3>
          <p className="text-sm text-gray-500">
            {obtainedCount} de {totalCount} certidões obtidas
          </p>
        </div>
        <button
          onClick={loadCertificates}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          🔄 Atualizar
        </button>
      </div>

      {/* Tabela de certidões */}
      <div className="border rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                Nome
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                Fonte
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">
                Validade
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {certificateTypes.map((type) => {
              const certificate = getCertificate(type.id);
              const isEmitting = emitting === type.id;

              return (
                <tr key={type.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{type.name}</div>
                      <div className="text-sm text-gray-500">{type.description}</div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500">
                    {type.source}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {getStatusBadge(certificate)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {certificate?.expiry_date
                      ? formatDate(certificate.expiry_date)
                      : certificate?.issue_date
                      ? formatDate(certificate.issue_date)
                      : '-'}
                  </td>
                  <td className="px-4 py-4 text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2 flex-wrap">
                      {/* Botão Emitir via API */}
                      {type.infosimples_service && (
                        <button
                          onClick={() => emitCertificate(type.id)}
                          disabled={isEmitting}
                          className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isEmitting ? (
                            <>
                              <span className="inline-block animate-spin mr-2">⏳</span>
                              Emitindo...
                            </>
                          ) : (
                            '🤖 Emitir via API'
                          )}
                        </button>
                      )}

                      {/* Botão Emitir Manual */}
                      {type.manual_url && (
                        <button
                          onClick={() => window.open(type.manual_url!, '_blank')}
                          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          🌐 Emitir Manual
                        </button>
                      )}

                      {/* Botão Ver PDF */}
                      {certificate?.pdf_storage_path && (
                        <>
                          <button
                            onClick={() => viewPDF(certificate.id)}
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                          >
                            📄 Ver PDF
                          </button>
                          <button
                            onClick={() => downloadPDF(certificate.id, type.name)}
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                          >
                            ⬇️ Baixar
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legenda */}
      <div className="text-sm text-gray-500 space-y-1">
        <p>
          <strong>🤖 Emitir via API:</strong> Emite automaticamente via InfoSimples
        </p>
        <p>
          <strong>🌐 Emitir Manual:</strong> Abre o site oficial para emissão manual
        </p>
      </div>
    </div>
  );
}
