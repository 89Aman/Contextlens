const https = require('https');

const data = JSON.stringify({ name: 'test' });
const options = {
  hostname: 'api-owekfjiota-uc.a.run.app',
  path: '/projects/create',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let responseData = '';
  res.on('data', d => responseData += d);
  res.on('end', () => console.log('RESPONSE:', res.statusCode, responseData));
});

req.on('error', e => console.error('ERROR:', e));
req.write(data);
req.end();
