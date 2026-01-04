// Load test - Standard load pattern with ramp up/down
// Usage: k6 run k6/scenarios/load.js

import http from 'k6/http';
import { sleep } from 'k6';
import { BASE_URL, ENDPOINTS, THRESHOLDS } from '../lib/config.js';
import { checkUsersResponse, checkOrdersResponse } from '../lib/checks.js';

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 VUs
    { duration: '1m', target: 20 },   // Ramp up to 20 VUs
    { duration: '1m', target: 20 },   // Stay at 20 VUs
    { duration: '30s', target: 0 },   // Ramp down to 0
  ],
  thresholds: THRESHOLDS,
};

export default function () {
  // Randomly choose between users and orders endpoints
  const endpoints = [
    { url: `${BASE_URL}${ENDPOINTS.users}`, check: checkUsersResponse },
    { url: `${BASE_URL}${ENDPOINTS.orders}`, check: checkOrdersResponse },
  ];

  const selected = endpoints[Math.floor(Math.random() * endpoints.length)];
  const res = http.get(selected.url);
  selected.check(res);

  sleep(0.5);
}
