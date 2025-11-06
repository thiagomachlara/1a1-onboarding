import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getApplicantData } from '@/lib/sumsub-api';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
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

export async function POST(request: Request) {
  try {
    const results = {
      updated: 0,
      skipped: 0,
      errors: 0,
      details: [] as any[],
    };

    // Buscar todas as empresas aprovadas
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
      return NextResponse.json({
        success: true,
        message: 'Nenhuma empresa aprovada encontrada',
        results,
      });
    }

    // Para cada empresa, buscar dados do Sumsub e atualizar
    for (const applicant of applicants as Applicant[]) {
      try {
        const detail: any = {
          company: applicant.company_name || applicant.id,
          applicant_id: applicant.applicant_id,
          changes: [],
        };

        // Buscar dados do Sumsub
        const sumsubData = await getApplicantData(applicant.applicant_id);

        // Preparar dados para atualização
        const updates: any = {};
        let hasChanges = false;

        // CNPJ
        if (sumsubData.registrationNumber && sumsubData.registrationNumber !== applicant.document_number) {
          updates.document_number = sumsubData.registrationNumber;
          detail.changes.push({
            field: 'CNPJ',
            from: applicant.document_number || 'N/A',
            to: sumsubData.registrationNumber,
          });
          hasChanges = true;
        }

        // Email (limpar "Profile image" e outros problemas)
        if (sumsubData.email) {
          const cleanEmail = sumsubData.email.replace(/Profile image/gi, '').trim();
          if (cleanEmail !== applicant.email) {
            updates.email = cleanEmail;
            detail.changes.push({
              field: 'Email',
              from: applicant.email || 'N/A',
              to: cleanEmail,
            });
            hasChanges = true;
          }
        }

        // Nome da empresa
        if (sumsubData.companyName && sumsubData.companyName !== applicant.company_name) {
          updates.company_name = sumsubData.companyName;
          detail.changes.push({
            field: 'Nome',
            from: applicant.company_name || 'N/A',
            to: sumsubData.companyName,
          });
          hasChanges = true;
        }

        // Telefone
        if (sumsubData.phone && sumsubData.phone !== applicant.phone) {
          updates.phone = sumsubData.phone;
          detail.changes.push({
            field: 'Telefone',
            from: applicant.phone || 'N/A',
            to: sumsubData.phone,
          });
          hasChanges = true;
        }

        // Nome do UBO
        if (sumsubData.uboName && sumsubData.uboName !== applicant.ubo_name) {
          updates.ubo_name = sumsubData.uboName;
          detail.changes.push({
            field: 'UBO',
            from: applicant.ubo_name || 'N/A',
            to: sumsubData.uboName,
          });
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

          results.updated++;
          detail.status = 'updated';
        } else {
          results.skipped++;
          detail.status = 'skipped';
        }

        results.details.push(detail);

        // Aguardar 500ms entre requisições
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error: any) {
        results.errors++;
        results.details.push({
          company: applicant.company_name || applicant.id,
          applicant_id: applicant.applicant_id,
          status: 'error',
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Atualização concluída: ${results.updated} atualizadas, ${results.skipped} sem mudanças, ${results.errors} erros`,
      results,
    });

  } catch (error: any) {
    console.error('Error updating companies:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar empresas', details: error.message },
      { status: 500 }
    );
  }
}
