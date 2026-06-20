const http = require('http');

const options = {
  host: 'localhost',
  port: process.env.PORT || 3000,
  path: '/health',
  timeout: 2000,
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(body);
      if (res.statusCode === 200 && parsed.status === 'UP') {
        process.exit(0);
      }
    } catch {
      // JSON parse error
    }
    process.exit(1);
  });
});

req.on('error', () => {
  process.exit(1);
});

req.end();
