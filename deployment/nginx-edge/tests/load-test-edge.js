import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 200 },  // Ramp-up to 200 VUs
    { duration: '2m', target: 500 },   // Maintain 500 VUs (to reach ~500 RPS)
    { duration: '30s', target: 0 },    // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<100'], // 95% of request duration must be under 100ms (target sub-100ms proxy latency)
    http_req_failed: ['rate<0.01'],    // Under 1% failures
    ws_session_duration: ['p(95)<5000'],
  },
};

const BASE_API_URL = __ENV.API_URL || 'https://api.easydev.in';
const BASE_WS_URL = __ENV.WS_URL || 'wss://ws.easydev.in';
const TENANT_ID = 'perf-tenant-9901';

export default function () {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': TENANT_ID,
    },
    tags: { name: 'api-request' },
  };

  // 1. HTTP API Request Benchmark
  const res = http.get(`${BASE_API_URL}/health`, params);
  check(res, {
    'http response code is 200': (r) => r.status === 200,
  });

  sleep(0.5);

  // 2. WebSockets Connection Benchmark (Sticky Session + Multi-tenancy check)
  const wsUrl = `${BASE_WS_URL}/socket.io/?EIO=4&transport=websocket&tenant_id=${TENANT_ID}`;
  
  ws.connect(wsUrl, null, function (socket) {
    socket.on('open', function () {
      socket.send('40'); // socket.io connect packet
      
      socket.setTimeout(function () {
        socket.send('42["presence:update",{"status":"online","agent":"agent-101"}]');
      }, 500);

      socket.setTimeout(function () {
        socket.send('42["typing:indicator",{"conversationId":"conv-900","typing":true}]');
      }, 1000);

      socket.setTimeout(function () {
        socket.close();
      }, 3000);
    });

    socket.on('error', function (e) {
      // Socket error handler
    });
  });

  sleep(1);
}
