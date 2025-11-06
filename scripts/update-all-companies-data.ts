/**
 * Script para atualizar dados de todas as empresas aprovadas com informações do Sumsub
 * 
 * Corrige:
 * - CNPJ (document_number)
 * - Email (remove "Profile image" e outros problemas)
 * - Nome da empresa
 * - Telefone
 * - Nome do UBO
 * 
 * USO:
 * SUPABASE_URL=xxx SUPABASE_KEY=xxx SUMSUB_TOKEN=xxx SUMSUB_SECRET=xxx npx tsx scripts/update-all-companies-data.ts
 */

import { createClient } from '@supabase/supabase-js';
import { getApplicantData } from '../src/lib/sumsub-api';

// Verificar variáveis de ambiente
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL não definida');
  console.log('\n💡 Use:\n');
  console.log('NEXT_PUBLIC_SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx SUMSUB_APP_TOKEN=xxx SUMSUB_SECRET_KEY=xxx npx tsx scripts/update-all-companies-data.ts\n');
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface Applicant {
  id: string;
  applicant_id: string;
  company_name?: string;
  document_number?: string;
  email?: string;
  phone?: string;
  ubo_name?: string;
}

async function updateAllCompaniesData() {
  console.log('🚀 Iniciando atualização de dados das empresas...\n');

  try {
    // 1. Buscar todas as empresas aprovadas
    const { data: applicants, error } = await supabase
      .from('applicants')
      .select('id, applicant_id, company_name, document_number, email, phone, ubo_name')
      .eq('applicant_type', 'company')
      .eq('current_status', 'approved')
      .not('applicant_id', 'is', null);

    if (error) {
      throw new Error(`Erro ao buscar empresas: ${error.message}`);
    }

    if (!applicants || applicants.length === 0) {
      console.log('⚠️  Nenhuma empresa aprovada encontrada.');
      return;
    }

    console.log(`📊 Total de empresas aprovadas: ${applicants.length}\n`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    // 2. Para cada empresa, buscar dados do Sumsub e atualizar
    for (const applicant of applicants as Applicant[]) {
      try {
        console.log(`\n📝 Processando: ${applicant.company_name || applicant.id}`);
        console.log(`   Applicant ID: ${applicant.applicant_id}`);

        // Buscar dados do Sumsub
        const sumsubData = await getApplicantData(applicant.applicant_id);

        // Preparar dados para atualização
        const updates: any = {};
        let hasChanges = false;

        // CNPJ
        if (sumsubData.registrationNumber && sumsubData.registrationNumber !== applicant.document_number) {
          updates.document_number = sumsubData.registrationNumber;
          console.log(`   ✅ CNPJ: ${applicant.document_number || 'N/A'} → ${sumsubData.registrationNumber}`);
          hasChanges = true;
        }

        // Email (limpar "Profile image" e outros problemas)
        if (sumsubData.email) {
          const cleanEmail = sumsubData.email.replace(/Profile image/gi, '').trim();
          if (cleanEmail !== applicant.email) {
            updates.email = cleanEmail;
            console.log(`   ✅ Email: ${applicant.email || 'N/A'} → ${cleanEmail}`);
            hasChanges = true;
          }
        }

        // Nome da empresa
        if (sumsubData.companyName && sumsubData.companyName !== applicant.company_name) {
          updates.company_name = sumsubData.companyName;
          console.log(`   ✅ Nome: ${applicant.company_name || 'N/A'} → ${sumsubData.companyName}`);
          hasChanges = true;
        }

        // Telefone
        if (sumsubData.phone && sumsubData.phone !== applicant.phone) {
          updates.phone = sumsubData.phone;
          console.log(`   ✅ Telefone: ${applicant.phone || 'N/A'} → ${sumsubData.phone}`);
          hasChanges = true;
        }

        // Nome do UBO
        if (sumsubData.uboName && sumsubData.uboName !== applicant.ubo_name) {
          updates.ubo_name = sumsubData.uboName;
          console.log(`   ✅ UBO: ${applicant.ubo_name || 'N/A'} → ${sumsubData.uboName}`);
          hasChanges = true;
        }

        // Atualizar no banco se houver mudanças
        if (hasChanges) {
          const { error: updateError } = await supabase
            .from('applicants')
            .update(updates)
            .eq('id', applicant.id);

          if (updateError) {
            throw new Error(`Erro ao atualizar: ${updateError.message}`);
          }

          updated++;
          console.log(`   ✅ Dados atualizados com sucesso!`);
        } else {
          skipped++;
          console.log(`   ⏭️  Sem mudanças necessárias`);
        }

        // Aguardar 500ms entre requisições para não sobrecarregar API
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error: any) {
        errors++;
        console.error(`   ❌ Erro ao processar: ${error.message}`);
      }
    }

    // 3. Resumo final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO DA ATUALIZAÇÃO');
    console.log('='.repeat(60));
    console.log(`✅ Empresas atualizadas: ${updated}`);
    console.log(`⏭️  Empresas sem mudanças: ${skipped}`);
    console.log(`❌ Erros: ${errors}`);
    console.log(`📊 Total processado: ${applicants.length}`);
    console.log('='.repeat(60) + '\n');

  } catch (error: any) {
    console.error('❌ Erro fatal:', error.message);
    process.exit(1);
  }
}

// Executar script
updateAllCompaniesData()
  .then(() => {
    console.log('✅ Script finalizado com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script falhou:', error);
    process.exit(1);
  });
