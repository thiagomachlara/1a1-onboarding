/**
 * Script de teste para debugar listagem de documentos do Sumsub
 */

const crypto = require('crypto');

const SUMSUB_APP_TOKEN = process.env.SUMSUB_APP_TOKEN;
const SUMSUB_SECRET_KEY = process.env.SUMSUB_SECRET_KEY;
const SUMSUB_BASE_URL = 'https://api.sumsub.com';

// Applicant ID da 1A1 INTERMEDIACAO (você vai precisar pegar do banco)
const APPLICANT_ID = process.argv[2];

if (!APPLICANT_ID) {
  console.error('❌ Uso: node test-list-documents.js <applicant_id>');
  process.exit(1);
}

function generateSignature(method, path, timestamp) {
  const data = timestamp + method.toUpperCase() + path;
  return crypto
    .createHmac('sha256', SUMSUB_SECRET_KEY)
    .update(data)
    .digest('hex');
}

async function sumsubRequest(method, path) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = generateSignature(method, path, timestamp);

  const headers = {
    'X-App-Token': SUMSUB_APP_TOKEN,
    'X-App-Access-Sig': signature,
    'X-App-Access-Ts': timestamp.toString(),
  };

  const response = await fetch(`${SUMSUB_BASE_URL}${path}`, {
    method,
    headers,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Sumsub API error: ${response.status} - ${error}`);
  }

  return response.json();
}

async function testListDocuments() {
  try {
    console.log(`\n🔍 Testando listagem de documentos para applicant: ${APPLICANT_ID}\n`);
    
    // Endpoint atual que estamos usando
    const path = `/resources/applicants/${APPLICANT_ID}/one`;
    console.log(`📡 Endpoint: ${path}\n`);
    
    const data = await sumsubRequest('GET', path);
    
    // Salvar resposta completa em arquivo
    const fs = require('fs');
    const outputFile = `/home/ubuntu/sumsub-response-${APPLICANT_ID}.json`;
    fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));
    console.log(`💾 Resposta completa salva em: ${outputFile}\n`);
    
    // Analisar estrutura
    console.log('📊 Estrutura da resposta:');
    console.log('- id:', data.id);
    console.log('- inspectionId:', data.inspectionId);
    console.log('- type:', data.type);
    console.log('- reviewStatus:', data.review?.reviewStatus);
    console.log('- requiredIdDocs existe?', !!data.requiredIdDocs);
    
    if (data.requiredIdDocs) {
      console.log('- requiredIdDocs.docSets existe?', !!data.requiredIdDocs.docSets);
      console.log('- requiredIdDocs.docSets length:', data.requiredIdDocs.docSets?.length || 0);
      
      if (data.requiredIdDocs.docSets) {
        console.log('\n📄 DocSets encontrados:');
        data.requiredIdDocs.docSets.forEach((docSet, i) => {
          console.log(`\n  DocSet ${i + 1}:`);
          console.log(`  - idDocSetType: ${docSet.idDocSetType}`);
          console.log(`  - types existe? ${!!docSet.types}`);
          console.log(`  - types length: ${docSet.types?.length || 0}`);
          
          if (docSet.types) {
            docSet.types.forEach((docType, j) => {
              console.log(`\n    Type ${j + 1}:`);
              console.log(`    - idDocType: ${docType.idDocType}`);
              console.log(`    - imageIds existe? ${!!docType.imageIds}`);
              console.log(`    - imageIds length: ${docType.imageIds?.length || 0}`);
              console.log(`    - imageIds:`, docType.imageIds);
            });
          }
        });
      }
    }
    
    // Verificar outras possíveis localizações de documentos
    console.log('\n🔍 Verificando outras possíveis localizações:');
    console.log('- data.documents existe?', !!data.documents);
    console.log('- data.files existe?', !!data.files);
    console.log('- data.images existe?', !!data.images);
    console.log('- data.attachments existe?', !!data.attachments);
    
    // Listar todas as chaves de primeiro nível
    console.log('\n🔑 Chaves de primeiro nível na resposta:');
    console.log(Object.keys(data).join(', '));
    
    console.log('\n✅ Teste concluído! Verifique o arquivo JSON para mais detalhes.\n');
    
  } catch (error) {
    console.error('\n❌ Erro ao testar:', error.message);
    process.exit(1);
  }
}

testListDocuments();
