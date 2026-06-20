import http from 'k6/http';
import { check, sleep } from 'k6';

// k6 Load Test Configuration representing multiple scenarios (Load, Stress, Spike, Soak)
export const options = {
  scenarios: {
    // 1. Constant moderate load test
    load_test: {
      executor: 'constant-vus',
      vus: 50,
      duration: '1m',
    },
    // 2. Stress testing (ramp-up to extreme limits)
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 100 }, // Normal load
        { duration: '1m', target: 500 },  // Target scale: 500 RPS / 500 VUs
        { duration: '30s', target: 0 },   // Cool down
      ],
      startTime: '1m10s',
    },
    // 3. Spike test (sudden traffic burst)
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 10 },
        { duration: '10s', target: 800 }, // Spike to 800 users
        { duration: '20s', target: 0 },
      ],
      startTime: '3m',
    },
    // 4. Soak test (sustained load to verify memory leaks)
    soak_test: {
      executor: 'constant-vus',
      vus: 50,
      duration: '5m',
      startTime: '3m50s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<150'], // 95% of requests must complete under 150ms
    http_req_failed: ['rate<0.01'],    // Error rate must be less than 1%
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000';
const TENANT_ID = 'test-tenant-id-uuid-12345';

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    'x-tenant-id': TENANT_ID,
    'x-idempotency-key': `k6-key-${Math.random().toString(36).substring(2, 15)}`,
  };

  // 1. API Benchmark: Get Widget Config
  const resConfig = http.get(`${BASE_URL}/v1/widget/config`, { headers });
  check(resConfig, {
    'config status is 200': (r) => r.status === 200,
    'config response has widgetName': (r) => r.body.includes('widgetName'),
  });

  sleep(0.1);

  // 2. Queue & Write Benchmark: Start Widget Session
  const sessionPayload = JSON.stringify({
    anonymousId: `k6-anon-${__VU}-${__ITER}`,
    userAgent: 'k6-load-testing-agent',
    deviceType: 'desktop',
  });
  const resSession = http.post(`${BASE_URL}/v1/widget/session/start`, sessionPayload, { headers });
  check(resSession, {
    'session start is 201': (r) => r.status === 201,
    'session response has token': (r) => r.body.includes('token'),
  });

  sleep(0.2);

  // 3. Database Write Benchmark: Capture Lead
  const leadPayload = JSON.stringify({
    email: `k6-lead-${__VU}-${__ITER}@company.com`,
    name: 'K6 Performance Tester',
    company: 'LoadTest Corp',
    source: 'load-test',
  });
  const resLead = http.post(`${BASE_URL}/v1/widget/lead/capture`, leadPayload, { headers });
  check(resLead, {
    'lead capture is 201': (r) => r.status === 201,
    'lead response status qualified': (r) => r.body.includes('QUALIFIED') || r.body.includes('NEW'),
  });

  sleep(0.5);
}
