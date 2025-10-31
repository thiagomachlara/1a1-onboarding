'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

function SuccessContent() {
  const searchParams = useSearchParams();
  const [verificationType, setVerificationType] = useState<'individual' | 'company'>('individual');
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    // Tentar ler do parâmetro URL primeiro
    const typeParam = searchParams.get('type');
    if (typeParam === 'company' || typeParam === 'individual') {
      setVerificationType(typeParam as 'individual' | 'company');
      return;
    }
    
    // Se não tiver no URL, ler do localStorage
    if (typeof window !== 'undefined') {
      const storedType = localStorage.getItem('verificationType');
      if (storedType === 'company' || storedType === 'individual') {
        setVerificationType(storedType as 'individual' | 'company');
      }
    }
  }, [searchParams]);

  useEffect(() => {
    // Countdown para redirecionamento automático
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      // Redirecionar para o site principal após countdown
      window.location.href = 'https://1a1cripto.com';
    }
  }, [countdown]);

  const typeLabel = verificationType === 'individual' ? 'Pessoa Física' : 'Pessoa Jurídica';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-center">
            <Image
              src="/1a1-logo.png"
              alt="1A1 Cripto"
              width={200}
              height={60}
              priority
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center">
          {/* Success Icon */}
          <div className="mb-6">
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-12 h-12 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          {/* Success Message */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Verificação Enviada com Sucesso!
          </h1>
          
          <p className="text-lg text-gray-600 mb-2">
            Seu cadastro de <span className="font-semibold">{typeLabel}</span> foi recebido.
          </p>
          
          <p className="text-base text-gray-500 mb-8">
            Nossa equipe irá analisar seus documentos em até 24 horas úteis.
          </p>

          {/* Status Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8 text-left">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">
              Próximos passos:
            </h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start">
                <svg
                  className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>
                  <strong>Análise de documentos:</strong> Nossa equipe de compliance verificará todos os documentos enviados
                </span>
              </li>
              <li className="flex items-start">
                <svg
                  className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>
                  <strong>Notificação por e-mail:</strong> Você receberá um e-mail assim que a análise for concluída
                </span>
              </li>
              <li className="flex items-start">
                <svg
                  className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>
                  <strong>Aprovação:</strong> Após aprovação, você poderá começar a negociar USDT imediatamente
                </span>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Precisa de ajuda?
            </h3>
            <div className="flex flex-col sm:flex-row gap-2 justify-center items-center text-sm">
              <a
                href="mailto:thiago.lara@1a1cripto.com"
                className="text-yellow-600 hover:text-yellow-700 font-semibold"
              >
                thiago.lara@1a1cripto.com
              </a>
              <span className="hidden sm:inline text-gray-400">|</span>
              <a
                href="mailto:compliance@1a1cripto.com"
                className="text-yellow-600 hover:text-yellow-700 font-semibold"
              >
                compliance@1a1cripto.com
              </a>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <a
              href="https://1a1cripto.com"
              className="block w-full px-8 py-3 bg-yellow-400 text-gray-900 rounded-lg font-semibold hover:bg-yellow-500 transition-colors"
            >
              Voltar para o site principal
            </a>
            
            <p className="text-sm text-gray-500">
              Redirecionando automaticamente em {countdown} segundos...
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}

