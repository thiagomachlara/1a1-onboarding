import { enriquecerEndereco, formatarEnderecoEnriquecido } from './src/lib/address-enrichment-v2';

async function test() {
  console.log('=== Testando Enriquecimento de Endereço ===\n');
  
  const cnpjs = [
    { nome: 'IA PAG', cnpj: '55746276000105' },
    { nome: 'JSO TRADE', cnpj: '39331359000187' },
    { nome: 'SAKI', cnpj: '58140858000131' },
  ];
  
  for (const empresa of cnpjs) {
    console.log(`\n--- ${empresa.nome} (${empresa.cnpj}) ---`);
    const resultado = await enriquecerEndereco(empresa.cnpj);
    
    if (resultado) {
      console.log('✅ Logradouro:', resultado.logradouro);
      console.log('   Número:', resultado.numero);
      console.log('   Bairro:', resultado.bairro);
      console.log('   Cidade/UF:', `${resultado.cidade}/${resultado.estado}`);
      console.log('   CEP:', resultado.cep);
      console.log('   Fonte Primária:', resultado.fonte_primaria);
      console.log('   Fonte Secundária:', resultado.fonte_secundaria || 'N/A');
      console.log('\n   Formatado:', formatarEnderecoEnriquecido(resultado));
    } else {
      console.log('❌ Falha ao enriquecer');
    }
  }
}

test().catch(console.error);
