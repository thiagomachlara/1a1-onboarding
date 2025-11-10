'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface ComplianceDocument {
  id: string;
  file_name: string;
  document_type: string;
  file_url: string;
  expiry_date?: string;
  uploaded_at: string;
}

interface CertificatesSectionProps {
  companyId: string;
}

// Lista fixa de certificados necessários
const REQUIRED_CERTIFICATES = [
  {
    type: 'CNDT',
    name: 'CNDT (Débitos Trabalhistas)',
    description: 'Certidão Negativa de Débitos Trabalhistas',
    emissionUrl: 'https://www.tst.jus.br/certidao',
  },
  {
    type: 'CND_FEDERAL',
    name: 'CND Federal (Receita Federal)',
    description: 'Certidão Negativa de Débitos Federais',
    emissionUrl: 'https://solucoes.receita.fazenda.gov.br/Servicos/certidaointernet/PJ/Emitir',
  },
];

export default function CertificatesSection({ companyId }: CertificatesSectionProps) {
  const [documents, setDocuments] = useState<ComplianceDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, [companyId]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/companies/${companyId}/compliance-documents`);
      const data = await response.json();

      if (data.success) {
        // Filtrar apenas documentos de certificados
        const certDocs = (data.documents || []).filter((doc: ComplianceDocument) =>
          ['CNDT', 'CND_FEDERAL'].includes(doc.document_type)
        );
        setDocuments(certDocs);
      }
    } catch (error) {
      console.error('Erro ao carregar documentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCertificateDocument = (certType: string): ComplianceDocument | undefined => {
    return documents.find((doc) => doc.document_type === certType);
  };

  const isExpiringSoon = (expiryDate: string): boolean => {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
  };

  const isExpired = (expiryDate: string): boolean => {
    const expiry = new Date(expiryDate);
    const now = new Date();
    return expiry < now;
  };

  const getStatusBadge = (cert: typeof REQUIRED_CERTIFICATES[0]) => {
    const doc = getCertificateDocument(cert.type);

    if (!doc) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
          ⏳ Pendente
        </span>
      );
    }

    if (doc.expiry_date) {
      if (isExpired(doc.expiry_date)) {
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-300">
            ❌ Vencido
          </span>
        );
      }

      if (isExpiringSoon(doc.expiry_date)) {
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800 border border-orange-300">
            ⚠️ Vence em breve
          </span>
        );
      }
    }

    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-300">
        ✅ Obtido
      </span>
    );
  };

  const handleEmitClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
    toast.success('🌐 Abrindo site do órgão emissor em nova aba');
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent mb-4"></div>
        <p className="text-gray-600">Carregando certificados...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Certificados de Compliance</h2>
        <p className="text-gray-600">
          Certidões governamentais de regularidade fiscal e trabalhista
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REQUIRED_CERTIFICATES.map((cert) => {
          const doc = getCertificateDocument(cert.type);
          const hasDocument = !!doc;

          return (
            <div
              key={cert.type}
              className="border rounded-lg p-6 hover:shadow-md transition-shadow bg-white"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-lg mb-1">{cert.name}</h3>
                  <p className="text-sm text-gray-600">{cert.description}</p>
                </div>
                {getStatusBadge(cert)}
              </div>

              {hasDocument && doc.expiry_date && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">📅 Validade:</span>{' '}
                    {new Date(doc.expiry_date).toLocaleDateString('pt-BR')}
                  </p>
                  {doc.file_name && (
                    <p className="text-sm text-gray-700 mt-1">
                      <span className="font-medium">📄 Arquivo:</span> {doc.file_name}
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handleEmitClick(cert.emissionUrl)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  🌐 Emitir no site oficial
                </button>

                {hasDocument && doc.file_url && (
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                  >
                    📥 Ver PDF
                  </a>
                )}
              </div>

              {!hasDocument && (
                <p className="mt-3 text-xs text-gray-500 text-center">
                  💡 Após emitir, faça upload na seção "Documentos de Compliance" abaixo
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
