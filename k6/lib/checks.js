// Reusable check functions for k6 tests

import { check } from 'k6';

// Check if response is valid JSON with status 200
export function checkJsonResponse(res, name = 'response') {
  return check(res, {
    [`${name} status is 200`]: (r) => r.status === 200,
    [`${name} is JSON`]: (r) => {
      try {
        r.json();
        return true;
      } catch (e) {
        return false;
      }
    },
  });
}

// Check users endpoint response (returns {"users": [...]})
export function checkUsersResponse(res) {
  const checks = checkJsonResponse(res, 'users');
  if (res.status === 200) {
    check(res, {
      'users has array': (r) => Array.isArray(r.json().users),
      'users has items': (r) => r.json().users && r.json().users.length > 0,
    });
  }
  return checks;
}

// Check orders endpoint response (returns {"orders": [...]} or [...])
export function checkOrdersResponse(res) {
  const checks = checkJsonResponse(res, 'orders');
  if (res.status === 200) {
    check(res, {
      'orders has data': (r) => {
        const json = r.json();
        return Array.isArray(json) ? json.length > 0 : (json.orders && json.orders.length > 0);
      },
    });
  }
  return checks;
}

// Check if orders response is from v2 (has estimated_delivery field)
export function isOrdersV2(res) {
  if (res.status !== 200) return false;
  try {
    const json = res.json();
    const orders = Array.isArray(json) ? json : json.orders;
    return orders && orders.length > 0 && orders[0].estimated_delivery !== undefined;
  } catch (e) {
    return false;
  }
}
