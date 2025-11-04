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
  const token = searchParams.get('token');

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setError('Token não fornecido. Por favor, use o link enviado por email.');
      setIsLoading(false);
      return;
    }

    initializeRefresh();
  }, [token]);

  const initializeRefresh = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('[Refresh] Validando token...');

      const response = await fetch('/api/sumsub/access-token-from-jwt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao validar token');
      }

      const data = await response.json();
      
      setAccessToken(data.token);
      setUserId(data.userId);
      setCompanyName(data.companyName);
      setIsLoading(false);

    } catch (err: any) {
      console.error('[Refresh] Erro:', err);
      setError(err.message || 'Erro ao inicializar atualização de KYC');
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-4">Erro</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <a
            href="/"
            className="inline-block bg-yellow-400 text-black px-6 py-3 rounded-lg font-semibold hover:bg-yellow-500 transition"
          >
            Voltar para Início
          </a>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-white text-lg">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <header className="border-b border-gray-700 bg-black/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <Image
            src="/logo.png"
            alt="1A1 Cripto"
            width={120}
            height={40}
            className="h-10 w-auto"
          />
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 mb-8">
            <div className="flex items-start space-x-4">
              <div className="text-yellow-400 text-4xl">🔄</div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-white mb-2">
                  Atualização de KYC
                </h1>
                {companyName && (
                  <p className="text-xl text-gray-300 mb-4">{companyName}</p>
                )}
                <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4">
                  <p className="text-gray-200 mb-2">
                    ✅ Seus documentos já aprovados <strong>não precisam ser reenviados</strong>
                  </p>
                  <p className="text-gray-200">
                    📝 Você só precisa <strong>preencher o questionário atualizado</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {accessToken && userId && (
            <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
              <SumsubWebSDK
                accessToken={accessToken}
                userId={userId}
                levelName="kyb-onboarding-completo"
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function RefreshPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-yellow-400"></div>
      </div>
    }>
      <RefreshContent />
    </Suspense>
  );
}
