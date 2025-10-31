const crypto = require('crypto');

// Credenciais do .env
const SUMSUB_APP_TOKEN = process.env.NEXT_PUBLIC_SUMSUB_APP_TOKEN;
const SUMSUB_SECRET_KEY = process.env.SUMSUB_SECRET_KEY;

console.log('🔑 Testando API Sumsub...\n');
console.log('App Token:', SUMSUB_APP_TOKEN ? SUMSUB_APP_TOKEN.substring(0, 20) + '...' : 'NÃO ENCONTRADO');
console.log('Secret Key:', SUMSUB_SECRET_KEY ? SUMSUB_SECRET_KEY.substring(0, 10) + '...' : 'NÃO ENCONTRADO');

if (!SUMSUB_APP_TOKEN || !SUMSUB_SECRET_KEY) {
  console.error('\n❌ Credenciais não encontradas nas variáveis de ambiente!');
  process.exit(1);
}

// Gerar assinatura
const method = 'POST';
const userId = 'test_' + Date.now();
const levelName = 'auto-kyb';
const ttlInSecs = 600;
const path = `/resources/accessTokens?userId=${encodeURIComponent(userId)}&levelName=${encodeURIComponent(levelName)}&ttlInSecs=${ttlInSecs}`;
const timestamp = Math.floor(Date.now() / 1000);

console.log('\n📝 Parâmetros:');
console.log('Method:', method);
console.log('Path:', path);
console.log('Timestamp:', timestamp);
console.log('UserId:', userId);
console.log('LevelName:', levelName);

// Criar assinatura
const stringToSign = timestamp + method.toUpperCase() + path;
console.log('\n🔐 String para assinar:', stringToSign);

const signature = crypto
  .createHmac('sha256', SUMSUB_SECRET_KEY)
  .update(stringToSign)
  .digest('hex');

console.log('Assinatura gerada:', signature);

// Fazer requisição
const url = `https://api.sumsub.com${path}`;
console.log('\n🌐 URL completa:', url);

fetch(url, {
  method: method,
  headers: {
    'Content-Type': 'application/json',
    'X-App-Token': SUMSUB_APP_TOKEN,
    'X-App-Access-Sig': signature,
    'X-App-Access-Ts': timestamp.toString(),
  },
})
  .then(async (response) => {
    console.log('\n📡 Resposta da API:');
    console.log('Status:', response.status, response.statusText);
    console.log('Headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
    
    const text = await response.text();
    console.log('\n📄 Body:', text);
    
    if (response.ok) {
      console.log('\n✅ SUCESSO! Token gerado com sucesso!');
      const data = JSON.parse(text);
      console.log('Token:', data.token ? data.token.substring(0, 50) + '...' : 'N/A');
    } else {
      console.log('\n❌ ERRO! API retornou erro.');
    }
  })
  .catch((error) => {
    console.error('\n💥 Erro na requisição:', error.message);
  });
