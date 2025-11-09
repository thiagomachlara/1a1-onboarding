import { createClient } from '@supabase/supabase-js';
import { enriquecerEndereco } from '../src/lib/address-enrichment-v2';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function reEnrichAddresses() {
  console.log('🚀 Iniciando re-enriquecimento de endereços...\n');

  // Buscar todas as empresas aprovadas
  const { data: companies, error } = await supabase
    .from('applicants')
    .select('id, external_user_id, company_name, document_number, enriched_street')
    .eq('current_status', 'approved')
    .order('company_name');

  if (error) {
    console.error('❌ Erro ao buscar empresas:', error);
    return;
  }

  console.log(`📊 Total de empresas aprovadas: ${companies.length}\n`);

  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (const company of companies) {
    console.log(`\n--- ${company.company_name} (${company.document_number}) ---`);
    
    try {
      // Enriquecer endereço
      const enrichedData = await enriquecerEndereco(company.document_number);

      if (!enrichedData) {
        console.log('⚠️  Falha ao enriquecer (sem dados)');
        failed++;
        continue;
      }

      // Verificar se houve melhoria
      const oldStreet = company.enriched_street || '';
      const newStreet = enrichedData.logradouro;

      if (oldStreet === newStreet) {
        console.log(`⏭️  Pulado (endereço já está correto)`);
        skipped++;
        continue;
      }

      console.log(`📍 Antigo: ${oldStreet}`);
      console.log(`📍 Novo:   ${newStreet}`);

      // Atualizar no banco de dados
      const { error: updateError } = await supabase
        .from('applicants')
        .update({
          enriched_street: enrichedData.logradouro,
          enriched_number: enrichedData.numero,
          enriched_complement: enrichedData.complemento,
          enriched_neighborhood: enrichedData.bairro,
          enriched_city: enrichedData.cidade,
          enriched_state: enrichedData.estado,
          enriched_postal_code: enrichedData.cep,
          enriched_source: enrichedData.fonte_primaria,
          enriched_at: new Date().toISOString(),
        })
        .eq('id', company.id);

      if (updateError) {
        console.log(`❌ Erro ao atualizar: ${updateError.message}`);
        failed++;
      } else {
        console.log('✅ Atualizado com sucesso!');
        success++;
      }

      // Aguardar 500ms entre requisições para não sobrecarregar APIs
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (err) {
      console.log(`❌ Erro: ${err}`);
      failed++;
    }
  }

  console.log('\n\n=== RESUMO ===');
  console.log(`✅ Sucesso: ${success}`);
  console.log(`⏭️  Pulados: ${skipped}`);
  console.log(`❌ Falhas:  ${failed}`);
  console.log(`📊 Total:   ${companies.length}`);
}

reEnrichAddresses()
  .then(() => {
    console.log('\n🎉 Re-enriquecimento concluído!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Erro fatal:', err);
    process.exit(1);
  });
