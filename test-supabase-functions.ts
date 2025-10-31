/**
 * Script de teste para funções do Supabase
 * 
 * Uso: npx tsx test-supabase-functions.ts
 */

import {
  upsertApplicant,
  getApplicantByExternalUserId,
  addVerificationHistory,
  getVerificationHistory,
  getApplicantFull,
  getVerificationStats,
  countApplicants,
  type Applicant,
  type VerificationHistory,
} from './src/lib/supabase-db';

async function main() {
  console.log('=== Testando Funções do Supabase ===\n');

  const testExternalUserId = `cpf_${Date.now()}`;
  const testApplicantId = `test_${Date.now()}`;

  try {
    // 1. Criar applicant
    console.log('1. Criando applicant...');
    const newApplicant: Applicant = {
      external_user_id: testExternalUserId,
      applicant_id: testApplicantId,
      applicant_type: 'individual',
      current_status: 'created',
      full_name: 'João da Silva Teste',
      email: 'joao.teste@example.com',
      phone: '+5511999999999',
      document_number: '12345678900',
    };

    const created = await upsertApplicant(newApplicant);
    console.log('✅ Applicant criado:', created.id);
    console.log('');

    // Usar o UUID do banco, não o applicant_id do Sumsub
    const applicantUuid = created.id;

    // 2. Buscar applicant
    console.log('2. Buscando applicant...');
    const found = await getApplicantByExternalUserId(testExternalUserId);
    console.log('✅ Applicant encontrado:', found?.full_name);
    console.log('');

    // 3. Adicionar histórico
    console.log('3. Adicionando histórico...');
    const history: VerificationHistory = {
      applicant_id: applicantUuid,
      event_type: 'applicantCreated',
      new_status: 'created',
      webhook_payload: { test: true },
    };

    await addVerificationHistory(history);
    console.log('✅ Histórico adicionado');
    console.log('');

    // 4. Atualizar para pending
    console.log('4. Atualizando para pending...');
    await upsertApplicant({
      external_user_id: testExternalUserId,
      applicant_type: 'individual',
      current_status: 'pending',
    });
    console.log('✅ Status atualizado');
    console.log('');

    // 5. Adicionar histórico de pending
    console.log('5. Adicionando histórico de pending...');
    await addVerificationHistory({
      applicant_id: applicantUuid,
      event_type: 'applicantPending',
      old_status: 'created',
      new_status: 'pending',
      webhook_payload: { test: true },
    });
    console.log('✅ Histórico adicionado');
    console.log('');

    // 6. Aprovar applicant
    console.log('6. Aprovando applicant...');
    await upsertApplicant({
      external_user_id: testExternalUserId,
      applicant_type: 'individual',
      current_status: 'approved',
      review_answer: 'GREEN',
      approved_at: new Date().toISOString(),
    });
    console.log('✅ Applicant aprovado');
    console.log('');

    // 7. Adicionar histórico de aprovação
    console.log('7. Adicionando histórico de aprovação...');
    await addVerificationHistory({
      applicant_id: applicantUuid,
      event_type: 'applicantReviewed',
      old_status: 'pending',
      new_status: 'approved',
      review_answer: 'GREEN',
      webhook_payload: { test: true },
    });
    console.log('✅ Histórico adicionado');
    console.log('');

    // 8. Buscar histórico completo
    console.log('8. Buscando histórico completo...');
    const fullHistory = await getVerificationHistory(applicantUuid);
    console.log(`✅ Encontrados ${fullHistory.length} eventos no histórico`);
    fullHistory.forEach((event, index) => {
      console.log(`   ${index + 1}. ${event.event_type} (${event.old_status} → ${event.new_status})`);
    });
    console.log('');

    // 9. Buscar dados completos
    console.log('9. Buscando dados completos (view)...');
    const fullData = await getApplicantFull(testExternalUserId);
    console.log('✅ Dados completos:', {
      name: fullData?.full_name,
      status: fullData?.current_status,
      review_answer: fullData?.review_answer,
    });
    console.log('');

    // 10. Buscar estatísticas
    console.log('10. Buscando estatísticas...');
    const stats = await getVerificationStats();
    console.log('✅ Estatísticas:');
    stats.forEach((stat) => {
      console.log(`   ${stat.applicant_type} - ${stat.current_status}: ${stat.count}`);
    });
    console.log('');

    // 11. Contar applicants
    console.log('11. Contando applicants...');
    const totalCount = await countApplicants();
    const approvedCount = await countApplicants({ status: 'approved' });
    console.log(`✅ Total: ${totalCount} applicants`);
    console.log(`✅ Aprovados: ${approvedCount} applicants`);
    console.log('');

    console.log('=== ✅ Todos os testes passaram! ===');
  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
    process.exit(1);
  }
}

main();

