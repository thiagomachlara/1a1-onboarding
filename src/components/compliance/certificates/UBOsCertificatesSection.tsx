'use client';

import { useState, useEffect } from 'react';
import { CertificatesChecklist } from './CertificatesChecklist';

interface UBO {
  id: string;
  full_name: string;
  document_number: string;
  qualification: string;
}

interface UBOsCertificatesSectionProps {
  companyId: string;
}

export function UBOsCertificatesSection({ companyId }: UBOsCertificatesSectionProps) {
  const [ubos, setUbos] = useState<UBO[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUbo, setExpandedUbo] = useState<string | null>(null);

  useEffect(() => {
    loadUBOs();
  }, [companyId]);

  const loadUBOs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/companies/${companyId}/ubos`);
      const data = await response.json();

      if (data.success) {
        setUbos(data.ubos || []);
        // Expandir primeiro UBO por padrão
        if (data.ubos && data.ubos.length > 0) {
          setExpandedUbo(data.ubos[0].id);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar UBOs:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleUbo = (uboId: string) => {
    setExpandedUbo(expandedUbo === uboId ? null : uboId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Carregando UBOs...</div>
      </div>
    );
  }

  if (ubos.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800 text-sm">
          ⚠️ Nenhum UBO (Beneficiário Final) cadastrado para esta empresa.
        </p>
        <p className="text-yellow-700 text-xs mt-2">
          Adicione os UBOs na aba "UBOs" para poder emitir certidões PF.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Certidões dos UBOs (Pessoa Física)
        </h3>
        <span className="text-sm text-gray-500">
          {ubos.length} {ubos.length === 1 ? 'UBO' : 'UBOs'}
        </span>
      </div>

      <div className="space-y-3">
        {ubos.map((ubo) => (
          <div key={ubo.id} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Header do UBO */}
            <button
              onClick={() => toggleUbo(ubo.id)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 font-medium text-sm">
                      {ubo.full_name ? ubo.full_name.charAt(0).toUpperCase() : '?'}
                    </span>
                  </div>
                </div>
                <div className="text-left">
                  <div className="font-medium text-gray-900">{ubo.full_name}</div>
                  <div className="text-sm text-gray-500">
                    CPF: {ubo.document_number} • {ubo.qualification}
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0">
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${
                    expandedUbo === ubo.id ? 'transform rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </button>

            {/* Certidões do UBO */}
            {expandedUbo === ubo.id && (
              <div className="p-4 bg-white">
                <CertificatesChecklist 
                  companyId={companyId} 
                  uboId={ubo.id}
                  entityType="PF"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
