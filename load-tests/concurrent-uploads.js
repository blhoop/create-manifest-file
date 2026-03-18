import http from 'k6/http';
import { check, group, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 10 },   // ramp up to 10 VUs
    { duration: '2m', target: 50 },   // ramp up to 50 VUs
    { duration: '2m', target: 100 },  // ramp up to 100 VUs
    { duration: '5m', target: 100 },  // sustain at 100 VUs
    { duration: '1m', target: 0 },    // ramp down to 0
  ],
  thresholds: {
    'http_req_duration': ['p(95)<5000'],  // p95 latency < 5s
    'http_req_failed': ['rate<0.05'],      // error rate < 5%
  },
};

const BASE_URL = 'http://localhost:3001';

// Generate a small CSV file as base64
function generateSmallCsvFile() {
  const csv = 'name,type,location,comments\nweb-api,Web App,eastus,test api\ndb,SQL Database,eastus,production';
  return btoa(csv);
}

export default function () {
  group('Concurrent file uploads', () => {
    const formData = {
      file: http.file(generateSmallCsvFile(), 'test.csv', 'text/csv'),
    };

    const response = http.post(`${BASE_URL}/api/parse`, formData);

    check(response, {
      'status is 200': (r) => r.status === 200,
      'response has rows': (r) => r.json('rows') !== undefined,
      'response rows is array': (r) => Array.isArray(r.json('rows')),
    });

    sleep(0.5);  // small pause between uploads
  });
}
