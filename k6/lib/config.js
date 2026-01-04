// k6 configuration for Istio learning project

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export const ENDPOINTS = {
  users: '/api/users',
  orders: '/api/orders',
};

export const THRESHOLDS = {
  http_req_duration: ['p(95)<500'],     // 95% of requests under 500ms
  http_req_failed: ['rate<0.01'],       // Error rate under 1%
};

export const CANARY_THRESHOLDS = {
  ...THRESHOLDS,
  orders_v2_rate: ['rate>0.05', 'rate<0.15'],  // v2 should be 5-15% (for 90/10 split)
};
