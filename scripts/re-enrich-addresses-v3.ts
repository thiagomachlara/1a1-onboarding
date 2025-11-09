import { createClient } from '@supabase/supabase-js';
import { consultarCEP } from '../src/lib/viacep';
import { normalizeAddress } from '../src/lib/text-normalization';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function reEnrichAddresses() {
  console.log('🚀 Iniciando re-enriquecimento de endereços (V3 - com normalização profissional)...\n');

  // Buscar todas as empresas aprovadas com CEP
  const { data: companies, error } = await supabase
    .from('applicants')
    .select('id, company_name, document_number, enriched_street, enriched_postal_code, enriched_number, enriched_complement, enriched_neighborhood, enriched_city, enriched_state')
    .eq('current_status', 'approved')
    .not('enriched_postal_code', 'is', null)
    .order('company_name');

  if (error) {
    console.error('❌ Erro ao buscar empresas:', error);
    return;
  }

  console.log(`📊 Total de empresas aprovadas com CEP: ${companies.length}\n`);

  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (const company of companies) {
    console.log(`\n--- ${company.company_name} ---`);
    
    try {
      const cep = company.enriched_postal_code;
      
      if (!cep) {
        console.log('⚠️  Sem CEP no banco de dados');
        skipped++;
        continue;
      }

      console.log(`📮 CEP: ${cep}`);

      // Consultar ViaCEP
      const viaCepData = await consultarCEP(cep);

      // Normalizar dados atuais do banco
      const normalized = normalizeAddress({
        logradouro: viaCepData?.logradouro || company.enriched_street,
        numero: company.enriched_number,
        complemento: company.enriched_complement,
        bairro: viaCepData?.bairro || company.enriched_neighborhood,
        cidade: viaCepData?.localidade || company.enriched_city,
        estado: company.enriched_state,
        cep: cep,
      });

      // Verificar se houve mudança
      const oldStreet = company.enriched_street || '';
      const oldComplement = company.enriched_complement || '';
      const newStreet = normalized.logradouro;
      const newComplement = normalized.complemento;

      if (oldStreet === newStreet && oldComplement === newComplement) {
        console.log(`⏭️  Pulado (endereço já está normalizado)`);
        skipped++;
        continue;
      }

      console.log(`📍 Logradouro:`);
      console.log(`   Antigo: ${oldStreet}`);
      console.log(`   Novo:   ${newStreet}`);
      
      if (oldComplement !== newComplement) {
        console.log(`📍 Complemento:`);
        console.log(`   Antigo: ${oldComplement}`);
        console.log(`   Novo:   ${newComplement}`);
      }

      // Atualizar todos os campos normalizados
      const { error: updateError } = await supabase
        .from('applicants')
        .update({
          enriched_street: normalized.logradouro,
          enriched_number: normalized.numero,
          enriched_complement: normalized.complemento,
          enriched_neighborhood: normalized.bairro,
          enriched_city: normalized.cidade,
          enriched_state: normalized.estado,
          enriched_source: viaCepData ? 'viacep' : 'receita_federal',
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

      // Aguardar 300ms entre requisições para não sobrecarregar ViaCEP
      await new Promise(resolve => setTimeout(resolve, 300));

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
