'use client';

import { useState, useEffect } from 'react';
import {
  getCertificateTypeName,
  getCertificateStatusColor,
  getCertificateStatusText,
  isCertificateValid,
  daysUntilExpiry,
} from '@/lib/government-certificates';
import toast from 'react-hot-toast';

interface Certificate {
  id: string;
  certificate_type: string;
  status: string;
  issue_date?: string;
  expiry_date?: string;
  certificate_number?: string;
  protocol_number?: string;
  pdf_url?: string;
  error_message?: string;
  fetched_at: string;
  last_checked_at?: string;
}

interface CertificatesSectionProps {
  companyId: string;
}

export default function CertificatesSection({ companyId }: CertificatesSectionProps) {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState<string | null>(null);

  useEffect(() => {
    loadCertificates();
  }, [companyId]);

  const loadCertificates = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/companies/${companyId}/certificates`);
      const data = await response.json();

      if (data.success) {
        setCertificates(data.certificates || []);
      }
    } catch (error) {
      console.error('Erro ao carregar certificados:', error);
      toast.error('Erro ao carregar certificados');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchCertificate = async (certificateType: string) => {
    const toastId = toast.loading(`🔄 Buscando ${getCertificateTypeName(certificateType)}...`);
    
    try {
      setFetching(certificateType);
      
      const response = await fetch(`/api/companies/${companyId}/certificates/fetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ certificateType }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('✅ Certificado obtido com sucesso!', { id: toastId });
        await loadCertificates();
      } else {
        toast.error(`❌ ${data.error}`, { id: toastId });
      }
    } catch (error: any) {
      console.error('Erro ao buscar certificado:', error);
      toast.error('❌ Erro ao buscar certificado', { id: toastId });
    } finally {
      setFetching(null);
    }
  };

  const renderCertificateCard = (cert: Certificate) => {
    const isValid = cert.expiry_date ? isCertificateValid(cert.expiry_date) : false;
    const daysLeft = cert.expiry_date ? daysUntilExpiry(cert.expiry_date) : null;
    
    return (
      <div key={cert.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">
              {getCertificateTypeName(cert.certificate_type)}
            </h3>
            {cert.certificate_number && (
              <p className="text-xs text-gray-500">Nº {cert.certificate_number}</p>
            )}
            {cert.protocol_number && (
              <p className="text-xs text-gray-500">Protocolo: {cert.protocol_number}</p>
            )}
          </div>
          <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getCertificateStatusColor(cert.status)}`}>
            {getCertificateStatusText(cert.status)}
          </span>
        </div>

        {/* Datas */}
        <div className="space-y-1 mb-3">
          {cert.issue_date && (
            <p className="text-sm text-gray-600">
              📅 <span className="font-medium">Emissão:</span>{' '}
              {new Date(cert.issue_date).toLocaleDateString('pt-BR')}
            </p>
          )}
          {cert.expiry_date && (
            <div>
              <p className="text-sm text-gray-600">
                ⏰ <span className="font-medium">Validade:</span>{' '}
                {new Date(cert.expiry_date).toLocaleDateString('pt-BR')}
              </p>
              {daysLeft !== null && (
                <p className={`text-xs mt-1 ${
                  daysLeft < 0 ? 'text-red-600' :
                  daysLeft < 30 ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  {daysLeft < 0 ? `⚠️ Expirado há ${Math.abs(daysLeft)} dias` :
                   daysLeft === 0 ? '⚠️ Expira hoje' :
                   daysLeft < 30 ? `⚠️ Expira em ${daysLeft} dias` :
                   `✅ Válido por mais ${daysLeft} dias`}
                </p>
              )}
            </div>
          )}
          <p className="text-xs text-gray-500">
            🔄 Última verificação: {new Date(cert.last_checked_at || cert.fetched_at).toLocaleDateString('pt-BR')}
          </p>
        </div>

        {/* Mensagem de erro */}
        {cert.error_message && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            ⚠️ {cert.error_message}
          </div>
        )}

        {/* Ações */}
        <div className="flex gap-2">
          {cert.pdf_url && (
            <a
              href={cert.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors text-center"
            >
              📥 Download PDF
            </a>
          )}
          <button
            onClick={() => handleFetchCertificate(cert.certificate_type)}
            disabled={fetching === cert.certificate_type}
            className="px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            🔄 Atualizar
          </button>
        </div>
      </div>
    );
  };

  const renderFetchButton = (certificateType: string) => {
    const existing = certificates.find(c => c.certificate_type === certificateType);
    if (existing) return null;

    return (
      <div key={certificateType} className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <div className="text-gray-400 text-3xl mb-2">📄</div>
        <h3 className="font-semibold text-gray-900 mb-2">
          {getCertificateTypeName(certificateType)}
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Certificado ainda não obtido
        </p>
        <button
          onClick={() => handleFetchCertificate(certificateType)}
          disabled={fetching === certificateType}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {fetching === certificateType ? '🔄 Buscando...' : '🔍 Buscar Certificado'}
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent mb-4"></div>
        <p className="text-gray-600">Carregando certificados...</p>
      </div>
    );
  }

  const certificateTypes = ['CND_FEDERAL', 'CNDT'];
  const existingCerts = certificates.filter(c => certificateTypes.includes(c.certificate_type));
  const missingTypes = certificateTypes.filter(
    type => !certificates.some(c => c.certificate_type === type)
  );

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Certificados de Compliance</h2>
        <p className="text-gray-600">
          Certidões governamentais de regularidade fiscal e trabalhista
        </p>
      </div>

      {/* Certificados Existentes */}
      {existingCerts.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
            Certificados Obtidos ({existingCerts.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {existingCerts.map(renderCertificateCard)}
          </div>
        </div>
      )}

      {/* Certificados Faltantes */}
      {missingTypes.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
            Certificados Pendentes ({missingTypes.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {missingTypes.map(renderFetchButton)}
          </div>
        </div>
      )}

      {/* Estado vazio */}
      {certificates.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-5xl mb-4">📄</div>
          <p className="text-gray-500 mb-6">Nenhum certificado obtido ainda</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {certificateTypes.map(renderFetchButton)}
          </div>
        </div>
      )}
    </div>
  );
}
