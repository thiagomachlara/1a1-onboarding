'use client';

import { useState, useEffect } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import { createClient } from '@/lib/supabase/client';

interface Applicant {
  id: string;
  applicant_id: string;
  external_user_id: string;
  company_name: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  document_number: string | null;
  current_status: string;
  review_answer: string | null;
  approved_at: string | null;
  contract_signed_at: string | null;
  wallet_token: string | null;
  created_at: string;
}

export default function EmpresasPage() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [filteredApplicants, setFilteredApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'sem_contrato' | 'sem_wallet'>('all');
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [actionModal, setActionModal] = useState<'contract' | 'wallet' | 'refresh' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState<{ link?: string; error?: string } | null>(null);

  useEffect(() => {
    loadApplicants();
  }, []);

  useEffect(() => {
    filterApplicants();
  }, [applicants, searchTerm, filter]);

  const loadApplicants = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error } = await supabase
        .from('applicants')
        .select('*')
        .eq('applicant_type', 'company')
        .in('current_status', ['approved'])
        .order('approved_at', { ascending: false });

      if (error) throw error;

      setApplicants(data || []);
    } catch (error) {
      console.error('Error loading applicants:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterApplicants = () => {
    let filtered = applicants;

    // Aplicar filtro
    if (filter === 'sem_contrato') {
      filtered = filtered.filter((a) => !a.contract_signed_at);
    } else if (filter === 'sem_wallet') {
      filtered = filtered.filter((a) => !a.wallet_token);
    }

    // Aplicar busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.company_name?.toLowerCase().includes(term) ||
          a.document_number?.includes(term) ||
          a.email?.toLowerCase().includes(term)
      );
    }

    setFilteredApplicants(filtered);
  };

  const handleAction = async (action: 'contract' | 'wallet' | 'refresh', applicant: Applicant) => {
    setSelectedApplicant(applicant);
    setActionModal(action);
    setActionResult(null);
    setActionLoading(true);

    try {
      let endpoint = '';
      let body = {};

      if (action === 'contract') {
        endpoint = '/api/contract/resend';
        body = { applicantId: applicant.id };
      } else if (action === 'wallet') {
        endpoint = '/api/wallet/resend';
        body = { applicantId: applicant.id };
      } else if (action === 'refresh') {
        endpoint = '/api/kyb/refresh';
        body = { applicantId: applicant.applicant_id };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao executar ação');
      }

      setActionResult({ link: data.contractLink || data.walletLink || data.link });
    } catch (error: any) {
      setActionResult({ error: error.message });
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Link copiado para a área de transferência!');
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getDaysSinceApproval = (approvedAt: string | null) => {
    if (!approvedAt) return 0;
    const days = Math.floor((Date.now() - new Date(approvedAt).getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Empresas Aprovadas</h1>
          <p className="text-gray-600 mt-2">
            Gerencie links de contrato, wallet e solicite refresh de KYC
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Total Aprovadas</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{applicants.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Sem Contrato</p>
            <p className="text-3xl font-bold text-yellow-600 mt-2">
              {applicants.filter((a) => !a.contract_signed_at).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Com Contrato</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {applicants.filter((a) => a.contract_signed_at).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Sem Wallet</p>
            <p className="text-3xl font-bold text-red-600 mt-2">
              {applicants.filter((a) => !a.wallet_token).length}
            </p>
          </div>
        </div>

        {/* Filtros e Busca */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Busca */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nome, CNPJ ou email..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none"
              />
            </div>

            {/* Filtro */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por
              </label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none"
              >
                <option value="all">Todas</option>
                <option value="sem_contrato">Sem Contrato</option>
                <option value="sem_wallet">Sem Wallet</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <p className="text-gray-600">Carregando...</p>
            </div>
          ) : filteredApplicants.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-600">Nenhuma empresa encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Empresa
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CNPJ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aprovado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contrato
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Wallet
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredApplicants.map((applicant) => (
                    <tr key={applicant.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {applicant.company_name || applicant.full_name}
                          </p>
                          <p className="text-sm text-gray-500">{applicant.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {applicant.document_number || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm text-gray-900">{formatDate(applicant.approved_at)}</p>
                          <p className="text-xs text-gray-500">
                            {getDaysSinceApproval(applicant.approved_at)} dias
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {applicant.contract_signed_at ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✓ Assinado
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            ✗ Não assinado
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {applicant.wallet_token ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✓ Cadastrada
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            ✗ Não cadastrada
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleAction('contract', applicant)}
                            className="text-yellow-600 hover:text-yellow-900 font-medium"
                          >
                            📝 Contrato
                          </button>
                          <button
                            onClick={() => handleAction('wallet', applicant)}
                            className="text-blue-600 hover:text-blue-900 font-medium"
                          >
                            💼 Wallet
                          </button>
                          <button
                            onClick={() => handleAction('refresh', applicant)}
                            className="text-green-600 hover:text-green-900 font-medium"
                          >
                            🔄 Refresh
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal de Ação */}
      {actionModal && selectedApplicant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {actionModal === 'contract' && '📝 Link de Contrato'}
              {actionModal === 'wallet' && '💼 Link de Wallet'}
              {actionModal === 'refresh' && '🔄 Solicitar Refresh'}
            </h3>

            <div className="mb-4">
              <p className="text-sm text-gray-600">Empresa:</p>
              <p className="text-sm font-medium text-gray-900">
                {selectedApplicant.company_name || selectedApplicant.full_name}
              </p>
            </div>

            {actionLoading ? (
              <div className="py-8 text-center">
                <p className="text-gray-600">Processando...</p>
              </div>
            ) : actionResult?.error ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
                <p className="text-sm text-red-800">{actionResult.error}</p>
              </div>
            ) : actionResult?.link ? (
              <div>
                <p className="text-sm text-gray-600 mb-2">Link gerado:</p>
                <div className="p-3 bg-gray-50 rounded-lg mb-4 break-all">
                  <p className="text-sm text-gray-900">{actionResult.link}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(actionResult.link!)}
                  className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold py-2 px-4 rounded-lg transition-colors mb-2"
                >
                  📋 Copiar Link
                </button>
              </div>
            ) : actionModal === 'refresh' && !actionLoading ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                <p className="text-sm text-green-800">
                  ✓ Refresh solicitado! Notificação enviada via WhatsApp.
                </p>
              </div>
            ) : null}

            <button
              onClick={() => {
                setActionModal(null);
                setSelectedApplicant(null);
                setActionResult(null);
              }}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
