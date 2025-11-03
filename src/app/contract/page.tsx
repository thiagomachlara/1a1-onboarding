
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
              {applicant.applicant_type === 'company' && applicant.ubo_name && (
                <div>
                  <p className="text-sm text-gray-600">Representante Legal</p>
                  <p className="font-medium text-gray-900">{applicant.ubo_name}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="prose max-w-none">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Termos do Contrato</h2>
            
            <div className="bg-gray-50 rounded-lg p-6 max-h-[600px] overflow-y-auto border border-gray-200 text-sm text-gray-700 space-y-4">
<div>
              <h3 className="font-bold text-gray-900 mb-2">CLÁUSULA 1 - OBJETO DO CONTRATO</h3>
              <p className="mb-2">1.1. O presente contrato tem por objeto a prestação de serviços de liquidez em USDT</p>
              <p className="mb-2">(Tether) pela CONTRATADA ao CONTRATANTE, caracterizando-se como Liquidity as a</p>
              <p className="mb-2">Service (LaaS), mediante intermediação de operações de compra e venda de USDT na rede</p>
              <p className="mb-2">TRC-20 (TRON).</p>
              <p className="mb-2">1.2. A CONTRATADA atuará exclusivamente como intermediadora, não realizando custódia</p>
              <p className="mb-2">de valores em moeda corrente nacional (BRL) ou de criptoativos de propriedade do</p>
              <p className="mb-2">CONTRATANTE.</p>
              <p className="mb-2">1.3. Os serviços serão prestados através da plataforma digital otc.1a1cripto.com e/ou via</p>
              <p className="mb-2">API, conforme disponibilizado pela CONTRATADA.</p>
              </div>
              <div>
              <h3 className="font-bold text-gray-900 mb-2">CLÁUSULA 2 - DEFINIÇÕES</h3>
              <p className="mb-2">Para fins deste contrato, aplicam-se as seguintes definições:</p>
              <p className="mb-2">a) USDT (Tether): Stablecoin lastreada em dólar americano (USD), emitida pela Tether</p>
              <p className="mb-2">Limited.</p>
              <p className="mb-2">b) TRC-20: Padrão de token na blockchain TRON, utilizado para transações de USDT.</p>
              <p className="mb-2">c) RFQ (Request for Quote): Solicitação de cotação realizada pelo CONTRATANTE através</p>
              <p className="mb-2">da plataforma ou API da CONTRATADA.</p>
              <p className="mb-2">d) Trava (Lock): Fixação de cotação de câmbio para uma operação específica, vinculando</p>
              <p className="mb-2">CONTRATANTE e CONTRATADA aos termos acordados.</p>
              <p className="mb-2">e) Spread: Diferença percentual ou absoluta aplicada sobre a cotação base (USDBRL ×</p>
              <p className="mb-2">USDTUSD) como remuneração da CONTRATADA.</p>
              <p className="mb-2">f) Liquidação (Settlement): Processo de transferência de USDT para a carteira do</p>
              <p className="mb-2">CONTRATANTE após confirmação do pagamento em BRL.</p>
              <p className="mb-2">g) D0, D1, D2: Modalidades de liquidação financeira: - D0: Pagamento e liquidação no</p>
              <p className="mb-2">mesmo dia útil da trava. - D1: Pagamento e liquidação no dia útil seguinte à trava. - D2:</p>
              <p className="mb-2">Pagamento e liquidação em dois dias úteis após a trava.</p>
              <p className="mb-2">h) Whitelist de Carteira: Endereço de carteira TRC-20 previamente cadastrado e aprovado</p>
              <p className="mb-2">pela CONTRATADA para recebimento de USDT.</p>
              <p className="mb-2">i) KYC (Know Your Customer): Processo de identificação e verificação de identidade do</p>
              <p className="mb-2">CONTRATANTE.</p>
              <p className="mb-2">j) KYT (Know Your Transaction): Processo de monitoramento e análise de transações em</p>
              <p className="mb-2">blockchain para prevenção à lavagem de dinheiro.</p>
              </div>
              <div>
              <h3 className="font-bold text-gray-900 mb-2">CLÁUSULA 3 - CADASTRO, KYC E ONBOARDING</h3>
              <p className="mb-2">3.1. Para utilizar os serviços da CONTRATADA, o CONTRATANTE deverá passar por</p>
              <p className="mb-2">processo completo de cadastro, KYC e onboarding, incluindo:</p>
              <p className="mb-2">a)</p>
              <p className="mb-2">Fornecimento de documentos de identificação pessoal (RG, CPF) ou empresarial (CNPJ,</p>
              <p className="mb-2">Contrato Social, documentos dos sócios);</p>
              <p className="mb-2">b)</p>
              <p className="mb-2">Comprovante de endereço atualizado;</p>
              <p className="mb-2">c)</p>
              <p className="mb-2">Comprovante de capacidade financeira (Declaração de Imposto de Renda, balanços</p>
              <p className="mb-2">contábeis, extratos bancários);</p>
              <p className="mb-2">d)</p>
              <p className="mb-2">Cadastro e aprovação de endereço de carteira TRC-20 para whitelist;</p>
              <p className="mb-2">e)</p>
              <p className="mb-2">Verificação através da plataforma Sumsub (KYC) e Chainalysis (KYT).</p>
              <p className="mb-2">3.2. A CONTRATADA reserva-se o direito de solicitar documentação adicional a qualquer</p>
              <p className="mb-2">momento, especialmente em caso de aumento de limites operacionais.</p>
              <p className="mb-2">3.3. O processo de aprovação do cadastro será realizado em até 5 (cinco) dias úteis após o</p>
              <p className="mb-2">recebimento completo da documentação.</p>
              <p className="mb-2">3.4. A CONTRATADA poderá recusar ou suspender o cadastro do CONTRATANTE caso</p>
              <p className="mb-2">identifique inconsistências, riscos de compliance ou descumprimento de obrigações legais de</p>
              <p className="mb-2">Prevenção à Lavagem de Dinheiro (PLD/FT).</p>
              </div>
              <div>
              <h3 className="font-bold text-gray-900 mb-2">CLÁUSULA 4 - PROCESSO OPERACIONAL</h3>
              <p className="mb-2">4.1. Solicitação de Cotação (RFQ)</p>
              <p className="mb-2">4.1.1. O CONTRATANTE poderá solicitar cotações através da plataforma otc.1a1cripto.com</p>
              <p className="mb-2">ou via API, informando: - Volume em USDT desejado; - Modalidade de liquidação (D0, D1</p>
              <p className="mb-2">ou D2).</p>
              <p className="mb-2">4.1.2. A CONTRATADA fornecerá cotação baseada na fórmula:</p>
              <p className="mb-2">Cotação Final = USDBRL × USDTUSD × (1 + Spread)</p>
              <p className="mb-2">4.1.3. O Spread será acordado individualmente com cada CONTRATANTE, conforme</p>
              <p className="mb-2">negociação comercial e volume operacional.</p>
              <p className="mb-2">4.2. Trava de Cotação (Lock)</p>
              <p className="mb-2">4.2.1. Após aceitar a cotação, o CONTRATANTE realizará a trava (lock), vinculando-se aos</p>
              <p className="mb-2">termos da operação.</p>
              <p className="mb-2">4.2.2. A trava será válida até o horário limite de pagamento estabelecido na Cláusula 5.3.</p>
              <p className="mb-2">4.2.3. Travas não podem ser canceladas unilateralmente pelo CONTRATANTE, sob pena</p>
              <p className="mb-2">de aplicação das penalidades previstas na Cláusula 9.</p>
              <p className="mb-2">4.3. Pagamento em BRL</p>
              <p className="mb-2">4.3.1. O CONTRATANTE deverá efetuar o pagamento em Reais (BRL) através de: - PIX</p>
              <p className="mb-2">(preferencial); ou - TED/DOC.</p>
              <p className="mb-2">4.3.2. O pagamento deve ser realizado exclusivamente de conta bancária de mesma</p>
              <p className="mb-2">titularidade do CONTRATANTE (pessoa física ou jurídica), em conformidade com as</p>
              <p className="mb-2">normas de PLD/FT.</p>
              <p className="mb-2">4.3.3. Não serão aceitos pagamentos de terceiros, sob qualquer hipótese.</p>
              <p className="mb-2">4.3.4. O CONTRATANTE deverá efetuar o pagamento até o horário limite estabelecido na</p>
              <p className="mb-2">Cláusula 5.3, conforme a modalidade de liquidação escolhida.</p>
              <p className="mb-2">4.4. Liquidação em USDT (Settlement)</p>
              <p className="mb-2">4.4.1. Após a confirmação do pagamento em BRL pela CONTRATADA, será iniciado o</p>
              <p className="mb-2">processo de liquidação (settlement).</p>
              <p className="mb-2">4.4.2. A CONTRATADA enviará o volume exato de USDT travado para o endereço de</p>
              <p className="mb-2">carteira TRC-20 previamente cadastrado na whitelist do CONTRATANTE.</p>
              <p className="mb-2">4.4.3. O CONTRATANTE receberá exatamente o volume de USDT travado, sem deduções.</p>
              <p className="mb-2">As taxas de rede (gas fees) da blockchain TRON serão pagas pela CONTRATADA.</p>
              <p className="mb-2">4.4.4. O prazo de liquidação será de até 2 (duas) horas após a confirmação do pagamento</p>
              <p className="mb-2">em BRL, salvo casos de congestionamento da rede TRON (conforme Cláusula 10.5).</p>
              </div>
              <div>
              <h3 className="font-bold text-gray-900 mb-2">CLÁUSULA 5 - HORÁRIOS DE OPERAÇÃO E PRAZOS</h3>
              <p className="mb-2">5.1. Horário de Funcionamento</p>
              <p className="mb-2">5.1.1. Os serviços da CONTRATADA estão disponíveis exclusivamente em dias úteis,</p>
              <p className="mb-2">durante o horário de funcionamento do mercado de câmbio brasileiro.</p>
              <p className="mb-2">5.1.2. Não há operações em finais de semana, feriados nacionais ou dias não úteis.</p>
              <p className="mb-2">5.2. Horário de Trava (Lock)</p>
              <p className="mb-2">5.2.1. As travas de cotação poderão ser realizadas nos seguintes horários:</p>
              <p className="mb-2">•</p>
              <p className="mb-2">D0: Das 09:05h às 15:30h</p>
              <p className="mb-2">•</p>
              <p className="mb-2">D1 e D2: Das 09:05h às 16:30h</p>
              <p className="mb-2">5.3. Horário Limite de Pagamento</p>
              <p className="mb-2">5.3.1. O CONTRATANTE deverá efetuar o pagamento em BRL até 16:30h do dia da</p>
              <p className="mb-2">liquidação, conforme a modalidade escolhida:</p>
              <p className="mb-2">•</p>
              <p className="mb-2">D0: Pagamento até 16:30h do mesmo dia da trava;</p>
              <p className="mb-2">•</p>
              <p className="mb-2">D1: Pagamento até 16:30h do dia útil seguinte à trava;</p>
              <p className="mb-2">•</p>
              <p className="mb-2">D2: Pagamento até 16:30h do segundo dia útil após a trava.</p>
              <p className="mb-2">5.3.2. Pagamentos realizados após o horário limite estarão sujeitos às penalidades previstas</p>
              <p className="mb-2">na Cláusula 9.</p>
              </div>
              <div>
              <h3 className="font-bold text-gray-900 mb-2">CLÁUSULA 6 - LIMITES OPERACIONAIS</h3>
              <p className="mb-2">6.1. Limites por Operação</p>
              <p className="mb-2">6.1.1. Valor mínimo por operação: 10.000 USDT (dez mil Tether).</p>
              <p className="mb-2">6.1.2. Valor máximo por operação: 500.000 USDT (quinhentos mil Tether).</p>
              <p className="mb-2">6.2. Limites Diários e Mensais</p>
              <p className="mb-2">6.2.1. O limite operacional diário e mensal do CONTRATANTE será estabelecido pela</p>
              <p className="mb-2">CONTRATADA com base em: - Documentação financeira apresentada; - Capacidade</p>
              <p className="mb-2">econômico-financeira comprovada; - Histórico de operações e adimplência.</p>
              <p className="mb-2">6.2.2. Os limites poderão ser aumentados gradualmente conforme o CONTRATANTE</p>
              <p className="mb-2">estabeleça histórico positivo de operações e adimplência.</p>
              <p className="mb-2">6.2.3. A CONTRATADA reserva-se o direito de reduzir ou suspender limites em caso de</p>
              <p className="mb-2">inadimplência, inconsistências ou riscos de compliance.</p>
              </div>
              <div>
              <h3 className="font-bold text-gray-900 mb-2">CLÁUSULA 7 - PRECIFICAÇÃO E TAXAS</h3>
              <p className="mb-2">7.1. A cotação de cada operação será calculada com base na fórmula:</p>
              <p className="mb-2">Cotação Final = USDBRL × USDTUSD × (1 + Spread)</p>
              <p className="mb-2">7.2. O Spread será acordado individualmente com cada CONTRATANTE, conforme</p>
              <p className="mb-2">negociação comercial, volume operacional e condições de mercado.</p>
              <p className="mb-2">7.3. O Spread acordado será informado no momento da solicitação de cotação (RFQ) e</p>
              <p className="mb-2">constará na tela de confirmação da trava.</p>
              <p className="mb-2">7.4. Não há cobrança de taxas adicionais além do Spread. As taxas de rede (gas fees) da</p>
              <p className="mb-2">blockchain TRON são pagas pela CONTRATADA.</p>
              <p className="mb-2">7.5. Em caso de alteração do Spread acordado, a CONTRATADA notificará o</p>
              <p className="mb-2">CONTRATANTE com 5 (cinco) dias úteis de antecedência.</p>
              </div>
              <div>
              <h3 className="font-bold text-gray-900 mb-2">CLÁUSULA 8 - WHITELIST DE CARTEIRAS</h3>
              <p className="mb-2">8.1. O CONTRATANTE deverá cadastrar um único endereço de carteira TRC-20 para</p>
              <p className="mb-2">recebimento de USDT.</p>
              <p className="mb-2">8.2. O endereço de carteira será submetido a análise de risco através da plataforma</p>
              <p className="mb-2">Chainalysis KYT antes da aprovação.</p>
              <p className="mb-2">8.3. Não serão aceitos endereços de carteiras vinculados a: - Atividades ilícitas ou</p>
              <p className="mb-2">sancionadas; - Exchanges não regulamentadas; - Serviços de mixing ou tumbling; - Listas</p>
              <p className="mb-2">restritivas internacionais (OFAC, Interpol, etc).</p>
              <p className="mb-2">8.4. A alteração do endereço de carteira cadastrado deverá ser solicitada formalmente à</p>
              <p className="mb-2">CONTRATADA, com antecedência mínima de 2 (dois) dias úteis, e estará sujeita a nova</p>
              <p className="mb-2">análise de risco.</p>
              <p className="mb-2">8.5. A CONTRATADA não se responsabiliza por envios de USDT para endereços</p>
              <p className="mb-2">incorretos informados pelo CONTRATANTE.</p>
              </div>
              <div>
              <h3 className="font-bold text-gray-900 mb-2">CLÁUSULA 9 - CANCELAMENTO, INADIMPLÊNCIA E PENALIDADES</h3>
              <p className="mb-2">9.1. Cancelamento de Trava</p>
              <p className="mb-2">9.1.1. Travas não podem ser canceladas unilateralmente pelo CONTRATANTE após a</p>
              <p className="mb-2">confirmação.</p>
              <p className="mb-2">9.1.2. Em caso de necessidade excepcional de cancelamento, o CONTRATANTE deverá</p>
              <p className="mb-2">comunicar imediatamente a CONTRATADA, que avaliará a possibilidade de: - Transferir a</p>
              <p className="mb-2">trava para outro cliente; ou - Cancelar a operação junto ao fornecedor de liquidez.</p>
              <p className="mb-2">9.1.3. Em caso de cancelamento, o CONTRATANTE arcará com todos os custos incorridos</p>
              <p className="mb-2">pela CONTRATADA, incluindo: - Multas contratuais cobradas por fornecedores de liquidez;</p>
              <p className="mb-2">- Diferenças de mercado (mark-to-market) em caso de variação cambial desfavorável; Custos operacionais e administrativos.</p>
              <p className="mb-2">9.2. Inadimplência no Pagamento</p>
              <p className="mb-2">9.2.1. Caso o CONTRATANTE não efetue o pagamento até o horário limite estabelecido na</p>
              <p className="mb-2">Cláusula 5.3, deverá comunicar imediatamente a CONTRATADA.</p>
              <p className="mb-2">9.2.2. A CONTRATADA poderá, a seu exclusivo critério: - Rolar a liquidação para D+1,</p>
              <p className="mb-2">D+2 ou data posterior; - Cancelar a operação e aplicar as penalidades previstas na Cláusula</p>
              <p className="mb-2">9.1.</p>
              <p className="mb-2">9.2.3. Em caso de rolagem de liquidação, o CONTRATANTE arcará com: - Multas</p>
              <p className="mb-2">bancárias impostas pelos bancos de câmbio parceiros; - Diferenças de mercado em caso de</p>
              <p className="mb-2">variação cambial desfavorável; - Custos financeiros adicionais (juros, penalidades</p>
              <p className="mb-2">contratuais).</p>
              <p className="mb-2">9.2.4. Todos os custos mencionados nos itens 9.2.3 serão integralmente repassados ao</p>
              <p className="mb-2">CONTRATANTE.</p>
              <p className="mb-2">9.3. Inadimplência Reiterada</p>
              <p className="mb-2">9.3.1. Em caso de inadimplência reiterada (3 ou mais ocorrências em 12 meses), a</p>
              <p className="mb-2">CONTRATADA poderá: - Reduzir os limites operacionais do CONTRATANTE; Suspender temporariamente o acesso aos serviços; - Rescindir o presente contrato, conforme</p>
              <p className="mb-2">Cláusula 14.</p>
              </div>
              <div>
              <h3 className="font-bold text-gray-900 mb-2">CLÁUSULA 10 - OBRIGAÇÕES E RESPONSABILIDADES</h3>
              <p className="mb-2">10.1. Obrigações do CONTRATANTE</p>
              <p className="mb-2">10.1.1. Fornecer informações e documentos verdadeiros, completos e atualizados;</p>
              <p className="mb-2">10.1.2. Manter seus dados cadastrais atualizados, comunicando qualquer alteração em até 5</p>
              <p className="mb-2">(cinco) dias úteis;</p>
              <p className="mb-2">10.1.3. Efetuar pagamentos nos prazos estabelecidos;</p>
              <p className="mb-2">10.1.4. Informar corretamente o endereço de carteira TRC-20 para recebimento de USDT;</p>
              <p className="mb-2">10.1.5. Utilizar os serviços exclusivamente para finalidades lícitas, em conformidade com a</p>
              <p className="mb-2">legislação brasileira;</p>
              <p className="mb-2">10.1.6. Não realizar operações que caracterizem lavagem de dinheiro, financiamento ao</p>
              <p className="mb-2">terrorismo ou qualquer atividade ilícita;</p>
              <p className="mb-2">10.1.7. Comunicar imediatamente a CONTRATADA em caso de impossibilidade de</p>
              <p className="mb-2">cumprimento de obrigações contratuais.</p>
              <p className="mb-2">10.2. Obrigações da CONTRATADA</p>
              <p className="mb-2">10.2.1. Fornecer liquidez em USDT conforme travas confirmadas;</p>
              <p className="mb-2">10.2.2. Manter a segurança e confidencialidade dos dados do CONTRATANTE;</p>
              <p className="mb-2">10.2.3. Processar as liquidações nos prazos estabelecidos;</p>
              <p className="mb-2">10.2.4. Prestar suporte técnico e operacional durante o horário comercial;</p>
              <p className="mb-2">10.2.5. Cumprir as obrigações de Prevenção à Lavagem de Dinheiro (PLD/FT) e proteção</p>
              <p className="mb-2">de dados (LGPD).</p>
              <p className="mb-2">10.3. Limitações de Responsabilidade da CONTRATADA</p>
              <p className="mb-2">10.3.1. A CONTRATADA não se responsabiliza por:</p>
              <p className="mb-2">a)</p>
              <p className="mb-2">Variações de mercado (câmbio, cotação USDT) entre o momento da trava e a</p>
              <p className="mb-2">liquidação, salvo em caso de atraso imputável exclusivamente à CONTRATADA;</p>
              <p className="mb-2">b)</p>
              <p className="mb-2">Congestionamento, falhas técnicas ou indisponibilidade da rede blockchain TRON;</p>
              <p className="mb-2">c)</p>
              <p className="mb-2">Atrasos na confirmação de transações blockchain devido a fatores externos</p>
              <p className="mb-2">(mineradores, validadores, congestão de rede);</p>
              <p className="mb-2">d)</p>
              <p className="mb-2">Perdas decorrentes de informação incorreta de endereço de carteira pelo</p>
              <p className="mb-2">CONTRATANTE;</p>
              <p className="mb-2">e)</p>
              <p className="mb-2">Indisponibilidade temporária da plataforma ou API devido a manutenções programadas</p>
              <p className="mb-2">(com aviso prévio) ou casos fortuitos/força maior;</p>
              <p className="mb-2">f)</p>
              <p className="mb-2">Ações de terceiros (hackers, ataques DDoS, falhas de provedores de infraestrutura).</p>
              <p className="mb-2">10.3.2. Em caso de congestionamento da rede TRON, a liquidação será processada assim</p>
              <p className="mb-2">que a rede normalizar, sem ônus adicional para qualquer das partes.</p>
              <p className="mb-2">10.3.3. A CONTRATADA não garante disponibilidade ininterrupta dos serviços,</p>
              <p className="mb-2">comprometendo-se a envidar melhores esforços para manter a plataforma operacional.</p>
              </div>
              <div>
              <h3 className="font-bold text-gray-900 mb-2">CLÁUSULA 11 - PREVENÇÃO À LAVAGEM DE DINHEIRO (PLD/FT)</h3>
              <p className="mb-2">11.1. A CONTRATADA adota rigorosas políticas de Prevenção à Lavagem de Dinheiro e</p>
              <p className="mb-2">Combate ao Financiamento do Terrorismo (PLD/FT), em conformidade com a Lei nº</p>
              <p className="mb-2">9.613/1998 e Lei nº 14.478/2022.</p>
              <p className="mb-2">11.2. O CONTRATANTE declara que: - Os recursos utilizados nas operações têm origem</p>
              <p className="mb-2">lícita; - Não está envolvido em atividades ilícitas, lavagem de dinheiro ou financiamento ao</p>
              <p className="mb-2">terrorismo; - Não consta em listas restritivas nacionais ou internacionais (OFAC, ONU,</p>
              <p className="mb-2">Interpol, COAF).</p>
              <p className="mb-2">11.3. A CONTRATADA reserva-se o direito de: - Monitorar todas as transações do</p>
              <p className="mb-2">CONTRATANTE; - Solicitar comprovação da origem de recursos; - Reportar operações</p>
              <p className="mb-2">suspeitas ao COAF (Conselho de Controle de Atividades Financeiras); - Recusar, suspender</p>
              <p className="mb-2">ou encerrar operações que apresentem indícios de irregularidades.</p>
              <p className="mb-2">11.4. O CONTRATANTE autoriza expressamente a CONTRATADA a compartilhar seus</p>
              <p className="mb-2">dados com autoridades competentes, quando exigido por lei ou ordem judicial.</p>
              </div>
              <div>
              <h3 className="font-bold text-gray-900 mb-2">CLÁUSULA 12 - CONFIDENCIALIDADE E PROTEÇÃO DE DADOS</h3>
              <p className="mb-2">(LGPD)</p>
              <p className="mb-2">12.1. As partes comprometem-se a manter sigilo sobre todas as informações comerciais,</p>
              <p className="mb-2">financeiras e operacionais trocadas no âmbito deste contrato.</p>
              <p className="mb-2">12.2. A CONTRATADA tratará os dados pessoais do CONTRATANTE em conformidade</p>
              <p className="mb-2">com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados - LGPD).</p>
              <p className="mb-2">12.3. O CONTRATANTE consente expressamente com o tratamento de seus dados pessoais</p>
              <p className="mb-2">para as finalidades de: - Prestação dos serviços contratados; - Cumprimento de obrigações</p>
              <p className="mb-2">legais (PLD/FT, fiscais, regulatórias); - Exercício regular de direitos da CONTRATADA.</p>
              <p className="mb-2">12.4. Os dados pessoais serão mantidos pelo prazo de 5 (cinco) anos após o término do</p>
              <p className="mb-2">relacionamento, conforme exigido pela legislação de PLD/FT.</p>
              <p className="mb-2">12.5. Para mais informações sobre o tratamento de dados, consulte a Política de Privacidade</p>
              <p className="mb-2">da CONTRATADA disponível em www.1a1cripto.com.</p>
              </div>
              <div>
              <h3 className="font-bold text-gray-900 mb-2">CLÁUSULA 13 - VIGÊNCIA</h3>
              <p className="mb-2">13.1. O presente contrato é celebrado por prazo indeterminado, iniciando-se na data de sua</p>
              <p className="mb-2">assinatura.</p>
              <p className="mb-2">13.2. O CONTRATANTE poderá utilizar os serviços da CONTRATADA quantas vezes</p>
              <p className="mb-2">desejar, mediante solicitação de cotação (RFQ) e trava de operações.</p>
              </div>
              <div>
              <h3 className="font-bold text-gray-900 mb-2">CLÁUSULA 14 - RESCISÃO</h3>
              <p className="mb-2">14.1. Rescisão Imotivada</p>
              <p className="mb-2">14.1.1. Qualquer das partes poderá rescindir o presente contrato a qualquer momento,</p>
              <p className="mb-2">mediante comunicação por escrito com antecedência mínima de 30 (trinta) dias.</p>
              <p className="mb-2">14.1.2. Operações já travadas e não liquidadas deverão ser concluídas normalmente, mesmo</p>
              <p className="mb-2">após a rescisão.</p>
              <p className="mb-2">14.2. Rescisão Motivada</p>
              <p className="mb-2">14.2.1. A CONTRATADA poderá rescindir o contrato imediatamente, sem aviso prévio, em</p>
              <p className="mb-2">caso de: - Inadimplência reiterada do CONTRATANTE; - Fornecimento de informações</p>
              <p className="mb-2">falsas ou fraudulentas; - Utilização dos serviços para atividades ilícitas; - Descumprimento</p>
              <p className="mb-2">de obrigações contratuais; - Identificação de riscos de compliance ou PLD/FT.</p>
              <p className="mb-2">14.2.2. O CONTRATANTE poderá rescindir o contrato imediatamente em caso de</p>
              <p className="mb-2">descumprimento grave das obrigações da CONTRATADA.</p>
              </div>
              <div>
              <h3 className="font-bold text-gray-900 mb-2">CLÁUSULA 15 - DISPOSIÇÕES GERAIS</h3>
              <p className="mb-2">15.1. O presente contrato constitui o acordo integral entre as partes, substituindo quaisquer</p>
              <p className="mb-2">entendimentos ou acordos anteriores.</p>
              <p className="mb-2">15.2. Qualquer alteração deste contrato deverá ser formalizada por escrito e assinada por</p>
              <p className="mb-2">ambas as partes.</p>
              <p className="mb-2">15.3. A tolerância de uma parte quanto ao descumprimento de qualquer cláusula não</p>
              <p className="mb-2">constituirá novação ou renúncia de direitos.</p>
              <p className="mb-2">15.4. Caso qualquer cláusula deste contrato seja considerada nula ou inválida, as demais</p>
              <p className="mb-2">cláusulas permanecerão em pleno vigor.</p>
              <p className="mb-2">15.5. As comunicações entre as partes deverão ser realizadas preferencialmente por e-mail,</p>
              <p className="mb-2">com confirmação de recebimento.</p>
              </div>
              <div>
              <h3 className="font-bold text-gray-900 mb-2">CLÁUSULA 16 - FORO</h3>
              <p className="mb-2">16.1. As partes elegem o Foro da Comarca de Curitiba/PR para dirimir quaisquer</p>
              <p className="mb-2">controvérsias decorrentes deste contrato, com renúncia expressa a qualquer outro, por mais</p>
              <p className="mb-2">privilegiado que seja.</p>
              </div>
              <div className="mt-6 pt-4 border-t border-gray-300">
                <p className="text-xs text-gray-500 italic">
                  Este é o contrato completo de prestação de serviços. Ao assinar eletronicamente, você concorda com todos os termos e condições aqui estabelecidos.
                </p>
              </div>
            </div>
          </div>
        </div>

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
