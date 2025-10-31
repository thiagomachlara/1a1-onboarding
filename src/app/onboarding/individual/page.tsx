'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { 
  validateCPF, 
  maskCPF, 
  generateUserIdFromCPF,
  removeNonNumeric 
} from '@/lib/document-validator';

// Carregar componente SumsubWebSDK dinamicamente (client-side only)
const SumsubWebSDK = dynamic(() => import('@/components/SumsubWebSDK'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
    </div>
  ),
});

export default function IndividualVerification() {
  const router = useRouter();
  
  // Estados do formulário de CPF
  const [cpf, setCpf] = useState('');
  const [cpfError, setCpfError] = useState('');
  const [showSDK, setShowSDK] = useState(false);
  
  // Estados do SDK
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const masked = maskCPF(value);
    setCpf(masked);
    setCpfError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar CPF
    if (!validateCPF(cpf)) {
      setCpfError('CPF inválido. Por favor, verifique o número digitado.');
      return;
    }
    
    // Iniciar verificação
    await initializeVerification();
  };

  const initializeVerification = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('[DEBUG] Iniciando verificação de pessoa física...');
      
      // Gerar userId baseado no CPF
      const newUserId = generateUserIdFromCPF(cpf);
      console.log('[DEBUG] UserId gerado:', newUserId);
      setUserId(newUserId);

      console.log('[DEBUG] Chamando API /api/sumsub/access-token...');
      
      // Solicitar access token da API
      const response = await fetch('/api/sumsub/access-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: newUserId,
          levelName: 'basic-kyc-level', // Level configurado no Sumsub para pessoas físicas
          ttlInSecs: 600, // Token válido por 10 minutos
        }),
      });

      console.log('[DEBUG] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[DEBUG] Error response:', errorText);
        throw new Error('Falha ao obter token de acesso');
      }

      const data = await response.json();
      console.log('[DEBUG] Token recebido:', data.token ? 'SIM' : 'NÃO');
      
      // Salvar tipo no localStorage para usar na página de sucesso
      if (typeof window !== 'undefined') {
        localStorage.setItem('verificationType', 'individual');
      }
      
      setAccessToken(data.token);
      setShowSDK(true);
      setIsLoading(false);
    } catch (err) {
      console.error('[DEBUG] Exception caught:', err);
      setError('Erro ao inicializar verificação. Por favor, tente novamente.');
      setIsLoading(false);
    }
  };

  const handleTokenExpiration = async (): Promise<string> => {
    try {
      console.log('[DEBUG] Renovando token...');
      const response = await fetch('/api/sumsub/access-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          levelName: 'basic-kyc-level',
          ttlInSecs: 600,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();
      console.log('[DEBUG] Token renovado com sucesso');
      return data.token;
    } catch (err) {
      console.error('[DEBUG] Error refreshing token:', err);
      throw err;
    }
  };

  const handleComplete = (data: any) => {
    console.log('[DEBUG] Verification completed:', data);
    // Redirecionar para página de sucesso
    router.push('/onboarding/success?type=individual');
  };

  const handleError = (error: any) => {
    console.error('[DEBUG] Verification error:', error);
    setError('Ocorreu um erro durante a verificação. Por favor, tente novamente.');
  };

  const handleBack = () => {
    setShowSDK(false);
    setAccessToken(null);
    setUserId(null);
    setError(null);
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
            Verificação de Pessoa Física
          </h1>
          <p className="text-gray-600">
            Complete o processo de verificação para começar a negociar USDT
          </p>
        </div>

        {/* Formulário de CPF ou SDK */}
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          {!showSDK ? (
            // Formulário de CPF
            <div className="max-w-md mx-auto">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
                  <svg
                    className="w-8 h-8 text-yellow-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Informe seu CPF
                </h2>
                <p className="text-gray-600">
                  Digite seu CPF para iniciar o processo de verificação
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="cpf" className="block text-sm font-medium text-gray-700 mb-2">
                    CPF
                  </label>
                  <input
                    type="text"
                    id="cpf"
                    value={cpf}
                    onChange={handleCpfChange}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all ${
                      cpfError ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isLoading}
                  />
                  {cpfError && (
                    <p className="mt-2 text-sm text-red-600">{cpfError}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading || cpf.length < 14}
                  className="w-full py-3 px-6 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Carregando...
                    </span>
                  ) : (
                    'Iniciar Verificação'
                  )}
                </button>
              </form>

              {/* Info sobre privacidade */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start">
                  <svg
                    className="w-5 h-5 text-gray-600 mt-0.5 mr-3 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-1">
                      Seus dados estão seguros
                    </h4>
                    <p className="text-xs text-gray-600">
                      Utilizamos seu CPF apenas para identificação única no sistema. 
                      Todas as informações são criptografadas e protegidas conforme a LGPD.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // SDK do Sumsub
            <>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center mb-6">
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
                    onClick={handleBack}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Voltar
                  </button>
                </div>
              )}

              {!error && accessToken && (
                <>
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center text-sm text-gray-600">
                      <svg
                        className="w-5 h-5 mr-2 text-green-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>CPF: {cpf}</span>
                    </div>
                    <button
                      onClick={handleBack}
                      className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      ← Alterar CPF
                    </button>
                  </div>
                  
                  <SumsubWebSDK
                    accessToken={accessToken}
                    expirationHandler={handleTokenExpiration}
                    onComplete={handleComplete}
                    onError={handleError}
                  />
                </>
              )}
            </>
          )}
        </div>

        {/* Info Box */}
        {!showSDK && (
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
                  <li>• Documento de identidade com foto (RG, CNH ou RNE)</li>
                  <li>• CPF</li>
                  <li>• Comprovante de residência (máximo 90 dias)</li>
                  <li>• Verificação facial ao vivo (liveness)</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

