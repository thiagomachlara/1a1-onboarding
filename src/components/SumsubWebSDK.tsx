'use client';

import { useEffect, useRef, useState } from 'react';

interface SumsubWebSDKProps {
  accessToken: string;
  expirationHandler: () => Promise<string>;
  onComplete?: (data: any) => void;
  onError?: (error: any) => void;
}

declare global {
  interface Window {
    snsWebSdk: any;
  }
}

export default function SumsubWebSDK({
  accessToken,
  expirationHandler,
  onComplete,
  onError,
}: SumsubWebSDKProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let snsWebSdkInstance: any = null;

    const loadSumsubSDK = () => {
      // Verificar se o script já foi carregado
      if (window.snsWebSdk) {
        initializeSdk();
        return;
      }

      // Carregar script do Sumsub
      const script = document.createElement('script');
      script.src = 'https://static.sumsub.com/idensic/static/sns-websdk-builder.js';
      script.async = true;
      script.onload = () => {
        initializeSdk();
      };
      script.onerror = () => {
        setError('Falha ao carregar o SDK de verificação');
        setIsLoading(false);
      };
      document.body.appendChild(script);
    };

    const initializeSdk = () => {
      if (!containerRef.current || !window.snsWebSdk) return;

      try {
        snsWebSdkInstance = window.snsWebSdk
          .init(accessToken, expirationHandler)
          .withConf({
            lang: 'pt-BR',
            theme: 'light',
            i18n: {
              document: {
                subTitles: {
                  IDENTITY: 'Documento de Identidade',
                },
              },
            },
          })
          .withOptions({
            addViewportTag: false,
            adaptIframeHeight: true,
          })
          .on('idCheck.onStepCompleted', (payload: any) => {
            console.log('Step completed:', payload);
          })
          .on('idCheck.onError', (error: any) => {
            console.error('Sumsub error:', error);
            setError('Erro durante a verificação');
            if (onError) onError(error);
          })
          .on('idCheck.applicantStatus', (payload: any) => {
            console.log('Applicant status:', payload);
          })
          .on('idCheck.onApplicantSubmitted', (payload: any) => {
            console.log('Applicant submitted:', payload);
            if (onComplete) onComplete(payload);
          })
          .build();

        snsWebSdkInstance.launch(containerRef.current);
        setIsLoading(false);
      } catch (err) {
        console.error('Error initializing Sumsub SDK:', err);
        setError('Erro ao inicializar verificação');
        setIsLoading(false);
      }
    };

    loadSumsubSDK();

    // Cleanup
    return () => {
      if (snsWebSdkInstance) {
        try {
          snsWebSdkInstance.destroy();
        } catch (err) {
          console.error('Error destroying SDK:', err);
        }
      }
    };
  }, [accessToken, expirationHandler, onComplete, onError]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <div className="text-red-600 mb-2">
          <svg
            className="w-12 h-12 mx-auto mb-4"
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
          <h3 className="text-lg font-semibold mb-2">Erro na Verificação</h3>
          <p className="text-sm">{error}</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando verificação...</p>
          </div>
        </div>
      )}
      <div ref={containerRef} id="sumsub-websdk-container" />
    </div>
  );
}

