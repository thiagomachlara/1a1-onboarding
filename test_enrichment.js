const fetch = require('node-fetch');

async function testEnrichment() {
  const cnpj = '55746276000105';
  const url = `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('✅ BrasilAPI Response:');
    console.log(JSON.stringify({
      street: data.logradouro,
      number: data.numero,
      complement: data.complemento,
      neighborhood: data.bairro,
      city: data.municipio,
      state: data.uf,
      postal_code: data.cep
    }, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testEnrichment();
