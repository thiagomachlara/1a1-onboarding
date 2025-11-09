import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateTemplates() {
  console.log('🚀 Iniciando migração de templates...\n');
  
  // Buscar ID do admin (Thiago Lara)
  const { data: admin } = await supabase
    .from('admin_users')
    .select('id')
    .eq('email', 'thiago.lara@1a1cripto.com')
    .single();
  
  if (!admin) {
    console.error('❌ Admin não encontrado');
    return;
  }
  
  console.log('✅ Admin encontrado:', admin.id);
  
  // =====================================================
  // 1. Template de Contrato
  // =====================================================
  
  const contractContent = `CONTRATANTE: {{nome}}, {{doc_label}} nº {{documento}}, doravante denominado CONTRATANTE.

CONTRATADA: 1A1 CRIPTO, doravante denominada CONTRATADA.

As partes acima qualificadas têm, entre si, justo e acordado o presente Contrato de Prestação de Serviços de Liquidez em USDT, que se regerá pelas cláusulas seguintes:

CLÁUSULA 1ª - DO OBJETO
O presente contrato tem por objeto a prestação de serviços de liquidez em USDT (Tether) pela CONTRATADA ao CONTRATANTE, mediante as condições estabelecidas neste instrumento.

CLÁUSULA 2ª - DOS SERVIÇOS
2.1. A CONTRATADA se compromete a fornecer liquidez em USDT ao CONTRATANTE através de operações de compra e venda.
2.2. As operações serão realizadas mediante solicitação prévia do CONTRATANTE através dos canais oficiais da CONTRATADA.
2.3. A CONTRATADA se reserva o direito de aceitar ou recusar operações a seu critério, especialmente em casos de suspeita de atividades ilícitas.

CLÁUSULA 3ª - DO PROCESSO OPERACIONAL
3.1. RFQ (Request for Quote): O CONTRATANTE solicita cotação para operação de compra ou venda de USDT.
3.2. Lock: Após aceite da cotação, os valores são bloqueados por período determinado.
3.3. Settlement: Confirmação e liquidação da operação através de transferência bancária (BRL) e transferência blockchain (USDT).

CLÁUSULA 4ª - DA REDE BLOCKCHAIN
4.1. As operações de USDT serão realizadas exclusivamente na rede TRON (TRC-20).
4.2. O CONTRATANTE é responsável por fornecer endereço de wallet válido e compatível com a rede TRC-20.
4.3. Transações enviadas para endereços incorretos ou redes incompatíveis são irreversíveis e de responsabilidade exclusiva do CONTRATANTE.

CLÁUSULA 5ª - DA CONFORMIDADE (COMPLIANCE)
5.1. A CONTRATADA adota políticas rigorosas de Prevenção à Lavagem de Dinheiro (PLD) e Combate ao Financiamento do Terrorismo (CFT).
5.2. Todas as operações estão sujeitas a análise de compliance e KYT (Know Your Transaction) via Chainalysis.
5.3. A CONTRATADA se reserva o direito de solicitar documentação adicional a qualquer momento.
5.4. Operações suspeitas serão reportadas às autoridades competentes conforme legislação vigente.

CLÁUSULA 6ª - DO CADASTRO E VERIFICAÇÃO
6.1. O CONTRATANTE passou por processo de verificação de identidade (KYC) através da plataforma Sumsub.
6.2. O CONTRATANTE declara que todas as informações fornecidas são verdadeiras e atualizadas.
6.3. A CONTRATADA pode solicitar atualização cadastral periodicamente.

CLÁUSULA 7ª - DA WALLET E WHITELIST
7.1. O CONTRATANTE deve cadastrar wallet USDT (TRC-20) para recebimento de valores.
7.2. A wallet será submetida a análise KYT via Chainalysis antes da aprovação.
7.3. Apenas wallets aprovadas e incluídas em whitelist poderão receber USDT da CONTRATADA.
7.4. Alterações de wallet devem ser solicitadas formalmente e passarão por nova análise.

CLÁUSULA 8ª - DAS TAXAS E SPREADS
8.1. As cotações fornecidas pela CONTRATADA já incluem spread comercial.
8.2. Taxas de rede blockchain (gas fees) são de responsabilidade da CONTRATADA.
8.3. Taxas bancárias (TED, PIX) são de responsabilidade de cada parte conforme a operação.

CLÁUSULA 9ª - DOS LIMITES OPERACIONAIS
9.1. A CONTRATADA estabelece limites operacionais baseados no perfil e histórico do CONTRATANTE.
9.2. Limites podem ser ajustados mediante solicitação e análise de compliance.
9.3. Operações acima do limite estabelecido requerem aprovação prévia.

CLÁUSULA 10ª - DA PROTEÇÃO DE DADOS (LGPD)
10.1. As partes se comprometem a tratar dados pessoais em conformidade com a Lei 13.709/2018 (LGPD).
10.2. A CONTRATADA utilizará dados do CONTRATANTE exclusivamente para execução dos serviços contratados.
10.3. Dados serão armazenados de forma segura e não serão compartilhados com terceiros sem autorização, exceto quando exigido por lei.

CLÁUSULA 11ª - DAS RESPONSABILIDADES
11.1. A CONTRATADA não se responsabiliza por:
   a) Flutuações de mercado e variações cambiais;
   b) Valores enviados para endereços incorretos;
   c) Perdas decorrentes de ataques hackers em wallets do CONTRATANTE;
   d) Atrasos em transferências bancárias causados por instituições financeiras.

11.2. O CONTRATANTE é responsável por:
   a) Manter dados cadastrais atualizados;
   b) Garantir segurança de suas credenciais e wallets;
   c) Declarar origem lícita dos recursos;
   d) Cumprir obrigações fiscais e tributárias.

CLÁUSULA 12ª - DA VIGÊNCIA
12.1. O presente contrato entra em vigor na data de sua assinatura eletrônica.
12.2. O contrato possui prazo indeterminado, podendo ser rescindido por qualquer das partes mediante notificação prévia.

CLÁUSULA 13ª - DA RESCISÃO
13.1. O contrato pode ser rescindido imediatamente em caso de:
   a) Descumprimento de cláusulas contratuais;
   b) Suspeita de atividades ilícitas;
   c) Fornecimento de informações falsas;
   d) Determinação judicial ou de autoridade competente.

CLÁUSULA 14ª - DAS DISPOSIÇÕES GERAIS
14.1. Alterações contratuais devem ser formalizadas por escrito e aceitas por ambas as partes.
14.2. A tolerância de uma parte quanto ao descumprimento de obrigações não constitui novação ou renúncia de direitos.

CLÁUSULA 15ª - DO FORO
15.1. Fica eleito o foro da Comarca de São Paulo/SP para dirimir quaisquer controvérsias oriundas do presente contrato.

CLÁUSULA 16ª - DA ASSINATURA ELETRÔNICA
16.1. As partes concordam que a assinatura eletrônica deste contrato possui validade jurídica equivalente à assinatura manuscrita, nos termos da MP 2.200-2/2001 e Lei 14.063/2020.
16.2. A autenticidade da assinatura pode ser verificada através dos dados técnicos registrados (timestamp, IP, user-agent).

E, por estarem assim justos e contratados, as partes assinam eletronicamente o presente instrumento.`;

  const contractVariables = {
    nome: {
      label: 'Nome/Razão Social',
      type: 'string',
      source: 'applicant.company_name || applicant.full_name',
    },
    documento: {
      label: 'CPF/CNPJ',
      type: 'string',
      source: 'applicant.document_number',
    },
    doc_label: {
      label: 'Label do Documento',
      type: 'string',
      source: "applicant.applicant_type === 'individual' ? 'CPF' : 'CNPJ'",
    },
    tipo_cliente: {
      label: 'Tipo de Cliente',
      type: 'string',
      source: "applicant.applicant_type === 'individual' ? 'Pessoa Física' : 'Pessoa Jurídica'",
    },
    email: {
      label: 'Email',
      type: 'string',
      source: 'applicant.email',
    },
    telefone: {
      label: 'Telefone',
      type: 'string',
      source: 'applicant.phone',
    },
    data_assinatura: {
      label: 'Data de Assinatura',
      type: 'string',
      source: "new Date(signedAt).toLocaleString('pt-BR')",
    },
    ip: {
      label: 'Endereço IP',
      type: 'string',
      source: 'ip',
    },
    user_agent: {
      label: 'Navegador',
      type: 'string',
      source: 'userAgent',
    },
  };
  
  console.log('\n📄 Migrando template de contrato...');
  
  const { data: contractTemplate, error: contractError } = await supabase
    .from('contract_templates')
    .insert({
      template_type: 'contract',
      version: 1,
      title: 'Contrato de Prestação de Serviços de Liquidez em USDT',
      content: contractContent,
      variables: contractVariables,
      is_active: true,
      created_by: admin.id,
      activated_at: new Date().toISOString(),
      activated_by: admin.id,
    })
    .select()
    .single();
  
  if (contractError) {
    console.error('❌ Erro ao migrar contrato:', contractError);
  } else {
    console.log('✅ Template de contrato migrado:', contractTemplate.id);
  }
  
  // =====================================================
  // 2. Template de Termo de Wallet (simplificado)
  // =====================================================
  
  const walletTermContent = `TERMO DE RESPONSABILIDADE E ACEITE DE WALLET BLOCKCHAIN

{{nome}}, doravante denominado(a) CLIENTE, declara e aceita os seguintes termos:

1. PROPRIEDADE DA WALLET
O CLIENTE declara que é o(a) único(a) e legítimo(a) proprietário(a) da wallet blockchain de endereço {{wallet_address}}.

2. ORIGEM LÍCITA DOS RECURSOS
O CLIENTE declara que todos os recursos movimentados através da wallet cadastrada têm origem lícita e estão em conformidade com a legislação vigente.

3. RESPONSABILIDADE EXCLUSIVA
O CLIENTE assume total responsabilidade por todas as transações realizadas através da wallet cadastrada.

Data de aceite: {{data_assinatura}}
Endereço IP: {{ip}}`;

  const walletTermVariables = {
    nome: {
      label: 'Nome/Razão Social',
      type: 'string',
      source: 'applicant.company_name || applicant.full_name',
    },
    documento: {
      label: 'CPF/CNPJ',
      type: 'string',
      source: 'applicant.document_number',
    },
    wallet_address: {
      label: 'Endereço da Wallet',
      type: 'string',
      source: 'walletAddress',
    },
    data_assinatura: {
      label: 'Data de Assinatura',
      type: 'string',
      source: "new Date(signedAt).toLocaleString('pt-BR')",
    },
    ip: {
      label: 'Endereço IP',
      type: 'string',
      source: 'ip',
    },
  };
  
  console.log('\n📄 Migrando template de termo de wallet...');
  
  const { data: walletTemplate, error: walletError } = await supabase
    .from('contract_templates')
    .insert({
      template_type: 'wallet_term',
      version: 1,
      title: 'Termo de Responsabilidade e Aceite de Wallet Blockchain',
      content: walletTermContent,
      variables: walletTermVariables,
      is_active: true,
      created_by: admin.id,
      activated_at: new Date().toISOString(),
      activated_by: admin.id,
    })
    .select()
    .single();
  
  if (walletError) {
    console.error('❌ Erro ao migrar termo de wallet:', walletError);
  } else {
    console.log('✅ Template de termo de wallet migrado:', walletTemplate.id);
  }
  
  console.log('\n🎉 Migração concluída!');
}

migrateTemplates().catch(console.error);
