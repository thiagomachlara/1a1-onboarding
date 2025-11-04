'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import dynamic from 'next/dynamic';

const SumsubWebSDK = dynamic(() => import('@/components/SumsubWebSDK'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
    </div>
  ),
});

function RefreshContent() {
  const searchParams = useSearchParams();
  const applicantId = searchParams.get('applicantId');

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!applicantId) {
      setError('Link inválido. Por favor, use o link enviado via WhatsApp.');
      setIsLoading(false);
      return;
    }

    initializeRefresh();
  }, [applicantId]);

  const initializeRefresh = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('[Refresh] Buscando dados do applicant:', applicantId);

      // Buscar dados do applicant
      const applicantResponse = await fetch(`/api/kyb/applicants?applicantId=${applicantId}`);
      
      if (!applicantResponse.ok) {
        throw new Error('Applicant não encontrado');
      }

      const applicantData = await applicantResponse.json();
      const applicant = applicantData.applicants?.[0];

      if (!applicant) {
        throw new Error('Applicant não encontrado');
      }

      setCompanyName(applicant.company_name);
      setUserId(applicant.external_user_id);

      console.log('[Refresh] Gerando access token para Sumsub...');

      // Gerar access token do Sumsub
      const tokenResponse = await fetch('/api/sumsub/access-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: applicant.external_user_id,
          levelName: 'kyb-onboarding-completo',
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(errorData.error || 'Falha ao gerar token de acesso');
      }

      const tokenData = await tokenResponse.json();
      setAccessToken(tokenData.token);
      setIsLoading(false);

      console.log('[Refresh] Inicialização completa!');
    } catch (err: any) {
      console.error('[Refresh] Erro:', err);
      setError(err.message || 'Erro ao inicializar atualização de KYC');
      setIsLoading(false);
    }
  };

  if (error) {
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
                Voltar para Início
              </a>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Erro</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <a
              href="/"
              className="inline-block bg-yellow-400 hover:bg-yellow-500 text-gray-900 px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Voltar para Início
            </a>
          </div>
        </main>
      </div>
    );
  }

  if (isLoading) {
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
                Voltar para Início
              </a>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-yellow-400 mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">Carregando...</p>
          </div>
        </main>
      </div>
    );
  }

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
              Voltar para Início
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Info Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 mb-8">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center text-2xl">
              🔄
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Atualização de KYC
              </h1>
              {companyName && (
                <p className="text-xl text-gray-600 mb-4">{companyName}</p>
              )}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-gray-700 mb-2">
                  ✅ Seus documentos já aprovados <strong>não precisam ser reenviados</strong>
                </p>
                <p className="text-gray-700">
                  📝 Você só precisa <strong>preencher o questionário atualizado</strong>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sumsub SDK */}
        {accessToken && userId && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <SumsubWebSDK
              accessToken={accessToken}
              expirationHandler={async () => {
                // Renovar token quando expirar
                const response = await fetch('/api/sumsub/access-token', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    userId: userId,
                    levelName: 'kyb-onboarding-completo',
                  }),
                });
                const data = await response.json();
                return data.token;
              }}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default function RefreshPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-yellow-400"></div>
      </div>
    }>
      <RefreshContent />
    </Suspense>
  );
}
