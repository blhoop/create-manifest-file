import http from 'k6/http';
import { check, group, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 5 },   // ramp up to 5 VUs
    { duration: '2m', target: 5 },    // sustain for 2 minutes (sequential uploads)
    { duration: '30s', target: 0 },   // ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<30000'],  // p95 latency < 30s (large file)
    'http_req_failed': ['rate<0.1'],       // allow up to 10% errors for large file
  },
};

const BASE_URL = 'http://localhost:3001';

// Generate a larger CSV (simulating ~10k rows)
function generateLargeCsvFile() {
  let csv = 'name,type,location,repo,comments\n';
  for (let i = 0; i < 10000; i++) {
    csv += `app-${i},Web App,eastus,org/app-${i},service ${i}\n`;
  }
  return btoa(csv);
}

export default function () {
  group('Large file parsing stress test', () => {
    const formData = {
      file: http.file(generateLargeCsvFile(), 'large.csv', 'text/csv'),
    };

    const start = new Date();
    const response = http.post(`${BASE_URL}/api/parse`, formData);
    const duration = new Date() - start;

    check(response, {
      'status is 200': (r) => r.status === 200,
      'parse completes within 30s': () => duration < 30000,
      'response has rows array': (r) => Array.isArray(r.json('rows')),
      'response contains parsed data': (r) => r.json('rows').length > 0,
    });

    // Space out VU requests to keep them sequential
    sleep(5);
  });
}
