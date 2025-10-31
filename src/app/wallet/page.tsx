'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function WalletPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applicant, setApplicant] = useState<any>(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Token não fornecido');
      setLoading(false);
      return;
    }

    // Validar token e buscar dados do applicant
    fetch(`/api/wallet/validate?token=${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.valid) {
          setApplicant(data.applicant);
        } else {
          setError(data.error || 'Token inválido');
        }
      })
      .catch(err => {
        setError('Erro ao validar token');
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const validateTRC20Address = (address: string): boolean => {
    // Endereço TRC-20 começa com 'T' e tem 34 caracteres
    const trc20Regex = /^T[A-Za-z1-9]{33}$/;
    return trc20Regex.test(address);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agreed) {
      alert('Você precisa concordar com os termos');
      return;
    }

    if (!validateTRC20Address(walletAddress)) {
      setError('Endereço de wallet TRC-20 inválido. Deve começar com "T" e ter 34 caracteres.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/wallet/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, walletAddress }),
      });

      const data = await response.json();

      if (data.success) {
        // Redirecionar para página de sucesso
        router.push('/wallet/success');
      } else {
        setError(data.error || 'Erro ao cadastrar wallet');
        setSubmitting(false);
      }
    } catch (err) {
      setError('Erro ao cadastrar wallet');
      setSubmitting(false);
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error && !applicant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Erro</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <a
            href="/"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Voltar ao Início
          </a>
        </div>
      </div>
    );
  }

  const tipoCliente = applicant.applicant_type === 'individual' ? 'Pessoa Física' : 'Pessoa Jurídica';

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="text-center mb-6">
            <div className="text-5xl mb-4">💼</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Cadastro de Wallet USDT
            </h1>
            <p className="text-gray-600">Rede TRC-20 (TRON)</p>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    <strong>Importante:</strong> Esta wallet será usada para receber USDT. 
                    Certifique-se de que é um endereço TRC-20 (TRON) válido e de sua propriedade.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-600">Tipo</p>
                <p className="font-medium text-gray-900">{tipoCliente}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Nome / Razão Social</p>
                <p className="font-medium text-gray-900">
                  {applicant.company_name || applicant.full_name || 'Não informado'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Endereço da Wallet</h2>

          <div className="mb-6">
            <label htmlFor="wallet" className="block text-sm font-medium text-gray-700 mb-2">
              Endereço TRC-20 (TRON) *
            </label>
            <input
              type="text"
              id="wallet"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value.trim())}
              placeholder="T1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              required
            />
            <p className="mt-2 text-xs text-gray-500">
              O endereço deve começar com "T" e ter 34 caracteres
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="mb-6 bg-gray-50 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Termo de Cadastro de Wallet</h3>
            <div className="text-sm text-gray-700 space-y-2 max-h-48 overflow-y-auto">
              <p><strong>DECLARAÇÕES E RESPONSABILIDADES:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Declaro ser o único proprietário da wallet cadastrada</li>
                <li>Declaro que a wallet não está associada a atividades ilícitas</li>
                <li>Estou ciente que a wallet será submetida a análise KYT (Know Your Transaction)</li>
                <li>Compreendo que transações para endereços incorretos são irreversíveis</li>
                <li>Autorizo a 1A1 a realizar verificações de compliance via Chainalysis</li>
              </ul>
            </div>
          </div>

          <div className="mb-6">
            <label className="flex items-start">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-3 text-sm text-gray-700">
                Li e concordo com o Termo de Cadastro de Wallet. Declaro que sou o proprietário 
                da wallet informada e que ela não está associada a atividades ilícitas.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={!agreed || !walletAddress || submitting}
            className={`w-full py-3 px-6 rounded-lg font-medium transition ${
              agreed && walletAddress && !submitting
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {submitting ? 'Cadastrando...' : '💼 Cadastrar Wallet'}
          </button>

          <p className="text-xs text-gray-500 mt-4 text-center">
            Após o cadastro, sua wallet será submetida a análise de compliance (KYT) 
            via Chainalysis antes da aprovação final.
          </p>
        </form>

        {/* Informações adicionais */}
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Atenção:</strong> Transações em blockchain são irreversíveis. 
                Verifique cuidadosamente o endereço antes de cadastrar. A 1A1 não se 
                responsabiliza por valores enviados para endereços incorretos.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WalletPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    }>
      <WalletPageContent />
    </Suspense>
  );
}

