import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const SUMSUB_APP_TOKEN = process.env.SUMSUB_APP_TOKEN!;
const SUMSUB_SECRET_KEY = process.env.SUMSUB_SECRET_KEY!;
const SUMSUB_BASE_URL = 'https://api.sumsub.com';

/**
 * Gera assinatura HMAC SHA256 para autenticação na API Sumsub
 */
function generateSignature(method: string, path: string, timestamp: number, body?: string): string {
  const data = timestamp + method.toUpperCase() + path + (body || '');
  return crypto
    .createHmac('sha256', SUMSUB_SECRET_KEY)
    .update(data)
    .digest('hex');
}

/**
 * Faz requisição autenticada para a API Sumsub
 */
async function sumsubRequest(method: string, path: string, body?: any) {
  const timestamp = Math.floor(Date.now() / 1000);
  const bodyString = body ? JSON.stringify(body) : undefined;
  const signature = generateSignature(method, path, timestamp, bodyString);

  const headers: Record<string, string> = {
    'X-App-Token': SUMSUB_APP_TOKEN,
    'X-App-Access-Sig': signature,
    'X-App-Access-Ts': timestamp.toString(),
    'Content-Type': 'application/json',
  };

  const response = await fetch(`${SUMSUB_BASE_URL}${path}`, {
    method,
    headers,
    body: bodyString,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Sumsub API error: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * POST /api/companies/[id]/sync
 * 
 * Sincroniza dados de UMA empresa específica com a Sumsub
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log(`[COMPANY-SYNC] Sincronizando empresa: ${id}`);

    // Buscar empresa no banco
    const { data: applicant, error: fetchError } = await supabase
      .from('applicants')
      .select('id, applicant_id, company_name, document_number, email, phone, address, city, state, postal_code, country')
      .eq('id', id)
      .eq('applicant_type', 'company')
      .single();

    if (fetchError || !applicant) {
      return NextResponse.json(
        { success: false, error: 'Empresa não encontrada' },
        { status: 404 }
      );
    }

    if (!applicant.applicant_id) {
      return NextResponse.json(
        { success: false, error: 'Empresa não possui applicant_id da Sumsub' },
        { status: 400 }
      );
    }

    const result: any = {
      company: applicant.company_name || applicant.id,
      applicant_id: applicant.applicant_id,
      changes: [],
    };

    // Buscar dados completos do Sumsub
    const path = `/resources/applicants/${applicant.applicant_id}/one`;
    const data = await sumsubRequest('GET', path);

    console.log(`[COMPANY-SYNC] Dados recebidos da Sumsub`);

    // Preparar dados para atualização
    const updates: any = {};
    let hasChanges = false;

    // Extrair dados da empresa
    const companyInfo = data.info?.companyInfo || {};
    const fixedCompanyInfo = data.fixedInfo?.companyInfo || {};

    // CNPJ
    const cnpj = companyInfo.registrationNumber;
    if (cnpj && cnpj !== applicant.document_number) {
      updates.document_number = cnpj;
      result.changes.push({ field: 'CNPJ', from: applicant.document_number || 'N/A', to: cnpj });
      hasChanges = true;
    }

    // Email
    const correctEmail = data.email || null;
    if (correctEmail && correctEmail !== applicant.email) {
      updates.email = correctEmail;
      result.changes.push({ field: 'Email', from: applicant.email || 'N/A', to: correctEmail });
      hasChanges = true;
    }

    // Nome da empresa
    const companyName = companyInfo.companyName;
    if (companyName && companyName !== applicant.company_name) {
      updates.company_name = companyName;
      result.changes.push({ field: 'Nome', from: applicant.company_name || 'N/A', to: companyName });
      hasChanges = true;
    }

    // Telefone
    const phone = data.info?.phone || companyInfo.phone;
    if (phone && phone !== applicant.phone) {
      updates.phone = phone;
      result.changes.push({ field: 'Telefone', from: applicant.phone || 'N/A', to: phone });
      hasChanges = true;
    }

    // Endereço
    const postalAddress = companyInfo.postalAddress;
    if (postalAddress && postalAddress !== applicant.address) {
      updates.address = postalAddress;
      result.changes.push({ field: 'Endereço', from: applicant.address || 'N/A', to: postalAddress });
      hasChanges = true;
    }

    // País
    const country = companyInfo.country || fixedCompanyInfo.country;
    if (country && country !== applicant.country) {
      updates.country = country;
      result.changes.push({ field: 'País', from: applicant.country || 'N/A', to: country });
      hasChanges = true;
    }

    // Atualizar data de sincronização
    updates.last_sync_date = new Date().toISOString();

    // Atualizar empresa no banco
    if (hasChanges) {
      const { error: updateError } = await supabase
        .from('applicants')
        .update(updates)
        .eq('id', applicant.id);

      if (updateError) {
        throw new Error(`Erro ao atualizar empresa: ${updateError.message}`);
      }

      console.log(`[COMPANY-SYNC] ✓ Empresa atualizada: ${applicant.company_name}`);
    } else {
      console.log(`[COMPANY-SYNC] ✓ Nenhuma mudança necessária: ${applicant.company_name}`);
    }

    // Sincronizar UBOs
    const beneficiaries = fixedCompanyInfo.beneficiaries || [];
    
    if (beneficiaries.length > 0) {
      console.log(`[COMPANY-SYNC] Sincronizando ${beneficiaries.length} UBOs...`);
      
      for (const beneficiary of beneficiaries) {
        const ubo = beneficiary.beneficiaryInfo || {};
        
        // Buscar dados completos do UBO individual (incluindo endereço, STATUS e NOME COMPLETO)
        let uboAddress = null;
        let uboStatus = 'not_submitted';
        let verifiedFirstName = ubo.firstName;
        let verifiedMiddleName = ubo.middleName;
        let verifiedLastName = ubo.lastName;
        
        try {
          const uboPath = `/resources/applicants/${beneficiary.applicantId}/one`;
          const uboResponse = await sumsubRequest('GET', uboPath);
          const uboData = uboResponse.list?.items?.[0] || uboResponse;
          
          // Extrair status real do UBO
          if (uboData.review) {
            const reviewAnswer = uboData.review.reviewResult?.reviewAnswer;
            const reviewStatus = uboData.review.reviewStatus;
            
            if (reviewAnswer === 'GREEN') {
              uboStatus = 'approved';
            } else if (reviewAnswer === 'RED') {
              uboStatus = 'rejected';
            } else if (reviewAnswer === 'YELLOW') {
              uboStatus = 'pending';
            } else if (reviewStatus === 'pending' || reviewStatus === 'init') {
              uboStatus = 'pending';
            }
            
            console.log(`[UBO-STATUS] ${ubo.firstName} ${ubo.lastName}: ${reviewAnswer} → ${uboStatus}`);
          console.log(`[UBO-DATA-DEBUG] Resposta completa da Sumsub:`, JSON.stringify(uboData, null, 2));
          }
          
          // Extrair NOME COMPLETO VERIFICADO
          // A Sumsub retorna o nome completo no campo firstName de info (Personal data)
          // Prioridade: info.firstName (dados verificados) > fixedInfo > beneficiaryInfo (fallback)
          let nameExtracted = false;
          
          // 1. Tentar extrair de info.firstName (Personal data - dados verificados do documento)
          if (uboData.info?.firstName) {
            const fullName = uboData.info.firstName.trim();
            // Verificar se é nome completo (tem mais de 2 palavras)
            const nameParts = fullName.split(' ').filter(Boolean);
            
            if (nameParts.length >= 3) {
              // Nome completo: "THIAGO MACHADO DE LARA"
              verifiedFirstName = nameParts[0];
              verifiedLastName = nameParts[nameParts.length - 1];
              verifiedMiddleName = nameParts.slice(1, -1).join(' ');
              nameExtracted = true;
              console.log(`[UBO-NAME] ✓ Extraído de info.firstName: ${verifiedFirstName} ${verifiedMiddleName} ${verifiedLastName}`);
            } else if (nameParts.length === 2) {
              // Nome simples: "THIAGO LARA"
              verifiedFirstName = nameParts[0];
              verifiedLastName = nameParts[1];
              verifiedMiddleName = null;
              nameExtracted = true;
              console.log(`[UBO-NAME] ✓ Extraído de info.firstName (sem nome do meio): ${verifiedFirstName} ${verifiedLastName}`);
            }
          }
          
          // 2. Se não encontrou em info, tentar fixedInfo
          if (!nameExtracted && (uboData.fixedInfo?.firstName || uboData.fixedInfo?.lastName)) {
            verifiedFirstName = uboData.fixedInfo.firstName || verifiedFirstName;
            verifiedMiddleName = uboData.fixedInfo.middleName || verifiedMiddleName;
            verifiedLastName = uboData.fixedInfo.lastName || verifiedLastName;
            console.log(`[UBO-NAME] ⚠️  Usando fixedInfo: ${verifiedFirstName} ${verifiedMiddleName || ''} ${verifiedLastName}`);
          }
          
          // Extrair endereço do UBO
          const addresses = uboData.fixedInfo?.addresses || 
                            uboData.info?.addresses || 
                            uboData.addresses || 
                            [];
          
          if (addresses.length > 0) {
            const addr = addresses[0];
            uboAddress = {
              address: [addr.street, addr.subStreet, addr.buildingNumber, addr.flatNumber].filter(Boolean).join(', '),
              city: addr.town,
              state: addr.state,
              postal_code: addr.postCode,
              country: addr.country
            };
          }
        } catch (error) {
          console.log(`[COMPANY-SYNC] ⚠️  Não foi possível buscar dados completos do UBO ${beneficiary.applicantId}:`, error);
        }
        
        // Verificar se UBO já existe
        const { data: existingUBO } = await supabase
          .from('beneficial_owners')
          .select('id')
          .eq('company_id', applicant.id)
          .eq('applicant_id', beneficiary.applicantId)
          .single();

        const uboData = {
          company_id: applicant.id,
          applicant_id: beneficiary.applicantId,
          first_name: verifiedFirstName,
          middle_name: verifiedMiddleName,
          last_name: verifiedLastName,
          tin: ubo.tin,
          dob: ubo.dob,
          nationality: ubo.nationality,
          email: ubo.email,
          phone: ubo.phone,
          share_size: beneficiary.shareSize || ubo.shareSize,
          types: beneficiary.types || null,
          relation: null,
          submitted: beneficiary.submitted || false,
          verification_status: uboStatus,
          address: uboAddress?.address || null,
          city: uboAddress?.city || null,
          state: uboAddress?.state || null,
          postal_code: uboAddress?.postal_code || null,
          country: uboAddress?.country || null,
        };

        if (existingUBO) {
          await supabase
            .from('beneficial_owners')
            .update(uboData)
            .eq('id', existingUBO.id);
          console.log(`[COMPANY-SYNC] ✓ UBO atualizado: ${verifiedFirstName} ${verifiedLastName}`);
        } else {
          await supabase
            .from('beneficial_owners')
            .insert(uboData);
          console.log(`[COMPANY-SYNC] ✓ UBO criado: ${verifiedFirstName} ${verifiedLastName}`);
        }
      }
    }

    // 3. Sincronizar documentos da empresa e UBOs
    console.log('[COMPANY-SYNC] Sincronizando documentos...');
    let documentsCount = 0;
    try {
      const { syncAllDocuments } = await import('@/lib/sync-documents');
      const docResult = await syncAllDocuments(id);
      documentsCount = docResult.totalSuccess;
      console.log(`[COMPANY-SYNC] ✓ ${documentsCount} documentos sincronizados (${docResult.companyDocs} empresa, ${docResult.uboDocs} UBOs)`);
    } catch (docError) {
      console.error('[COMPANY-SYNC] Erro ao sincronizar documentos:', docError);
      // Não falhar a sincronização se documentos falharem
    }

    return NextResponse.json({
      success: true,
      message: hasChanges ? 'Empresa sincronizada com sucesso' : 'Empresa já está atualizada',
      result,
      documentsCount,
    });

  } catch (error: any) {
    console.error('[COMPANY-SYNC] Erro:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao sincronizar empresa' },
      { status: 500 }
    );
  }
}
