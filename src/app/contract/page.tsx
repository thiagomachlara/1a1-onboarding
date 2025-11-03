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

        {/* Contrato Completo */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="prose max-w-none">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Termos do Contrato</h2>
            
            <div className="bg-gray-50 rounded-lg p-6 max-h-[600px] overflow-y-auto border border-gray-200 text-sm text-gray-700 space-y-4">
              
              {/* CLÁUSULA 1 */}
              <div>
                <h3 className="font-bold text-gray-900 mb-2">CLÁUSULA 1 - OBJETO DO CONTRATO</h3>
                <p className="mb-2">
                  1.1. O presente contrato tem por objeto a prestação de serviços de liquidez em USDT (Tether) pela 1A1 INTERMEDIAÇÃO LTDA ao CONTRATANTE, caracterizando-se como Liquidity as a Service (LaaS), mediante intermediação de operações de compra e venda de USDT na rede TRC-20 (TRON).
                </p>
                <p className="mb-2">
                  1.2. A CONTRATADA atuará exclusivamente como intermediadora, não realizando custódia de valores em moeda corrente nacional (BRL) ou de criptoativos de propriedade do CONTRATANTE.
                </p>
                <p>
                  1.3. Os serviços serão prestados através da plataforma digital otc.1a1cripto.com e/ou via API, conforme disponibilizado pela CONTRATADA.
                </p>
              </div>

              {/* CLÁUSULA 2 */}
              <div>
                <h3 className="font-bold text-gray-900 mb-2">CLÁUSULA 2 - DEFINIÇÕES</h3>
                <p className="mb-2">Para fins deste contrato, aplicam-se as seguintes definições:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>USDT (Tether):</strong> Stablecoin lastreada em dólar americano (USD), emitida pela Tether Limited.</li>
                  <li><strong>TRC-20:</strong> Padrão de token na blockchain TRON, utilizado para transações de USDT.</li>
                  <li><strong>RFQ (Request for Quote):</strong> Solicitação de cotação realizada pelo CONTRATANTE através da plataforma ou API da CONTRATADA.</li>
                  <li><strong>Trava (Lock):</strong> Fixação de cotação de câmbio para uma operação específica, vinculando CONTRATANTE e CONTRATADA aos termos acordados.</li>
                  <li><strong>Spread:</strong> Diferença percentual ou absoluta aplicada sobre a cotação base (USDBRL × USDTUSD) como remuneração da CONTRATADA.</li>
                  <li><strong>Liquidação (Settlement):</strong> Processo de transferência de USDT para a carteira do CONTRATANTE após confirmação do pagamento em BRL.</li>
                  <li><strong>D0, D1, D2:</strong> Modalidades de liquidação financeira.</li>
                  <li><strong>Whitelist de Carteira:</strong> Endereço de carteira TRC-20 previamente cadastrado e aprovado pela CONTRATADA para recebimento de USDT.</li>
                  <li><strong>KYC (Know Your Customer):</strong> Processo de identificação e verificação de identidade do CONTRATANTE.</li>
                  <li><strong>KYT (Know Your Transaction):</strong> Processo de monitoramento e análise de transações em blockchain para prevenção à lavagem de dinheiro.</li>
                </ul>
              </div>

              {/* CLÁUSULA 3 */}
              <div>
                <h3 className="font-bold text-gray-900 mb-2">CLÁUSULA 3 - CADASTRO, KYC E ONBOARDING</h3>
                <p className="mb-2">
                  3.1. Para utilizar os serviços da CONTRATADA, o CONTRATANTE deverá passar por processo completo de cadastro, KYC e onboarding, incluindo fornecimento de documentos de identificação, comprovantes, e verificação através das plataformas Sumsub (KYC) e Chainalysis (KYT).
                </p>
                <p className="mb-2">
                  3.2. A CONTRATADA reserva-se o direito de solicitar documentação adicional a qualquer momento.
                </p>
                <p className="mb-2">
                  3.3. O processo de aprovação do cadastro será realizado em até 5 (cinco) dias úteis após o recebimento completo da documentação.
                </p>
                <p>
                  3.4. A CONTRATADA poderá recusar ou suspender o cadastro caso identifique inconsistências, riscos de compliance ou descumprimento de obrigações legais de PLD/FT.
                </p>
              </div>

              {/* CLÁUSULA 4 */}
              <div>
                <h3 className="font-bold text-gray-900 mb-2">CLÁUSULA 4 - PROCESSO OPERACIONAL</h3>
                <p className="mb-2">
                  <strong>4.1. Solicitação de Cotação (RFQ):</strong> O CONTRATANTE poderá solicitar cotações através da plataforma, informando volume em USDT desejado e modalidade de liquidação.
                </p>
                <p className="mb-2">
                  <strong>4.2. Trava de Cotação (Lock):</strong> Após aceitar a cotação, o CONTRATANTE realizará a trava, vinculando-se aos termos da operação. Travas não podem ser canceladas unilateralmente.
                </p>
                <p className="mb-2">
                  <strong>4.3. Pagamento em BRL:</strong> O CONTRATANTE deverá efetuar o pagamento em Reais através de PIX ou TED/DOC, exclusivamente de conta de mesma titularidade. Não serão aceitos pagamentos de terceiros.
                </p>
                <p>
                  <strong>4.4. Liquidação em USDT:</strong> Após confirmação do pagamento, a CONTRATADA enviará o volume exato de USDT para o endereço cadastrado. As taxas de rede (gas fees) são pagas pela CONTRATADA. Prazo: até 2 horas após confirmação.
                </p>
              </div>

              {/* CLÁUSULA 5 */}
              <div>
                <h3 className="font-bold text-gray-900 mb-2">CLÁUSULA 5 - HORÁRIOS DE OPERAÇÃO E PRAZOS</h3>
                <p className="mb-2">
                  <strong>5.1. Horário de Funcionamento:</strong> Serviços disponíveis exclusivamente em dias úteis, durante horário do mercado de câmbio brasileiro.
                </p>
                <p className="mb-2">
                  <strong>5.2. Horário de Trava:</strong> D0: 09:05h às 15:30h | D1 e D2: 09:05h às 16:30h
                </p>
                <p>
                  <strong>5.3. Horário Limite de Pagamento:</strong> Pagamento até 16:30h do dia da liquidação, conforme modalidade escolhida. Pagamentos após o horário limite estarão sujeitos a penalidades.
                </p>
              </div>

              {/* CLÁUSULA 6 */}
              <div>
                <h3 className="font-bold text-gray-900 mb-2">CLÁUSULA 6 - LIMITES OPERACIONAIS</h3>
                <p className="mb-2">
                  <strong>6.1. Limites por Operação:</strong>
                </p>
                <ul className="list-disc list-inside ml-4 mb-2">
                  <li>Valor mínimo: 10.000 USDT (dez mil Tether)</li>
                  <li>Valor máximo: 500.000 USDT (quinhentos mil Tether)</li>
                </ul>
                <p>
                  <strong>6.2. Limites Diários e Mensais:</strong> Estabelecidos pela CONTRATADA com base em documentação financeira, capacidade econômico-financeira e histórico de operações. Limites poderão ser aumentados gradualmente ou reduzidos em caso de inadimplência.
                </p>
              </div>

              {/* CLÁUSULA 7 */}
              <div>
                <h3 className="font-bold text-gray-900 mb-2">CLÁUSULA 7 - PRECIFICAÇÃO E TAXAS</h3>
                <p className="mb-2">
                  7.1. Fórmula de cotação: <strong>Cotação Final = USDBRL × USDTUSD × (1 + Spread)</strong>
                </p>
                <p className="mb-2">
                  7.2. O Spread será acordado individualmente com cada CONTRATANTE, conforme negociação comercial e volume operacional.
                </p>
                <p className="mb-2">
                  7.3. O Spread acordado será informado no momento da solicitação de cotação (RFQ).
                </p>
                <p className="mb-2">
                  7.4. Não há cobrança de taxas adicionais além do Spread. As taxas de rede (gas fees) da blockchain TRON são pagas pela CONTRATADA.
                </p>
                <p>
                  7.5. Em caso de alteração do Spread, a CONTRATADA notificará o CONTRATANTE com 5 (cinco) dias úteis de antecedência.
                </p>
              </div>

              {/* CLÁUSULA 8 */}
              <div>
                <h3 className="font-bold text-gray-900 mb-2">CLÁUSULA 8 - WHITELIST DE CARTEIRAS</h3>
                <p className="mb-2">
                  8.1. O CONTRATANTE deverá cadastrar um único endereço de carteira TRC-20 para recebimento de USDT.
                </p>
                <p className="mb-2">
                  8.2. O endereço será submetido a análise de risco através da plataforma Chainalysis KYT antes da aprovação.
                </p>
                <p className="mb-2">
                  8.3. Não serão aceitos endereços vinculados a: atividades ilícitas, exchanges não regulamentadas, serviços de mixing ou tumbling, listas restritivas internacionais (OFAC, Interpol, etc).
                </p>
                <p className="mb-2">
                  8.4. Alteração de endereço deverá ser solicitada com antecedência mínima de 2 (dois) dias úteis, sujeita a nova análise de risco.
                </p>
                <p>
                  8.5. A CONTRATADA não se responsabiliza por envios para endereços incorretos informados pelo CONTRATANTE.
                </p>
              </div>

              {/* CLÁUSULA 9 */}
              <div>
                <h3 className="font-bold text-gray-900 mb-2">CLÁUSULA 9 - CANCELAMENTO, INADIMPLÊNCIA E PENALIDADES</h3>
                <p className="mb-2">
                  <strong>9.1. Cancelamento de Trava:</strong> Travas não podem ser canceladas unilateralmente após confirmação. Em caso excepcional, o CONTRATANTE arcará com todos os custos incorridos (multas contratuais, diferenças de mercado, custos operacionais).
                </p>
                <p className="mb-2">
                  <strong>9.2. Inadimplência no Pagamento:</strong> Caso não efetue pagamento no prazo, o CONTRATANTE deverá comunicar imediatamente. A CONTRATADA poderá rolar a liquidação ou cancelar a operação. Custos de rolagem (multas bancárias, diferenças de mercado, custos financeiros) serão repassados ao CONTRATANTE.
                </p>
                <p>
                  <strong>9.3. Inadimplência Reiterada:</strong> Em caso de 3 ou mais ocorrências em 12 meses, a CONTRATADA poderá reduzir limites, suspender acesso ou rescindir o contrato.
                </p>
              </div>

              {/* CLÁUSULA 10 */}
              <div>
                <h3 className="font-bold text-gray-900 mb-2">CLÁUSULA 10 - OBRIGAÇÕES E RESPONSABILIDADES</h3>
                <p className="mb-2"><strong>10.1. Obrigações do CONTRATANTE:</strong></p>
                <ul className="list-disc list-inside ml-4 mb-2 space-y-1">
                  <li>Fornecer informações e documentos verdadeiros, completos e atualizados</li>
                  <li>Manter dados cadastrais atualizados (comunicar alterações em até 5 dias úteis)</li>
                  <li>Efetuar pagamentos nos prazos estabelecidos</li>
                  <li>Informar corretamente endereço de carteira TRC-20</li>
                  <li>Utilizar serviços exclusivamente para finalidades lícitas</li>
                  <li>Não realizar operações de lavagem de dinheiro ou financiamento ao terrorismo</li>
                  <li>Comunicar imediatamente impossibilidade de cumprimento de obrigações</li>
                </ul>
                <p className="mb-2"><strong>10.2. Obrigações da CONTRATADA:</strong></p>
                <ul className="list-disc list-inside ml-4 mb-2 space-y-1">
                  <li>Fornecer liquidez em USDT conforme travas confirmadas</li>
                  <li>Manter segurança e confidencialidade dos dados</li>
                  <li>Processar liquidações nos prazos estabelecidos</li>
                  <li>Prestar suporte técnico e operacional</li>
                  <li>Cumprir obrigações de PLD/FT e LGPD</li>
                </ul>
                <p className="mb-2"><strong>10.3. Limitações de Responsabilidade da CONTRATADA:</strong></p>
                <p className="mb-2">A CONTRATADA não se responsabiliza por:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Variações de mercado entre momento da trava e liquidação (salvo atraso exclusivo da CONTRATADA)</li>
                  <li>Congestionamento ou falhas técnicas da rede blockchain TRON</li>
                  <li>Atrasos em transações blockchain por fatores externos</li>
                  <li>Perdas por informação incorreta de endereço de carteira</li>
                  <li>Indisponibilidade temporária por manutenções ou força maior</li>
                  <li>Ações de terceiros (hackers, ataques DDoS, falhas de infraestrutura)</li>
                </ul>
              </div>

              {/* CLÁUSULA 11 */}
              <div>
                <h3 className="font-bold text-gray-900 mb-2">CLÁUSULA 11 - PREVENÇÃO À LAVAGEM DE DINHEIRO (PLD/FT)</h3>
                <p className="mb-2">
                  11.1. A CONTRATADA adota rigorosas políticas de Prevenção à Lavagem de Dinheiro e Combate ao Financiamento do Terrorismo (PLD/FT), em conformidade com a Lei nº 9.613/1998 e Lei nº 14.478/2022.
                </p>
                <p className="mb-2">
                  11.2. O CONTRATANTE declara que: os recursos têm origem lícita; não está envolvido em atividades ilícitas, lavagem de dinheiro ou financiamento ao terrorismo; não consta em listas restritivas (OFAC, ONU, Interpol, COAF).
                </p>
                <p className="mb-2">
                  11.3. A CONTRATADA reserva-se o direito de: monitorar todas as transações; solicitar comprovação da origem de recursos; reportar operações suspeitas ao COAF; recusar, suspender ou encerrar operações com indícios de irregularidades.
                </p>
                <p>
                  11.4. O CONTRATANTE autoriza expressamente a CONTRATADA a compartilhar seus dados com autoridades competentes, quando exigido por lei ou ordem judicial.
                </p>
              </div>

              {/* CLÁUSULA 12 */}
              <div>
                <h3 className="font-bold text-gray-900 mb-2">CLÁUSULA 12 - CONFIDENCIALIDADE E PROTEÇÃO DE DADOS (LGPD)</h3>
                <p className="mb-2">
                  12.1. As partes comprometem-se a manter sigilo sobre todas as informações comerciais, financeiras e operacionais trocadas no âmbito deste contrato.
                </p>
                <p className="mb-2">
                  12.2. A CONTRATADA tratará os dados pessoais do CONTRATANTE em conformidade com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados - LGPD).
                </p>
                <p className="mb-2">
                  12.3. O CONTRATANTE consente expressamente com o tratamento de seus dados pessoais para: prestação dos serviços contratados; cumprimento de obrigações legais (PLD/FT, fiscais, regulatórias); exercício regular de direitos da CONTRATADA.
                </p>
                <p className="mb-2">
                  12.4. Os dados pessoais serão mantidos pelo prazo de 5 (cinco) anos após o término do relacionamento, conforme exigido pela legislação de PLD/FT.
                </p>
                <p>
                  12.5. Para mais informações sobre o tratamento de dados, consulte a Política de Privacidade da CONTRATADA disponível em www.1a1cripto.com.
                </p>
              </div>

              {/* CLÁUSULA 13 */}
              <div>
                <h3 className="font-bold text-gray-900 mb-2">CLÁUSULA 13 - VIGÊNCIA</h3>
                <p className="mb-2">
                  13.1. O presente contrato é celebrado por prazo indeterminado, iniciando-se na data de sua assinatura.
                </p>
                <p>
                  13.2. O CONTRATANTE poderá utilizar os serviços da CONTRATADA quantas vezes desejar, mediante solicitação de cotação (RFQ) e trava de operações.
                </p>
              </div>

              {/* CLÁUSULA 14 */}
              <div>
                <h3 className="font-bold text-gray-900 mb-2">CLÁUSULA 14 - RESCISÃO</h3>
                <p className="mb-2">
                  <strong>14.1. Rescisão Imotivada:</strong> Qualquer das partes poderá rescindir o contrato a qualquer momento, mediante comunicação por escrito com antecedência mínima de 30 (trinta) dias. Operações já travadas deverão ser concluídas normalmente.
                </p>
                <p>
                  <strong>14.2. Rescisão Motivada:</strong> A CONTRATADA poderá rescindir imediatamente em caso de: inadimplência reiterada; informações falsas; atividades ilícitas; descumprimento de obrigações; riscos de compliance. O CONTRATANTE poderá rescindir imediatamente em caso de descumprimento grave da CONTRATADA.
                </p>
              </div>

              {/* CLÁUSULA 15 */}
              <div>
                <h3 className="font-bold text-gray-900 mb-2">CLÁUSULA 15 - DISPOSIÇÕES GERAIS</h3>
                <p className="mb-2">
                  15.1. O presente contrato constitui o acordo integral entre as partes, substituindo quaisquer entendimentos anteriores.
                </p>
                <p className="mb-2">
                  15.2. Qualquer alteração deverá ser formalizada por escrito e assinada por ambas as partes.
                </p>
                <p className="mb-2">
                  15.3. A tolerância quanto ao descumprimento de qualquer cláusula não constituirá novação ou renúncia de direitos.
                </p>
                <p className="mb-2">
                  15.4. Caso qualquer cláusula seja considerada nula ou inválida, as demais permanecerão em pleno vigor.
                </p>
                <p>
                  15.5. As comunicações deverão ser realizadas preferencialmente por e-mail, com confirmação de recebimento.
                </p>
              </div>

              {/* CLÁUSULA 16 */}
              <div>
                <h3 className="font-bold text-gray-900 mb-2">CLÁUSULA 16 - FORO</h3>
                <p>
                  16.1. As partes elegem o Foro da Comarca de Curitiba/PR para dirimir quaisquer controvérsias decorrentes deste contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-300">
                <p className="text-xs text-gray-500 italic">
                  Este é o contrato completo de prestação de serviços. Ao assinar eletronicamente, você concorda com todos os termos e condições aqui estabelecidos.
                </p>
              </div>
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

