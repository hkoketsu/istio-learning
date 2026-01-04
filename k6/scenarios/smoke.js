// Smoke test - Quick validation of all endpoints
// Usage: k6 run k6/scenarios/smoke.js

import http from 'k6/http';
import { sleep } from 'k6';
import { BASE_URL, ENDPOINTS, THRESHOLDS } from '../lib/config.js';
import { checkUsersResponse, checkOrdersResponse } from '../lib/checks.js';

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: THRESHOLDS,
};

export default function () {
  // Test users endpoint
  const usersRes = http.get(`${BASE_URL}${ENDPOINTS.users}`);
  checkUsersResponse(usersRes);

  // Test orders endpoint
  const ordersRes = http.get(`${BASE_URL}${ENDPOINTS.orders}`);
  checkOrdersResponse(ordersRes);

  sleep(1);
}
