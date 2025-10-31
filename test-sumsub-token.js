const crypto = require('crypto');

const SUMSUB_APP_TOKEN = 'prd:YCuQesaUqRWmdANvRYWy1xj4.zAZkd9ox9M8pW2G4NmEOu3DmgJRHavFW';
const SUMSUB_SECRET_KEY = '1Gz49K8m7qQqS9oh3e2MWJV47OiWMU6e';
const SUMSUB_BASE_URL = 'https://api.sumsub.com';

function generateSignature(method, url, timestamp, body) {
  const data = timestamp + method.toUpperCase() + url + (body || '');
  return crypto
    .createHmac('sha256', SUMSUB_SECRET_KEY)
    .update(data)
    .digest('hex');
}

async function testAccessToken() {
  const userId = 'test_user_' + Date.now();
  const levelName = 'basic-kyc-level';
  const ttlInSecs = 600;
  
  const method = 'POST';
  const path = `/resources/accessTokens?userId=${encodeURIComponent(userId)}&ttlInSecs=${ttlInSecs}&levelName=${encodeURIComponent(levelName)}`;
  const url = `${SUMSUB_BASE_URL}${path}`;
  const timestamp = Math.floor(Date.now() / 1000);
  
  const signature = generateSignature(method, path, timestamp);
  
  console.log('Testing Sumsub API...');
  console.log('URL:', url);
  console.log('Timestamp:', timestamp);
  console.log('Signature:', signature);
  console.log('App Token:', SUMSUB_APP_TOKEN);
  console.log('');
  
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-App-Token': SUMSUB_APP_TOKEN,
        'X-App-Access-Sig': signature,
        'X-App-Access-Ts': timestamp.toString(),
      },
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    if (response.ok) {
      console.log('\n✅ SUCCESS!');
    } else {
      console.log('\n❌ ERROR!');
    }
  } catch (error) {
    console.error('Request error:', error);
  }
}

testAccessToken();
