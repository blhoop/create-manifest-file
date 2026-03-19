import http from 'k6/http';
import { check, group, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 20 },   // ramp up to 20 VUs
    { duration: '10m', target: 20 },  // sustain for 10 minutes
    { duration: '1m', target: 0 },    // ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(50)<2000', 'p(95)<5000'],  // p50 < 2s, p95 < 5s
    'http_req_failed': ['rate<0.01'],                    // error rate < 1%
  },
};

const BASE_URL = 'http://localhost:3001';

// File type templates for variety
const csvData = 'name,type,location\napp-1,Web App,eastus\ndb-1,SQL Database,westus\n';
const files = [
  { content: btoa(csvData), name: 'data.csv', type: 'text/csv' },
];

export default function () {
  group('Sustained API load', () => {
    // Rotate through different file types
    const fileIndex = Math.floor(__VU * __ITER) % files.length;
    const file = files[fileIndex];

    const formData = {
      file: http.file(file.content, file.name, file.type),
    };

    const response = http.post(`${BASE_URL}/api/parse`, formData);

    check(response, {
      'status is 200': (r) => r.status === 200,
      'response has rows': (r) => r.json('rows') !== undefined,
      'response is valid': (r) => r.status < 400,
    });

    // Small random jitter (500-1000ms) to avoid synchronized requests
    sleep(0.5 + Math.random() * 0.5);
  });
}
