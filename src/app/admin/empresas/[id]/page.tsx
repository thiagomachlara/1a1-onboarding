'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminHeader from '@/components/admin/AdminHeader';
import GoogleMapsSection from '@/components/compliance/GoogleMapsSection';

import { CertificatesChecklist } from '@/components/compliance/certificates/CertificatesChecklist';
import { UBOsCertificatesSection } from '@/components/compliance/certificates/UBOsCertificatesSection';
import toast from 'react-hot-toast';

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
    enriched_street?: string;
    enriched_number?: string;
    enriched_complement?: string;
    enriched_neighborhood?: string;
    enriched_city?: string;
    enriched_state?: string;
    enriched_postal_code?: string;
    enriched_source?: string;
    enriched_at?: string;
    current_status: string;
    applicant_type: string;
    created_at: string;
    updated_at: string;
    last_sync_date: string;
    contract_signed_at?: string;
    contract_pdf_url?: string;
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
    wallet_term_pdf_path?: string;
    wallet_registered_at?: string;
    wallet_ip?: string;
    whitelist_status: string;
    whitelist_pdf_url: string;
  };
  notes: any[];
  audit_logs: any[];
  sumsub_data: any;
}

interface Document {
  doc_set_type: string;
  doc_type: string;
  image_id: string;
  inspection_id: string;
  status: string;
  review_answer?: string;
  review_comment?: string;
}

