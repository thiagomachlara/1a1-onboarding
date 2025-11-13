import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixAddress() {
  console.log('🔄 Atualizando endereço da 1A1...\n');

  // Buscar template ativo
  const { data: template, error: fetchError } = await supabase
    .from('contract_templates')
    .select('*')
    .eq('template_type', 'contract')
    .eq('is_active', true)
    .single();

  if (fetchError || !template) {
    console.error('❌ Erro ao buscar template:', fetchError);
    return;
  }

  console.log(`📄 Template atual: v${template.version}`);

  // Substituir endereço
  const oldAddress = 'Rua Visconde de Guarapuava, 3.400, Sala 1.708, Centro, Curitiba/PR, CEP 80.010-100';
  const newAddress = 'Av. Anita Garibaldi, 850, Sala 213A, Cabral, Curitiba/PR, CEP 80.540-400';

  const updatedContent = template.content.replace(oldAddress, newAddress);

  if (updatedContent === template.content) {
    console.log('⚠️  Endereço antigo não encontrado no template');
    console.log('   Verificando se já está correto...');
    if (template.content.includes(newAddress)) {
      console.log('✅ Endereço já está correto!');
      return;
    } else {
      console.log('❌ Endereço não encontrado. Conteúdo atual:');
      console.log(template.content.substring(0, 500));
      return;
    }
  }

  // Atualizar template
  const { error: updateError } = await supabase
    .from('contract_templates')
    .update({ content: updatedContent })
    .eq('id', template.id);

  if (updateError) {
    console.error('❌ Erro ao atualizar:', updateError);
    return;
  }

  console.log('✅ Endereço atualizado com sucesso!');
  console.log(`   De: ${oldAddress}`);
  console.log(`   Para: ${newAddress}`);
}

fixAddress().catch(console.error);
