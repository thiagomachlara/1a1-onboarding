import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const SUMSUB_APP_TOKEN = process.env.SUMSUB_APP_TOKEN!;
const SUMSUB_SECRET_KEY = process.env.SUMSUB_SECRET_KEY!;
const SUMSUB_BASE_URL = 'https://api.sumsub.com';

import crypto from 'crypto';

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

interface Applicant {
  id: string;
  applicant_id: string;
  company_name?: string;
  document_number?: string;
  email?: string;
  phone?: string;
  ubo_name?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
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
      .select('id, applicant_id, company_name, document_number, email, phone, ubo_name, address, city, state, postal_code, country')
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

    console.log(`[UPDATE-COMPANIES] Processando ${applicants.length} empresas...`);

    // Para cada empresa, buscar dados do Sumsub e atualizar
    for (const applicant of applicants as Applicant[]) {
      try {
        const detail: any = {
          company: applicant.company_name || applicant.id,
          applicant_id: applicant.applicant_id,
          uuid: applicant.id,
          changes: [],
        };

        // Buscar dados completos do Sumsub usando /one
        const path = `/resources/applicants/${applicant.applicant_id}/one`;
        const data = await sumsubRequest('GET', path);
        
        console.log(`[SYNC-DEBUG] ${applicant.company_name} - hasInfo: ${!!data.info}, hasRequiredIdDocs: ${!!data.requiredIdDocs}`);

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
          detail.changes.push({
            field: 'CNPJ',
            from: applicant.document_number || 'N/A',
            to: cnpj,
          });
          hasChanges = true;
        }

        // Email - USAR data.email (nível raiz) que é o email verificado do UBO
        const correctEmail = data.email || null;
        
        console.log(`[EMAIL-CHECK] ${applicant.company_name}:`);
        console.log(`  - data.email (CORRETO): "${correctEmail}"`);
        console.log(`  - Current DB: "${applicant.email}"`);
        
        if (correctEmail && correctEmail !== applicant.email) {
          updates.email = correctEmail;
          detail.changes.push({
            field: 'Email',
            from: applicant.email || 'N/A',
            to: correctEmail,
          });
          hasChanges = true;
          console.log(`  - ✓ Will update email`);
        } else {
          console.log(`  - ✗ No email change needed`);
        }

        // Nome da empresa
        const companyName = companyInfo.companyName;
        if (companyName && companyName !== applicant.company_name) {
          updates.company_name = companyName;
          detail.changes.push({
            field: 'Nome',
            from: applicant.company_name || 'N/A',
            to: companyName,
          });
          hasChanges = true;
        }

        // Telefone
        const phone = data.info?.phone || companyInfo.phone;
        if (phone && phone !== applicant.phone) {
          updates.phone = phone;
          detail.changes.push({
            field: 'Telefone',
            from: applicant.phone || 'N/A',
            to: phone,
          });
          hasChanges = true;
        }

        // Endereço completo - usar postalAddress que vem como string única
        // SEMPRE atualizar se vier do Sumsub, mesmo que já exista
        const postalAddress = companyInfo.postalAddress;
        if (postalAddress) {
          const currentAddress = applicant.address || '';
          if (postalAddress !== currentAddress) {
            updates.address = postalAddress;
            detail.changes.push({
              field: 'Endereço',
              from: currentAddress || 'N/A',
              to: postalAddress,
            });
            hasChanges = true;
          }
        }

        // País (único campo separado disponível)
        const country = companyInfo.country || fixedCompanyInfo.country;
        if (country && country !== applicant.country) {
          updates.country = country;
          detail.changes.push({
            field: 'País',
            from: applicant.country || 'N/A',
            to: country,
          });
          hasChanges = true;
        }

        // Nome do UBO
        let uboName = null;
        if (companyInfo.beneficialOwners && companyInfo.beneficialOwners.length > 0) {
          const firstUBO = companyInfo.beneficialOwners[0];
          if (firstUBO.firstName && firstUBO.lastName) {
            uboName = `${firstUBO.firstName} ${firstUBO.lastName}`.trim();
          }
        }
        
        if (uboName && uboName !== applicant.ubo_name) {
          updates.ubo_name = uboName;
          detail.changes.push({
            field: 'UBO',
            from: applicant.ubo_name || 'N/A',
            to: uboName,
          });
          hasChanges = true;
        }

        // Sincronizar UBOs na tabela beneficial_owners
        // UBOs estão em fixedInfo.companyInfo.beneficiaries
        const beneficiaries = fixedCompanyInfo.beneficiaries || [];
        if (beneficiaries.length > 0) {
          console.log(`[UBO-SYNC] Sincronizando ${beneficiaries.length} UBOs...`);
          
          for (const beneficiary of beneficiaries) {
            const ubo = beneficiary.beneficiaryInfo || {};
            
            // Buscar dados completos do UBO individual (incluindo endereço, STATUS e NOME COMPLETO)
            let uboAddress = null;
            let uboStatus = 'not_submitted';  // Status padrão
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
              }
              
              // Extrair NOME COMPLETO VERIFICADO do documento
              // Prioridade: fixedInfo > requiredIdDocs.fields > info (fallback)
              if (uboData.fixedInfo?.firstName || uboData.fixedInfo?.lastName) {
                verifiedFirstName = uboData.fixedInfo.firstName || verifiedFirstName;
                verifiedMiddleName = uboData.fixedInfo.middleName || verifiedMiddleName;
                verifiedLastName = uboData.fixedInfo.lastName || verifiedLastName;
                console.log(`[UBO-NAME] Usando fixedInfo: ${verifiedFirstName} ${verifiedMiddleName || ''} ${verifiedLastName}`);
              } else if (uboData.requiredIdDocs?.docSets) {
                // Tentar extrair dos campos do documento
                for (const docSet of uboData.requiredIdDocs.docSets) {
                  if (docSet.idDocSetType === 'IDENTITY' && docSet.types) {
                    for (const type of docSet.types) {
                      if ((type.idDocType === 'ID_CARD' || type.idDocType === 'DRIVERS') && type.fields) {
                        const firstNameField = type.fields.find((f: any) => f.name === 'firstName');
                        const lastNameField = type.fields.find((f: any) => f.name === 'lastName');
                        const middleNameField = type.fields.find((f: any) => f.name === 'middleName');
                        
                        if (firstNameField?.value) verifiedFirstName = firstNameField.value;
                        if (middleNameField?.value) verifiedMiddleName = middleNameField.value;
                        if (lastNameField?.value) verifiedLastName = lastNameField.value;
                        
                        console.log(`[UBO-NAME] Usando documento: ${verifiedFirstName} ${verifiedMiddleName || ''} ${verifiedLastName}`);
                        break;
                      }
                    }
                  }
                }
              }
              
              // Extrair endereço do UBO - tentar múltiplas fontes
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
              console.log(`[UBO-SYNC] ⚠️  Não foi possível buscar dados completos do UBO ${beneficiary.applicantId}:`, error);
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
              // Endereço do UBO
              address: uboAddress?.address || null,
              city: uboAddress?.city || null,
              state: uboAddress?.state || null,
              postal_code: uboAddress?.postal_code || null,
              country: uboAddress?.country || null,
            };

            if (existingUBO) {
              // Atualizar UBO existente
              await supabase
                .from('beneficial_owners')
                .update(uboData)
                .eq('id', existingUBO.id);
              console.log(`[UBO-SYNC] ✓ UBO atualizado: ${ubo.firstName} ${ubo.lastName}`);
            } else {
              // Inserir novo UBO
              await supabase
                .from('beneficial_owners')
                .insert(uboData);
              console.log(`[UBO-SYNC] ✓ UBO criado: ${ubo.firstName} ${ubo.lastName}`);
            }
          }
        }

        // Sincronizar documentos na tabela documents
        if (data.requiredIdDocs?.docSets) {
          console.log(`[DOC-SYNC] Sincronizando documentos...`);
          
          for (const docSet of data.requiredIdDocs.docSets) {
            if (docSet.imageReviewResults) {
              for (const doc of docSet.imageReviewResults) {
                // Verificar se documento já existe
                const { data: existingDoc } = await supabase
                  .from('documents')
                  .select('id')
                  .eq('company_id', applicant.id)
                  .eq('image_id', doc.imageId)
                  .single();

                const docData = {
                  company_id: applicant.id,
                  applicant_id: applicant.applicant_id,
                  inspection_id: data.inspectionId,
                  image_id: doc.imageId,
                  document_type: docSet.idDocSetType,
                  document_sub_type: doc.idDocType,
                  country: doc.country,
                  review_status: doc.reviewResult?.reviewAnswer || 'pending',
                  reject_labels: doc.reviewResult?.rejectLabels || null,
                  review_reject_type: doc.reviewResult?.reviewRejectType || null,
                  moderator_comment: doc.reviewResult?.moderatorComment || null,
                  client_comment: doc.reviewResult?.clientComment || null,
                  page_number: doc.pageNumber,
                };

                if (existingDoc) {
                  // Atualizar documento existente
                  await supabase
                    .from('documents')
                    .update(docData)
                    .eq('id', existingDoc.id);
                  console.log(`[DOC-SYNC] ✓ Documento atualizado: ${doc.idDocType}`);
                } else {
                  // Inserir novo documento
                  await supabase
                    .from('documents')
                    .insert(docData);
                  console.log(`[DOC-SYNC] ✓ Documento criado: ${doc.idDocType}`);
                }
              }
            }
          }
        }

        // Atualizar no banco se houver mudanças
        if (hasChanges) {
          console.log(`[UPDATE] Atualizando ${applicant.company_name} (id: ${applicant.id})...`);
          console.log(`[UPDATE] Changes:`, updates);
          
          // Adicionar timestamp de última sincronização
          updates.last_sync_date = new Date().toISOString();
          
          const { data: updateData, error: updateError } = await supabase
            .from('applicants')
            .update(updates)
            .eq('id', applicant.id)
            .select();

          if (updateError) {
            throw new Error(`Erro ao atualizar: ${updateError.message}`);
          }

          const rowsAffected = updateData?.length || 0;
          console.log(`[UPDATE] Rows affected: ${rowsAffected}`);
          
          if (rowsAffected === 0) {
            console.warn(`[UPDATE] ⚠️ WARNING: UPDATE returned 0 rows for id ${applicant.id}`);
            detail.status = 'warning';
            detail.warning = 'UPDATE não afetou nenhuma linha';
            results.errors++;
          } else {
            results.updated++;
            detail.status = 'updated';
          }
        } else {
          results.skipped++;
          detail.status = 'skipped';
        }

        results.details.push(detail);

        // Aguardar 500ms entre requisições
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error: any) {
        console.error(`[ERROR] Erro ao processar ${applicant.company_name}:`, error);
        results.errors++;
        results.details.push({
          company: applicant.company_name || applicant.id,
          applicant_id: applicant.applicant_id,
          uuid: applicant.id,
          status: 'error',
          error: error.message,
        });
      }
    }

    console.log(`[UPDATE-COMPANIES] Concluído: ${results.updated} atualizadas, ${results.skipped} sem mudanças, ${results.errors} erros`);

    return NextResponse.json({
      success: true,
      message: `Atualização concluída: ${results.updated} atualizadas, ${results.skipped} sem mudanças, ${results.errors} erros`,
      results,
    });

  } catch (error: any) {
    console.error('[UPDATE-COMPANIES] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar empresas', details: error.message },
      { status: 500 }
    );
  }
}
