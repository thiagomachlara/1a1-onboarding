'use client';

import { useState } from 'react';
// Removed IconMark import

export default function ScreeningPage() {
  const [walletAddress, setWalletAddress] = useState('');
  const [memo, setMemo] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch(`/api/screening?wallet=${encodeURIComponent(walletAddress)}&memo=${encodeURIComponent(memo)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao fazer screening');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (risk?: string) => {
    switch (risk) {
      case 'Low': return 'text-green-600';
      case 'Medium': return 'text-yellow-600';
      case 'High': return 'text-orange-600';
      case 'Severe': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getDecisionColor = (decision?: string) => {
    switch (decision) {
      case 'APPROVED': return 'bg-green-100 text-green-800 border-green-300';
      case 'MANUAL_REVIEW': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'REJECTED': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getDecisionIcon = (decision?: string) => {
    switch (decision) {
      case 'APPROVED': return '✅';
      case 'MANUAL_REVIEW': return '⚠️';
      case 'REJECTED': return '❌';
      default: return '🔍';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white text-2xl font-bold">
              🔍
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Wallet Screening
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Análise de risco de carteiras blockchain via Chainalysis
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Wallet Address */}
            <div>
              <label htmlFor="wallet" className="block text-sm font-semibold text-gray-700 mb-2">
                Endereço da Wallet (TRC-20)
              </label>
              <input
                type="text"
                id="wallet"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="TXRUVnwEZbtRvfZ7DVd1KmrG2RDxjCUU4y"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                required
                disabled={loading}
              />
              <p className="mt-2 text-xs text-gray-500">
                Digite o endereço TRC-20 (TRON) que deseja analisar
              </p>
            </div>

            {/* Memo */}
            <div>
              <label htmlFor="memo" className="block text-sm font-semibold text-gray-700 mb-2">
                Nome / Identificação
              </label>
              <input
                type="text"
                id="memo"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="Ex: GS Pay, João Silva, Empresa XYZ"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={loading}
              />
              <p className="mt-2 text-xs text-gray-500">
                Este nome aparecerá no painel Chainalysis para identificação
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analisando...
                </>
              ) : (
                <>
                  🔍 Screen Address
                </>
              )}
            </button>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="flex items-start gap-3">
              <span className="text-2xl">❌</span>
              <div>
                <h3 className="font-semibold text-red-900 mb-1">Erro no Screening</h3>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Result Card */}
        {result && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
              <h2 className="text-xl font-bold text-white mb-2">
                Resultado do Screening
              </h2>
              <p className="text-blue-100 text-sm font-mono break-all">
                {result.address}
              </p>
            </div>

            {/* Content */}
            <div className="p-8 space-y-6">
              {/* Decision Badge */}
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 font-semibold ${getDecisionColor(result.decision)}`}>
                <span className="text-2xl">{getDecisionIcon(result.decision)}</span>
                <span>{result.decision === 'APPROVED' ? 'APROVADA' : result.decision === 'MANUAL_REVIEW' ? 'REVISÃO MANUAL' : 'REJEITADA'}</span>
              </div>

              {/* Risk Level */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Nível de Risco</p>
                  <p className={`text-2xl font-bold ${getRiskColor(result.riskLevel)}`}>
                    {result.riskLevel === 'Low' ? '🟢 Baixo' : 
                     result.riskLevel === 'Medium' ? '🟡 Médio' : 
                     result.riskLevel === 'High' ? '🔴 Alto' : 
                     result.riskLevel === 'Severe' ? '🔴 Severo' : result.riskLevel}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Tipo de Endereço</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {result.addressType || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Decision Reason */}
              {result.decisionReason && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-blue-900 mb-1">Razão da Decisão</p>
                  <p className="text-sm text-blue-800">{result.decisionReason}</p>
                </div>
              )}

              {/* Exposures */}
              {result.exposures && result.exposures.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Exposições Detectadas ({result.exposures.length})
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-gray-300">
                        <tr>
                          <th className="text-left py-2 font-semibold text-gray-700">Categoria</th>
                          <th className="text-right py-2 font-semibold text-gray-700">Valor (USD)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {result.exposures.map((exp: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-100">
                            <td className="py-2 text-gray-900">{exp.category}</td>
                            <td className="py-2 text-right font-mono text-gray-900">
                              ${exp.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* PDF Link */}
              {result.pdfUrl && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-green-900 mb-1">📄 Relatório PDF Gerado</p>
                      <p className="text-xs text-green-700">Relatório completo com todos os detalhes do screening</p>
                    </div>
                    <a
                      href={result.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                    >
                      Baixar PDF
                    </a>
                  </div>
                </div>
              )}

              {/* WhatsApp Notification */}
              {result.notificationSent && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">📱</span>
                    <p className="text-sm font-semibold text-blue-900">
                      Notificação enviada para o grupo WhatsApp
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

