'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import dynamic from 'next/dynamic';

// Carregar componente SumsubWebSDK dinamicamente (client-side only)
const SumsubWebSDK = dynamic(() => import('@/components/SumsubWebSDK'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
    </div>
  ),
});

export default function CompanyVerification() {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeVerification();
  }, []);

  const initializeVerification = async () => {
    try {
      // Gerar um userId único para a empresa
      const newUserId = `company_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      setUserId(newUserId);

      // Solicitar access token da API
      const response = await fetch('/api/sumsub/access-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: newUserId,
          levelName: 'full-kyb', // Level configurado no Sumsub para empresas
          ttlInSecs: 600, // Token válido por 10 minutos
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao obter token de acesso');
      }

      const data = await response.json();
      setAccessToken(data.token);
      setIsLoading(false);
    } catch (err) {
      console.error('Error initializing verification:', err);
      setError('Erro ao inicializar verificação. Por favor, tente novamente.');
      setIsLoading(false);
    }
  };

  const handleTokenExpiration = async (): Promise<string> => {
    try {
      const response = await fetch('/api/sumsub/access-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          levelName: 'full-kyb',
          ttlInSecs: 600,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();
      return data.token;
    } catch (err) {
      console.error('Error refreshing token:', err);
      throw err;
    }
  };

  const handleComplete = (data: any) => {
    console.log('Verification completed:', data);
    // Redirecionar para página de sucesso
    router.push('/onboarding/success?type=company');
  };

  const handleError = (error: any) => {
    console.error('Verification error:', error);
    setError('Ocorreu um erro durante a verificação. Por favor, tente novamente.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Image
              src="/1a1-logo.png"
              alt="1A1 Cripto"
              width={200}
              height={60}
              priority
            />
            <a
              href="/"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← Voltar
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Verificação de Pessoa Jurídica
          </h1>
          <p className="text-gray-600">
            Complete o processo de verificação empresarial para começar a negociar USDT
          </p>
        </div>

        {/* Verification Container */}
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mb-4"></div>
              <p className="text-gray-600">Preparando verificação...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <svg
                className="w-12 h-12 text-red-600 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="text-lg font-semibold text-red-900 mb-2">
                Erro na Verificação
              </h3>
              <p className="text-sm text-red-700 mb-4">{error}</p>
              <button
                onClick={initializeVerification}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Tentar Novamente
              </button>
            </div>
          )}

          {!isLoading && !error && accessToken && (
            <SumsubWebSDK
              accessToken={accessToken}
              expirationHandler={handleTokenExpiration}
              onComplete={handleComplete}
              onError={handleError}
            />
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h4 className="text-sm font-semibold text-blue-900 mb-1">
                Documentos necessários
              </h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Contrato Social ou Estatuto Social</li>
                <li>• Cartão CNPJ atualizado</li>
                <li>• Quadro de Sócios e Administradores (QSA)</li>
                <li>• Comprovante de endereço da empresa</li>
                <li>• Documentos pessoais dos representantes legais</li>
                <li>• Procuração (se aplicável)</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

