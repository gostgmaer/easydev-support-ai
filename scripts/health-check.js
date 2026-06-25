const http = require('http');

// /health/live is the cheap, no-dependency-checks liveness probe. Pointing
// the container's own HEALTHCHECK at /health (which 503s when ANY downstream
// dependency, e.g. the AI platform, is down) means Docker/the orchestrator
// would restart a perfectly healthy api/worker/webhook process just because
// an unrelated dependency blipped - the exact restart-storm /health/live
// exists to avoid.
const options = {
  host: 'localhost',
  port: process.env.PORT || 3100,
  path: '/health/live',
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
