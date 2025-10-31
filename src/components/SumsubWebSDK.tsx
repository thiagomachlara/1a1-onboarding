'use client';

import { useEffect, useRef, useState } from 'react';

interface SumsubWebSDKProps {
  accessToken: string;
  expirationHandler: () => Promise<string>;
  onComplete?: (data: any) => void;
  onError?: (error: any) => void;
  onDebug?: (msg: string) => void;
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
  onDebug,
}: SumsubWebSDKProps) {
  const debug = (msg: string) => {
    console.log(msg);
    if (onDebug) onDebug(msg);
  };
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    debug('[DEBUG SDK] Componente SumsubWebSDK montado');
    debug(`[DEBUG SDK] accessToken recebido: ${accessToken ? 'SIM' : 'NÃO'}`);
    debug(`[DEBUG SDK] accessToken length: ${accessToken?.length}`);
    
    let snsWebSdkInstance: any = null;

    const loadSumsubSDK = () => {
      debug('[DEBUG SDK] Iniciando carregamento do SDK...');
      // Verificar se o script já foi carregado
      if (window.snsWebSdk) {
        debug('[DEBUG SDK] SDK já carregado, inicializando...');
        initializeSdk();
        return;
      }

      debug('[DEBUG SDK] Carregando script do Sumsub...');
      // Carregar script do Sumsub
      const script = document.createElement('script');
      script.src = 'https://static.sumsub.com/idensic/static/sns-websdk-builder.js';
      script.async = true;
      script.onload = () => {
        debug('[DEBUG SDK] Script carregado com sucesso!');
        initializeSdk();
      };
      script.onerror = (err) => {
        debug(`[DEBUG SDK] Falha ao carregar script: ${err}`);
        setError('Falha ao carregar o SDK de verificação');
        setIsLoading(false);
      };
      document.body.appendChild(script);
    };

    const initializeSdk = () => {
      debug('[DEBUG SDK] initializeSdk chamado');
      debug(`[DEBUG SDK] containerRef.current: ${containerRef.current ? 'EXISTE' : 'NULL'}`);
      debug(`[DEBUG SDK] window.snsWebSdk: ${window.snsWebSdk ? 'EXISTE' : 'NULL'}`);
      
      if (!containerRef.current || !window.snsWebSdk) {
        debug('[DEBUG SDK] Container ou SDK não disponível');
        return;
      }

      try {
        debug('[DEBUG SDK] Inicializando SDK com token...');
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
          .withCustomCss(`
            .sumsub-widget {
              width: 100% !important;
              max-width: 900px !important;
              margin: 0 auto !important;
            }
            @media (max-width: 768px) {
              .sumsub-widget {
                max-width: 100% !important;
              }
            }
          `)
          .on('idCheck.onStepCompleted', (payload: any) => {
            debug(`[DEBUG SDK] Step completed: ${JSON.stringify(payload)}`);
          })
          .on('idCheck.onError', (error: any) => {
            debug(`[DEBUG SDK] Sumsub error: ${JSON.stringify(error)}`);
            setError('Erro durante a verificação');
            if (onError) onError(error);
          })
          .on('idCheck.applicantStatus', (payload: any) => {
            debug(`[DEBUG SDK] Applicant status: ${JSON.stringify(payload)}`);
          })
          .on('idCheck.onApplicantSubmitted', (payload: any) => {
            debug(`[DEBUG SDK] Applicant submitted: ${JSON.stringify(payload)}`);
            if (onComplete) onComplete(payload);
          })
          .build();

        debug('[DEBUG SDK] SDK construído, lançando no container...');
        snsWebSdkInstance.launch(containerRef.current);
        debug('[DEBUG SDK] SDK lançado com sucesso!');
        setIsLoading(false);
      } catch (err) {
        debug(`[DEBUG SDK] Error initializing Sumsub SDK: ${err}`);
        debug(`[DEBUG SDK] Error details: ${JSON.stringify(err, Object.getOwnPropertyNames(err))}`);
        setError('Erro ao inicializar verificação');
        setIsLoading(false);
      }
    };

    loadSumsubSDK();

    // Cleanup
    return () => {
      debug('[DEBUG SDK] Cleanup: desmontando componente');
      if (snsWebSdkInstance) {
        try {
          snsWebSdkInstance.destroy();
          debug('[DEBUG SDK] SDK destruído com sucesso');
        } catch (err) {
          debug(`[DEBUG SDK] Error destroying SDK: ${err}`);
        }
      }
    };
  }, [accessToken, expirationHandler, onComplete, onError, onDebug]);

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

