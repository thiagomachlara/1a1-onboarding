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
  const [agreed, setAgreed] = useState(false);
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Token não fornecido');
      setLoading(false);
      return;
    }

    // Validar token e buscar dados do applicant
    fetch(`/api/contract/validate?token=${token}`)
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
        // Redirecionar para página de wallet
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

  const tipoCliente = applicant.applicant_type === 'individual' ? 'Pessoa Física' : 'Pessoa Jurídica';
  const docLabel = applicant.applicant_type === 'individual' ? 'CPF' : 'CNPJ';

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Contrato de Prestação de Serviços
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
                <p className="font-medium text-gray-900">{applicant.document_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Nome / Razão Social</p>
                <p className="font-medium text-gray-900">
                  {applicant.company_name || applicant.full_name || 'Não informado'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium text-gray-900">{applicant.email || 'Não informado'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contrato */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="prose max-w-none">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Termos do Contrato</h2>
            
            <div className="bg-gray-50 rounded-lg p-6 max-h-96 overflow-y-auto border border-gray-200">
              <p className="text-sm text-gray-700 mb-4">
                <strong>CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE LIQUIDEZ EM USDT</strong>
              </p>
              
              <p className="text-sm text-gray-700 mb-4">
                Este contrato tem por objeto a prestação de serviços de liquidez em USDT (Tether) 
                pela 1A1 INTERMEDIAÇÃO LTDA ao CONTRATANTE, caracterizando-se como Liquidity as a Service (LaaS), 
                mediante intermediação de operações de compra e venda de USDT na rede TRC-20 (TRON).
              </p>

              <p className="text-sm text-gray-700 mb-4">
                A CONTRATADA atuará exclusivamente como intermediadora, não realizando custódia de valores 
                em moeda corrente nacional (BRL) ou de criptoativos de propriedade do CONTRATANTE.
              </p>

              <p className="text-sm text-gray-700 mb-4">
                <strong>CLÁUSULA 1 - OBRIGAÇÕES DO CONTRATANTE</strong>
              </p>
              
              <ul className="list-disc list-inside text-sm text-gray-700 mb-4 space-y-2">
                <li>Fornecer informações e documentos verdadeiros, completos e atualizados</li>
                <li>Manter seus dados cadastrais atualizados</li>
                <li>Efetuar pagamentos nos prazos estabelecidos</li>
                <li>Informar corretamente o endereço de carteira TRC-20 para recebimento de USDT</li>
                <li>Utilizar os serviços exclusivamente para finalidades lícitas</li>
                <li>Não realizar operações que caracterizem lavagem de dinheiro ou financiamento ao terrorismo</li>
              </ul>

              <p className="text-sm text-gray-700 mb-4">
                <strong>CLÁUSULA 2 - PREVENÇÃO À LAVAGEM DE DINHEIRO (PLD/FT)</strong>
              </p>

              <p className="text-sm text-gray-700 mb-4">
                A CONTRATADA adota rigorosas políticas de Prevenção à Lavagem de Dinheiro e Combate ao 
                Financiamento do Terrorismo (PLD/FT), em conformidade com a Lei nº 9.613/1998 e Lei nº 14.478/2022.
              </p>

              <p className="text-sm text-gray-700 mb-4">
                O CONTRATANTE declara que os recursos utilizados nas operações têm origem lícita e não está 
                envolvido em atividades ilícitas, lavagem de dinheiro ou financiamento ao terrorismo.
              </p>

              <p className="text-sm text-gray-700 mb-4">
                <strong>CLÁUSULA 3 - PROTEÇÃO DE DADOS (LGPD)</strong>
              </p>

              <p className="text-sm text-gray-700 mb-4">
                A CONTRATADA tratará os dados pessoais do CONTRATANTE em conformidade com a Lei nº 13.709/2018 
                (Lei Geral de Proteção de Dados - LGPD). Os dados pessoais serão mantidos pelo prazo de 5 (cinco) 
                anos após o término do relacionamento, conforme exigido pela legislação de PLD/FT.
              </p>

              <p className="text-sm text-gray-700 mb-4">
                <strong>CLÁUSULA 4 - FORO</strong>
              </p>

              <p className="text-sm text-gray-700">
                As partes elegem o foro da comarca de Curitiba/PR para dirimir quaisquer controvérsias 
                oriundas deste contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
              </p>

              <p className="text-sm text-gray-500 mt-6 italic">
                Este é um resumo do contrato. O contrato completo estará disponível para download após a assinatura.
              </p>
            </div>
          </div>
        </div>

        {/* Assinatura */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <label className="flex items-start">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-3 text-sm text-gray-700">
                Li e concordo com todos os termos e condições do Contrato de Prestação de Serviços de 
                Liquidez em USDT. Declaro que as informações fornecidas são verdadeiras e que os recursos 
                utilizados têm origem lícita.
              </span>
            </label>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleSign}
              disabled={!agreed || signing}
              className={`flex-1 py-3 px-6 rounded-lg font-medium transition ${
                agreed && !signing
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {signing ? 'Assinando...' : '✍️ Assinar Contrato Eletronicamente'}
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-4 text-center">
            Ao assinar eletronicamente, você concorda que esta assinatura tem validade jurídica equivalente 
            à assinatura manuscrita, nos termos da MP 2.200-2/2001 e Lei 14.063/2020.
          </p>
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

