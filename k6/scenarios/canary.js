// Canary validation test - Validate traffic split between v1 and v2
// Usage: k6 run k6/scenarios/canary.js
//
// Run this after enabling canary routing:
//   make route-canary  # Enable 90/10 split
//   make k6-canary     # Validate the split

import http from 'k6/http';
import { sleep, check } from 'k6';
import { Counter, Rate } from 'k6/metrics';
import { BASE_URL, ENDPOINTS, THRESHOLDS } from '../lib/config.js';
import { isOrdersV2 } from '../lib/checks.js';

// Custom metrics for tracking v1/v2 responses
const ordersV1Responses = new Counter('orders_v1_responses');
const ordersV2Responses = new Counter('orders_v2_responses');
const ordersV2Rate = new Rate('orders_v2_rate');

export const options = {
  vus: 5,
  duration: '1m',
  thresholds: {
    ...THRESHOLDS,
    // For 90/10 split, expect v2 rate between 5% and 15%
    orders_v2_rate: ['rate>0.05', 'rate<0.15'],
  },
};

export default function () {
  const res = http.get(`${BASE_URL}${ENDPOINTS.orders}`);

  check(res, {
    'orders status is 200': (r) => r.status === 200,
  });

  if (res.status === 200) {
    const isV2 = isOrdersV2(res);

    if (isV2) {
      ordersV2Responses.add(1);
      ordersV2Rate.add(1);
    } else {
      ordersV1Responses.add(1);
      ordersV2Rate.add(0);
    }
  }

  sleep(0.2);
}

export function handleSummary(data) {
  const v1Count = data.metrics.orders_v1_responses?.values?.count || 0;
  const v2Count = data.metrics.orders_v2_responses?.values?.count || 0;
  const total = v1Count + v2Count;
  const v2Percentage = total > 0 ? ((v2Count / total) * 100).toFixed(2) : 0;

  console.log('\n========== Canary Traffic Analysis ==========');
  console.log(`Total requests: ${total}`);
  console.log(`V1 responses:   ${v1Count} (${total > 0 ? ((v1Count / total) * 100).toFixed(2) : 0}%)`);
  console.log(`V2 responses:   ${v2Count} (${v2Percentage}%)`);
  console.log('==============================================\n');

  return {};
}