export default function CompanyDossierPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [dossier, setDossier] = useState<CompanyDossier | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState('cadastro');
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [uboDocuments, setUboDocuments] = useState<{[key: string]: any[]}>({});

  useEffect(() => {
    if (id) {
      loadDossier();
      loadDocuments();
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
      
      // Carregar documentos de cada UBO
      if (data.dossier.ubos && data.dossier.ubos.length > 0) {
        loadUBODocuments(data.dossier.ubos);
      }
    } catch (err: any) {
      console.error('Erro ao carregar dossiê:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadUBODocuments = async (ubos: any[]) => {
    try {
      const docsMap: {[key: string]: any[]} = {};
      
      for (const ubo of ubos) {
        if (ubo.applicant_id) {
          try {
            const response = await fetch(`/api/ubos/${ubo.applicant_id}/documents`);
            const data = await response.json();
            
            if (response.ok && data.success) {
              docsMap[ubo.applicant_id] = data.documents || [];
            }
          } catch (err) {
            console.error(`Erro ao carregar documentos do UBO ${ubo.applicant_id}:`, err);
          }
        }
      }
      
      setUboDocuments(docsMap);
    } catch (err) {
      console.error('Erro ao carregar documentos dos UBOs:', err);
    }
  };

  const loadDocuments = async () => {
    try {
      const response = await fetch(`/api/companies/${id}/documents`);
      const data = await response.json();

      if (response.ok && data.success) {
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error('Erro ao carregar documentos:', err);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      
      // 1. Sincronizar APENAS esta empresa com Sumsub
      const response = await fetch(`/api/companies/${id}/sync`, {
        method: 'POST',
      });
      
      if (response.ok) {
        // 2. Enriquecer endereço (incluindo geocoding)
        try {
          await fetch(`/api/companies/${id}/enrich-address`, {
            method: 'POST',
            credentials: 'include',
          });
        } catch (enrichError) {
          console.error('Erro ao enriquecer endereço:', enrichError);
        }
        
        // 3. Recarregar dados
        await loadDossier();
        await loadDocuments();
      }
    } catch (err) {
      console.error('Erro ao sincronizar:', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleDownloadDocument = (imageId: string, inspectionId: string) => {
    window.open(`/api/documents/download?imageId=${imageId}&inspectionId=${inspectionId}`, '_blank');
  };

  const handleDownloadSummaryReport = async () => {
    if (!dossier?.company.applicant_id) return;
    
    const toastId = toast.loading('🔄 Gerando relatório da empresa...');
    
    try {
      const response = await fetch('/api/sumsub/summary-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicantId: dossier.company.applicant_id,
          type: 'company',
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${dossier.company.company_name}_summary_report.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('✅ Relatório baixado com sucesso!', { id: toastId });
      } else {
        toast.error('❌ Erro ao gerar relatório', { id: toastId });
      }
    } catch (err) {
      console.error('Erro ao baixar summary report:', err);
      toast.error('❌ Erro ao baixar relatório', { id: toastId });
    }
  };

  const handleDownloadUBOReport = async (applicantId: string, uboName: string) => {
    if (!applicantId) return;
    
    const toastId = toast.loading('🔄 Gerando relatório do UBO...');
    
    try {
      const response = await fetch('/api/sumsub/summary-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicantId: applicantId,
          type: 'individual',
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${uboName}_summary_report.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('✅ Relatório do UBO baixado com sucesso!', { id: toastId });
      } else {
        toast.error('❌ Erro ao gerar relatório do UBO', { id: toastId });
      }
    } catch (err) {
      console.error('Erro ao baixar summary report do UBO:', err);
      toast.error('❌ Erro ao baixar relatório do UBO', { id: toastId });
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

  const getDocTypeLabel = (docType: string) => {
    const labels: Record<string, string> = {
      'COMPANY_DOC': 'Documento da Empresa',
      'ARTICLES': 'Contrato Social',
      'SHAREHOLDER_REGISTRY': 'Registro de Acionistas',
      'COMPANY_POA': 'Procuração',
      'CERTIFICATE': 'Certificado',
      'QUESTIONNAIRE': 'Questionário',
    };
    return labels[docType] || docType;
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'GREEN': 'bg-green-100 text-green-800',
      'RED': 'bg-red-100 text-red-800',
      'YELLOW': 'bg-yellow-100 text-yellow-800',
      'pending': 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
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
    { id: 'ubos', name: 'UBOs', icon: '👥', count: dossier.ubos.length },
    { id: 'localizacao', name: 'Localização', icon: '📍' },
    { id: 'documentos', name: 'Documentos', icon: '📄', count: documents.length },
    { id: 'compliance', name: 'Compliance', icon: '✅' },
    { id: 'risco', name: 'Risco', icon: '⚠️' },
    { id: 'blockchain', name: 'Blockchain', icon: '💼' },
    { id: 'notas', name: 'Notas', icon: '📝', count: dossier.notes.length },
    { id: 'auditoria', name: 'Auditoria', icon: '📊', count: dossier.audit_logs.length },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button 
            onClick={() => router.back()}
            className="mb-4 text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Voltar para lista
          </button>

          <div className="flex items-start justify-between flex-wrap gap-4">
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

            <div className="flex gap-2 flex-wrap">
              <button 
                onClick={handleSync} 
                disabled={syncing}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {syncing ? '🔄 Sincronizando...' : '🔄 Sincronizar'}
              </button>
              <button 
                onClick={handleDownloadSummaryReport}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                📥 Summary Report
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
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded-full">
                      {tab.count}
                    </span>
                  )}
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
                {/* Endereço Enriquecido ou Original */}
                {dossier.company.enriched_at ? (
                  <>
                    <div className="col-span-2">
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Endereço</h3>
                      <div className="space-y-1">
                        {/* Usar endereço completo da Sumsub */}
                        <p className="text-base text-gray-900">
                          {dossier.company.address}
                        </p>
                        {/* Mostrar dados complementares enriquecidos se disponíveis */}
                        {(dossier.company.enriched_neighborhood || dossier.company.enriched_city || dossier.company.enriched_state) && (
                          <p className="text-sm text-gray-600">
                            {dossier.company.enriched_neighborhood && `${dossier.company.enriched_neighborhood} - `}
                            {dossier.company.enriched_city}/{dossier.company.enriched_state}
                          </p>
                        )}
                        {dossier.company.enriched_postal_code && (
                          <p className="text-sm text-gray-600">
                            CEP: {dossier.company.enriched_postal_code}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-xs text-green-600 font-medium">
                            Endereço verificado via ViaCEP
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
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
                  </>
                )}
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
                {dossier.company.contract_signed_at && (
                  <div className="md:col-span-2">
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <h3 className="text-sm font-medium text-green-900 mb-2">✅ Contrato Assinado</h3>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-green-800">
                            Assinado em {new Date(dossier.company.contract_signed_at).toLocaleDateString('pt-BR')} às {new Date(dossier.company.contract_signed_at).toLocaleTimeString('pt-BR')}
                          </p>
                        </div>
                        {dossier.company.contract_pdf_url && (
                          <a
                            href={`/api/companies/${dossier.company.id}/contract/download`}
                            download
                            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            📥 Download Contrato
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                <div className="md:col-span-2">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Applicant ID (Sumsub)</h3>
                  <p className="text-sm font-mono text-gray-600 break-all">{dossier.company.applicant_id || 'N/A'}</p>
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
                <div className="text-center py-12">
                  <div className="text-gray-400 text-5xl mb-4">👥</div>
                  <p className="text-gray-500">Nenhum UBO encontrado</p>
                  <p className="text-sm text-gray-400 mt-2">Execute a sincronização para buscar dados do Sumsub</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dossier.ubos.map((ubo, index) => (
                    <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-lg">{ubo.first_name} {ubo.middle_name ? ubo.middle_name + ' ' : ''}{ubo.last_name}</p>
                          {ubo.tin && <p className="text-sm text-gray-600">CPF: {ubo.tin}</p>}
                        </div>
                        {ubo.share_size && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">
                            {ubo.share_size}%
                          </span>
                        )}
                      </div>
                      {ubo.email && (
                        <p className="text-sm text-gray-600">📧 {ubo.email}</p>
                      )}
                      {ubo.phone && (
                        <p className="text-sm text-gray-600">📱 {ubo.phone}</p>
                      )}
                      {ubo.dob && (
                        <p className="text-sm text-gray-600">🎂 {new Date(ubo.dob + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                      )}
                      {ubo.nationality && (
                        <p className="text-sm text-gray-600">🌍 {ubo.nationality}</p>
                      )}
                      {ubo.address && (
                        <div className="mt-2 pt-2 border-t">
                          <p className="text-xs font-semibold text-gray-500 mb-1">🏠 Endereço:</p>
                          <p className="text-sm text-gray-600">{ubo.address}</p>
                          {ubo.city && ubo.state && (
                            <p className="text-sm text-gray-600">{ubo.city}, {ubo.state}</p>
                          )}
                          {ubo.postal_code && (
                            <p className="text-sm text-gray-600">CEP: {ubo.postal_code}</p>
                          )}
                          {ubo.country && (
                            <p className="text-sm text-gray-600">{ubo.country}</p>
                          )}
                        </div>
                      )}
                      {ubo.relation && (
                        <p className="text-sm text-gray-600 mt-1">💼 {ubo.relation}</p>
                      )}
                      {ubo.verification_status && (
                        <span className={`inline-block mt-2 px-2 py-1 text-xs rounded ${
                          ubo.verification_status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {ubo.verification_status}
                        </span>
                      )}
                      {ubo.applicant_id && (
                        <button
                          onClick={() => handleDownloadUBOReport(ubo.applicant_id, `${ubo.first_name}${ubo.middle_name ? '_' + ubo.middle_name : ''}_${ubo.last_name}`)}
                          className="mt-3 w-full px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                        >
                          📥 Report do UBO
                        </button>
                      )}
                      {ubo.applicant_id && uboDocuments[ubo.applicant_id] && uboDocuments[ubo.applicant_id].length > 0 && (
                        <div className="mt-3 border-t pt-3">
                          <p className="text-sm font-semibold mb-2">📄 Documentos ({uboDocuments[ubo.applicant_id].length})</p>
                          <div className="space-y-1">
                            {uboDocuments[ubo.applicant_id].map((doc: any, docIdx: number) => (
                              <button
                                key={docIdx}
                                onClick={() => handleDownloadDocument(doc.id, doc.inspection_id)}
                                className="text-xs text-blue-600 hover:underline block w-full text-left"
                              >
                                📥 {doc.type || 'Documento'}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Aba Documentos */}
          {activeTab === 'documentos' && (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-1">Documentos</h2>
                <p className="text-gray-600">{documents.length} documento(s) encontrado(s)</p>
              </div>
              
              {documents.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-5xl mb-4">📄</div>
                  <p className="text-gray-500">Nenhum documento encontrado</p>
                  <p className="text-sm text-gray-400 mt-2">Execute a sincronização para buscar documentos do Sumsub</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {documents.map((doc, index) => (
                    <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{getDocTypeLabel(doc.doc_type)}</p>
                          <p className="text-xs text-gray-500 mt-1">{doc.doc_set_type}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded ${getStatusBadge(doc.status)}`}>
                          {doc.status}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDownloadDocument(doc.image_id, doc.inspection_id)}
                        className="w-full mt-3 px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 transition-colors"
                      >
                        📥 Download
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Aba Localização */}
          {activeTab === 'localizacao' && (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-1">📍 Localização</h2>
                <p className="text-gray-600">Verificação geográfica do endereço da empresa</p>
              </div>
              
              <GoogleMapsSection companyId={id} />
            </div>
          )}

          {/* Aba Compliance */}
          {activeTab === 'compliance' && (
            <div className="p-6 space-y-8">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6">Certidões da Empresa (PJ)</h2>
                <CertificatesChecklist companyId={id} />
              </div>
              
              <hr className="border-gray-200" />
              
              <div>
                <UBOsCertificatesSection companyId={id} />
              </div>
            </div>
          )}

          {/* Aba Risco */}
          {activeTab === 'risco' && (
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Análise de Risco</h2>
              <p className="text-gray-600 mb-6">Avaliação de risco baseada em dados do Sumsub e análise manual</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gray-50 rounded-lg p-6 text-center">
                  <p className="text-sm text-gray-600 mb-2">Risk Score</p>
                  <p className="text-4xl font-bold text-gray-900">{dossier.risk_assessment.risk_score}</p>
                  <p className="text-sm text-gray-500 mt-1">de 100</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-6 text-center">
                  <p className="text-sm text-gray-600 mb-2">Risk Level</p>
                  <span className={`inline-block px-4 py-2 text-lg font-bold rounded-full ${getRiskLevelColor(dossier.risk_assessment.risk_level)}`}>
                    {getRiskLevelText(dossier.risk_assessment.risk_level)}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-lg p-6 text-center">
                  <p className="text-sm text-gray-600 mb-2">Override Manual</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {dossier.risk_assessment.manual_risk_override ? '✅ Sim' : '❌ Não'}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Fatores de Risco</h3>
                {dossier.risk_assessment.risk_factors && dossier.risk_assessment.risk_factors.length > 0 ? (
                  <div className="space-y-2">
                    {dossier.risk_assessment.risk_factors.map((factor: any, index: number) => (
                      <div key={index} className="border-l-4 border-yellow-500 bg-yellow-50 p-3 rounded">
                        <p className="font-medium text-gray-900">{factor.description || factor.type}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Peso: {factor.weight} | Valor: {factor.value}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">Nenhum fator de risco identificado</p>
                )}
              </div>

              {dossier.risk_assessment.officer_notes && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Notas do Compliance Officer</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700">{dossier.risk_assessment.officer_notes}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Aba Blockchain */}
          {activeTab === 'blockchain' && (
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Blockchain & Wallet</h2>
              <p className="text-gray-600 mb-6">Informações sobre wallet e whitelist</p>
              
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Endereço da Wallet</h3>
                  <p className="text-lg font-mono text-gray-900 break-all">
                    {dossier.blockchain.wallet_address || (
                      <span className="text-gray-400 font-sans">Não cadastrado</span>
                    )}
                  </p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Status Whitelist</h3>
                  <span className={`inline-block px-4 py-2 rounded-full ${
                    dossier.blockchain.whitelist_status === 'approved' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {dossier.blockchain.whitelist_status || 'pending'}
                  </span>
                </div>

                {dossier.blockchain.wallet_term_pdf_path && (
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-sm font-medium text-gray-500 mb-3">Termo de Aceite de Wallet</h3>
                    <div className="space-y-2 mb-4">
                      {dossier.blockchain.wallet_registered_at && (
                        <p className="text-sm text-gray-600">
                          <strong>Data de Cadastro:</strong>{' '}
                          {new Date(dossier.blockchain.wallet_registered_at).toLocaleString('pt-BR', {
                            dateStyle: 'long',
                            timeStyle: 'short',
                          })}
                        </p>
                      )}
                      {dossier.blockchain.wallet_ip && (
                        <p className="text-sm text-gray-600">
                          <strong>IP:</strong> {dossier.blockchain.wallet_ip}
                        </p>
                      )}
                    </div>
                    <a
                      href={`/api/companies/${dossier.company.id}/wallet-term/download`}
                      download
                      className="inline-block px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      📝 Download Termo de Wallet
                    </a>
                  </div>
                )}

                {dossier.blockchain.whitelist_pdf_url && (
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-sm font-medium text-gray-500 mb-3">Screening Chainalysis</h3>
                    <a
                      href={dossier.blockchain.whitelist_pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      📅 Download PDF Screening
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Aba Notas */}
          {activeTab === 'notas' && (
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Notas & Compliance</h2>
              <p className="text-gray-600 mb-6">{dossier.notes.length} nota(s) registrada(s)</p>
              
              <div className="mb-6 bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Adicionar Nova Nota</h3>
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Digite sua nota aqui..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                />
                <button
                  onClick={() => {
                    // TODO: Implementar salvamento de nota
                    alert('Funcionalidade em desenvolvimento');
                  }}
                  disabled={!newNote.trim() || addingNote}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {addingNote ? 'Salvando...' : '💾 Salvar Nota'}
                </button>
              </div>

              {dossier.notes.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-5xl mb-4">📝</div>
                  <p className="text-gray-500">Nenhuma nota registrada</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {dossier.notes.map((note: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4 bg-white">
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-medium text-gray-900">{note.author || 'Compliance Officer'}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(note.created_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <p className="text-gray-700">{note.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Aba Auditoria */}
          {activeTab === 'auditoria' && (
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Log de Auditoria</h2>
              <p className="text-gray-600 mb-6">{dossier.audit_logs.length} evento(s) registrado(s)</p>
              
              {dossier.audit_logs.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-5xl mb-4">📊</div>
                  <p className="text-gray-500">Nenhum evento de auditoria registrado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dossier.audit_logs.map((log: any, index: number) => (
                    <div key={index} className="border-l-4 border-blue-500 bg-gray-50 p-4 rounded">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{log.action}</p>
                          <p className="text-sm text-gray-600 mt-1">{log.description}</p>
                          {log.user_email && (
                            <p className="text-xs text-gray-500 mt-1">Por: {log.user_email}</p>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 whitespace-nowrap ml-4">
                          {new Date(log.created_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
// Build trigger
