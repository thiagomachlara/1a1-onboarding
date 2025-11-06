'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminHeader from '@/components/admin/AdminHeader';

interface CompanyDossier {
  company: {
    id: string;
    applicant_id: string;
    company_name: string;
    document_number: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    current_status: string;
    applicant_type: string;
    created_at: string;
    updated_at: string;
    last_sync_date: string;
  };
  ubos: any[];
  documents: any[];
  risk_assessment: {
    risk_score: number;
    risk_level: 'low' | 'medium' | 'high';
    risk_factors: any[];
    manual_risk_override: boolean;
    officer_notes: string;
  };
  blockchain: {
    wallet_address: string;
    whitelist_status: string;
    whitelist_pdf_url: string;
  };
  notes: any[];
  audit_logs: any[];
  sumsub_data: any;
}

export default function CompanyDossierPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [dossier, setDossier] = useState<CompanyDossier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState('cadastro');

  useEffect(() => {
    if (id) {
      loadDossier();
    }
  }, [id]);

  const loadDossier = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/companies/${id}/dossier`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erro ao carregar dossiê');
      }

      setDossier(data.dossier);
    } catch (err: any) {
      console.error('Erro ao carregar dossiê:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      const response = await fetch('/api/admin/update-companies', {
        method: 'POST',
      });
      
      if (response.ok) {
        await loadDossier();
      }
    } catch (err) {
      console.error('Erro ao sincronizar:', err);
    } finally {
      setSyncing(false);
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'high': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getRiskLevelText = (level: string) => {
    switch (level) {
      case 'low': return 'Baixo';
      case 'medium': return 'Médio';
      case 'high': return 'Alto';
      default: return 'N/A';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminHeader />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent mb-4"></div>
              <p className="text-gray-600">Carregando dossiê...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !dossier) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminHeader />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Erro ao carregar dossiê</h2>
            <p className="text-gray-600 mb-4">{error || 'Empresa não encontrada'}</p>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              ← Voltar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'cadastro', name: 'Cadastro', icon: '🏢' },
    { id: 'ubos', name: 'UBOs', icon: '👥' },
    { id: 'documentos', name: 'Documentos', icon: '📄' },
    { id: 'risco', name: 'Risco', icon: '⚠️' },
    { id: 'blockchain', name: 'Blockchain', icon: '💼' },
    { id: 'notas', name: 'Notas', icon: '📝' },
    { id: 'auditoria', name: 'Auditoria', icon: '📊' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button 
            onClick={() => router.back()}
            className="mb-4 text-blue-600 hover:text-blue-800"
          >
            ← Voltar para lista
          </button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {dossier.company.company_name}
              </h1>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full border border-gray-300">
                  CNPJ: {dossier.company.document_number}
                </span>
                <span className={`px-3 py-1 text-sm rounded-full ${getRiskLevelColor(dossier.risk_assessment.risk_level)}`}>
                  Risco: {getRiskLevelText(dossier.risk_assessment.risk_level)}
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                  {dossier.company.current_status}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={handleSync} 
                disabled={syncing}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                {syncing ? '🔄 Sincronizando...' : '🔄 Sincronizar'}
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                📥 Gerar PDF
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <div className="flex space-x-1 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.icon} {tab.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow">
          {/* Aba Cadastro */}
          {activeTab === 'cadastro' && (
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Dados Cadastrais</h2>
              <p className="text-gray-600 mb-6">Informações da empresa sincronizadas do Sumsub</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Nome da Empresa</h3>
                  <p className="text-base text-gray-900">{dossier.company.company_name || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">CNPJ</h3>
                  <p className="text-base text-gray-900">{dossier.company.document_number || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Email</h3>
                  <p className="text-base text-gray-900">{dossier.company.email || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Telefone</h3>
                  <p className="text-base text-gray-900">{dossier.company.phone || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Endereço</h3>
                  <p className="text-base text-gray-900">{dossier.company.address || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Cidade/Estado</h3>
                  <p className="text-base text-gray-900">
                    {dossier.company.city && dossier.company.state 
                      ? `${dossier.company.city}, ${dossier.company.state}`
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">CEP</h3>
                  <p className="text-base text-gray-900">{dossier.company.postal_code || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">País</h3>
                  <p className="text-base text-gray-900">{dossier.company.country || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Status</h3>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                    {dossier.company.current_status}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Última Sincronização</h3>
                  <p className="text-base text-gray-900">
                    {dossier.company.last_sync_date 
                      ? new Date(dossier.company.last_sync_date).toLocaleString('pt-BR')
                      : 'Nunca'}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Applicant ID (Sumsub)</h3>
                  <p className="text-sm font-mono text-gray-600">{dossier.company.applicant_id || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Data de Cadastro</h3>
                  <p className="text-base text-gray-900">
                    {new Date(dossier.company.created_at).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Aba UBOs */}
          {activeTab === 'ubos' && (
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">UBOs (Sócios)</h2>
              <p className="text-gray-600 mb-6">{dossier.ubos.length} sócio(s) encontrado(s)</p>
              
              {dossier.ubos.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nenhum UBO encontrado</p>
              ) : (
                <div className="space-y-4">
                  {dossier.ubos.map((ubo, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <p className="font-medium">{ubo.first_name} {ubo.last_name}</p>
                      <p className="text-sm text-gray-600">Participação: {ubo.share_size}%</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Aba Documentos */}
          {activeTab === 'documentos' && (
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Documentos</h2>
              <p className="text-gray-600 mb-6">{dossier.documents.length} documento(s) encontrado(s)</p>
              <p className="text-gray-500 text-center py-8">Em desenvolvimento...</p>
            </div>
          )}

          {/* Aba Risco */}
          {activeTab === 'risco' && (
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Análise de Risco</h2>
              <p className="text-gray-600 mb-6">Score: {dossier.risk_assessment.risk_score}/100</p>
              <p className="text-gray-500 text-center py-8">Em desenvolvimento...</p>
            </div>
          )}

          {/* Aba Blockchain */}
          {activeTab === 'blockchain' && (
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Blockchain & Wallet</h2>
              <div className="space-y-4 mt-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Endereço da Wallet</h3>
                  <p className="text-base font-mono text-gray-900">
                    {dossier.blockchain.wallet_address || 'Não cadastrado'}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Status Whitelist</h3>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full">
                    {dossier.blockchain.whitelist_status || 'pending'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Aba Notas */}
          {activeTab === 'notas' && (
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Notas & Compliance</h2>
              <p className="text-gray-600 mb-6">{dossier.notes.length} nota(s)</p>
              <p className="text-gray-500 text-center py-8">Em desenvolvimento...</p>
            </div>
          )}

          {/* Aba Auditoria */}
          {activeTab === 'auditoria' && (
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Log de Auditoria</h2>
              <p className="text-gray-600 mb-6">{dossier.audit_logs.length} evento(s)</p>
              <p className="text-gray-500 text-center py-8">Em desenvolvimento...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
