import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateContractTemplate() {
  console.log('🔄 Atualizando template de contrato...\n');

  // Ler contrato extraído
  const contractPath = '/tmp/contrato-extraido.txt';
  const contractContent = fs.readFileSync(contractPath, 'utf-8');

  console.log(`📄 Contrato extraído: ${contractContent.length} caracteres\n`);

  // Criar template completo com variáveis
  const fullTemplate = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE LIQUIDEZ EM USDT

CONTRATANTE: {{nome}}, {{doc_label}} nº {{documento}}, {{tipo_cliente}}
E-mail: {{email}}
{{representante_legal}}

CONTRATADA: 1A1 INTERMEDIAÇÃO LTDA
CNPJ: 31.305.403/0001-72
Endereço: Rua Visconde de Guarapuava, 3.400, Sala 1.708, Centro, Curitiba/PR, CEP 80.010-100

---

${contractContent}

---

ASSINATURA ELETRÔNICA

Ao clicar em "Assinar Contrato", o CONTRATANTE declara ter lido, compreendido e concordado integralmente com todos os termos e condições deste contrato.

Data da assinatura: {{data_assinatura}}
IP de assinatura: {{ip_assinatura}}
`;

  // Variáveis do template
  const variables = {
    nome: 'Nome completo ou Razão Social',
    documento: 'CPF ou CNPJ',
    doc_label: 'CPF ou CNPJ',
    tipo_cliente: 'Pessoa Física ou Pessoa Jurídica',
    email: 'Email do contratante',
    representante_legal: 'Nome do representante legal (se PJ)',
    data_assinatura: 'Data e hora da assinatura',
    ip_assinatura: 'Endereço IP da assinatura'
  };

  // Desativar template atual
  console.log('1️⃣ Desativando template atual...');
  const { error: deactivateError } = await supabase
    .from('contract_templates')
    .update({ is_active: false })
    .eq('template_type', 'contract')
    .eq('is_active', true);

  if (deactivateError) {
    console.error('❌ Erro ao desativar template:', deactivateError);
    return;
  }
  console.log('✅ Template atual desativado\n');

  // Buscar versão mais recente
  const { data: latestTemplate } = await supabase
    .from('contract_templates')
    .select('version')
    .eq('template_type', 'contract')
    .order('version', { ascending: false })
    .limit(1)
    .single();

  const newVersion = (latestTemplate?.version || 1) + 1;

  // Buscar created_by do template anterior
  const { data: previousTemplate } = await supabase
    .from('contract_templates')
    .select('created_by')
    .eq('template_type', 'contract')
    .limit(1)
    .single();

  const createdBy = previousTemplate?.created_by || null;
  console.log(`   Created by: ${createdBy}`);

  // Criar nova versão
  console.log(`2️⃣ Criando nova versão (v${newVersion})...`);
  const { data: newTemplate, error: insertError } = await supabase
    .from('contract_templates')
    .insert({
      template_type: 'contract',
      version: newVersion,
      title: 'Contrato de Prestação de Serviços de Liquidez em USDT',
      content: fullTemplate,
      variables: variables,
      is_active: true,
      created_by: createdBy
    })
    .select()
    .single();

  if (insertError) {
    console.error('❌ Erro ao criar nova versão:', insertError);
    return;
  }

  console.log('✅ Nova versão criada com sucesso!\n');
  console.log('📊 Detalhes:');
  console.log(`   - ID: ${newTemplate.id}`);
  console.log(`   - Versão: ${newTemplate.version}`);
  console.log(`   - Tamanho: ${fullTemplate.length} caracteres`);
  console.log(`   - Ativo: ${newTemplate.is_active}`);
  console.log('\n✅ Template atualizado com sucesso!');
}

updateContractTemplate().catch(console.error);
