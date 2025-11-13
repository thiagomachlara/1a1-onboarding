'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function ContractPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applicant, setApplicant] = useState<any>(null);
  const [contractContent, setContractContent] = useState<string>('');
  const [agreed, setAgreed] = useState(false);
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Token não fornecido');
      setLoading(false);
      return;
    }

    // Buscar contrato renderizado do banco
    fetch(`/api/contract/render?token=${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setApplicant(data.applicant);
          setContractContent(data.contract);
        }
      })
      .catch(err => {
        setError('Erro ao carregar contrato');
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleSign = async () => {
    if (!agreed) {
      alert('Você precisa concordar com os termos do contrato');
      return;
    }

    setSigning(true);

    try {
      const response = await fetch('/api/contract/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (data.success) {
        router.push(`/wallet?token=${data.walletToken}`);
      } else {
        setError(data.error || 'Erro ao assinar contrato');
        setSigning(false);
      }
    } catch (err) {
      setError('Erro ao assinar contrato');
      setSigning(false);
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando contrato...</p>
        </div>
      </div>
    );
  }

  if (error) {
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

  const tipoCliente = applicant.type === 'individual' ? 'Pessoa Física' : 'Pessoa Jurídica';
  const docLabel = applicant.type === 'individual' ? 'CPF' : 'CNPJ';

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Cabeçalho Fixo com Dados do Contratante */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Contrato de Prestação de Serviços de Liquidez em USDT
            </h1>
            <p className="text-gray-600">1A1 Intermediação Ltda</p>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Dados do Contratante</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Tipo</p>
                <p className="font-medium text-gray-900">{tipoCliente}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">{docLabel}</p>
                <p className="font-medium text-gray-900">{applicant.document}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Nome / Razão Social</p>
                <p className="font-medium text-gray-900">{applicant.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium text-gray-900">{applicant.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contrato Renderizado do Banco */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="prose max-w-none">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Termos do Contrato</h2>
            
            <div className="bg-gray-50 rounded-lg p-6 max-h-[600px] overflow-y-auto border border-gray-200 text-sm text-gray-700 space-y-4">
              {/* Renderizar contrato do banco com formatação */}
              <div className="whitespace-pre-wrap">
                {contractContent.split('\n').map((line, index) => {
                  // Detectar títulos de cláusulas
                  if (line.match(/^CLÁUSULA \d+/)) {
                    return (
                      <h3 key={index} className="font-bold text-gray-900 mt-4 mb-2">
                        {line}
                      </h3>
                    );
                  }
                  // Detectar separadores
                  if (line.trim() === '---') {
                    return <hr key={index} className="my-4 border-gray-300" />;
                  }
                  // Linhas normais
                  if (line.trim()) {
                    return (
                      <p key={index} className="mb-2">
                        {line}
                      </p>
                    );
                  }
                  // Linhas vazias
                  return <br key={index} />;
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Checkbox de Concordância */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              Li e concordo com todos os termos e condições do Contrato de Prestação de Serviços de Liquidez em USDT. 
              Declaro que as informações fornecidas são verdadeiras e que os recursos utilizados têm origem lícita.
            </span>
          </label>
        </div>

        {/* Botão de Assinatura */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <button
            onClick={handleSign}
            disabled={!agreed || signing || applicant.isSigned}
            className={`w-full py-4 px-6 rounded-lg font-semibold text-lg transition ${
              !agreed || signing || applicant.isSigned
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {signing ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Assinando...
              </span>
            ) : applicant.isSigned ? (
              '✅ Contrato já assinado'
            ) : (
              '✍️ Assinar Contrato Eletronicamente'
            )}
          </button>

          {applicant.isSigned && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Contrato assinado em:</strong> {new Date(applicant.signedAt).toLocaleString('pt-BR')}
              </p>
              <p className="text-sm text-green-800">
                <strong>IP:</strong> {applicant.signedIp}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ContractPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    }>
      <ContractPageContent />
    </Suspense>
  );
}
