# Istio Learning Project

A hands-on project to learn Istio service mesh features including traffic management, security (mTLS), observability, and load testing.

## Features

- **Traffic Management**: Canary deployments, header-based routing, weighted traffic splitting
- **Security**: Mutual TLS (mTLS), authorization policies, zero-trust networking
- **Fault Injection**: Delay and abort injection for chaos engineering
- **Observability**: Kiali, Jaeger, Grafana, Prometheus integration
- **Load Testing**: k6 scenarios for smoke, load, and canary validation tests

## Architecture

```
                                    Istio Service Mesh
┌────────────────────────────────────────────────────────────────────────────┐
│                                                                            │
│   ┌──────────────┐      ┌──────────────┐      ┌──────────────────────┐    │
│   │              │      │              │      │                      │    │
│   │   Frontend   │─────▶│ API Gateway  │─────▶│   Users Service      │    │
│   │   (React)    │      │    (Go)      │      │      (Go)            │    │
│   │              │      │              │      │                      │    │
│   └──────────────┘      └──────────────┘      └──────────────────────┘    │
│                                │                                           │
│                                │                                           │
│                                ▼                                           │
│                         ┌──────────────────────────────────────────┐      │
│                         │         Orders Service (Go)              │      │
│                         │  ┌─────────────┐    ┌─────────────┐      │      │
│                         │  │     v1      │    │     v2      │      │      │
│                         │  │  (basic)    │    │ (+delivery) │      │      │
│                         │  └─────────────┘    └─────────────┘      │      │
│                         └──────────────────────────────────────────┘      │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
         ▲
         │
    Istio Gateway
    (port 8080)
```

## Prerequisites

- Docker Desktop with Kubernetes enabled (4+ CPU, 8GB+ RAM recommended)
- `kubectl` configured
- `istioctl` (`brew install istioctl`)
- `k6` (`brew install k6`) - for load testing
- Go 1.25+
- Node.js 24+ / pnpm

## Quick Start

```bash
# 1. Install Istio and observability addons
make istio-install
make istio-addons

# 2. Build Docker images
make build

# 3. Deploy to Kubernetes
make deploy

# 4. Access the app
make port-forward
# Visit http://localhost:8080
```

## Learning Exercises

### 1. Traffic Management

```bash
# Route all traffic to v1
make route-v1

# Canary deployment: 90% v1, 10% v2
make route-canary

# Route 100% to v2
make route-v2

# Header-based routing (x-version: v2 header routes to v2)
make route-header

# Test with curl
curl http://localhost:8080/api/orders                    # Based on routing rules
curl -H "x-version: v2" http://localhost:8080/api/orders # Forces v2
```

### 2. Security (mTLS & Authorization)

```bash
# Enable strict mTLS (all traffic encrypted)
make mtls-strict

# Verify mTLS is working
istioctl x describe pod <pod-name> -n istio-demo

# Apply authorization policies (deny-all + allow specific)
make security-apply

# Remove security policies
make security-remove
```

### 3. Fault Injection

```bash
# Inject 3s delay on users-service
make fault-inject

# Test - should take ~3 seconds
time curl http://localhost:8080/api/users

# Remove fault injection
make fault-remove
```

### 4. Observability

```bash
# Open Kiali (service mesh visualization)
make kiali

# Open Jaeger (distributed tracing)
make jaeger

# Open Grafana (metrics dashboards)
make grafana
```

### 5. Load Testing with k6

```bash
# Ensure port-forward is running
make port-forward

# Quick smoke test (1 VU, 30s)
make k6-smoke

# Load test (ramp to 20 VUs over 3 minutes)
make k6-load

# Canary validation (validates traffic split percentages)
make route-canary
make k6-canary
```

## Project Structure

```
istio-learning/
├── apps/
│   ├── frontend/           # React + Vite + TypeScript
│   ├── api-gateway/        # Go + Chi router
│   ├── users-service/      # Go + Chi router
│   └── orders-service/     # Go + Chi router (v1 & v2)
├── k8s/
│   ├── base/               # Kubernetes Deployments & Services
│   └── istio/
│       ├── gateway.yaml           # Istio Gateway & VirtualService
│       ├── destination-rules/     # Load balancing & subsets
│       ├── virtual-services/      # Traffic routing rules
│       ├── fault-injection/       # Delay & abort configs
│       └── security/              # mTLS & AuthorizationPolicy
├── k6/
│   ├── lib/                # Shared config & check functions
│   └── scenarios/          # smoke.js, load.js, canary.js
├── Makefile                # All commands
├── PLAN.md                 # Detailed learning plan
└── README.md
```

## Useful Commands

```bash
# Check deployment status
make status

# View logs
make logs-gateway
make logs-users
make logs-orders

# Restart deployments (after code changes)
make restart

# Full cleanup
make clean

# Complete setup from scratch
make setup
```

## Makefile Targets Reference

| Target | Description |
|--------|-------------|
| `make build` | Build all Docker images |
| `make deploy` | Deploy base + Istio resources |
| `make port-forward` | Port forward to localhost:8080 |
| `make route-v1` | Route 100% traffic to v1 |
| `make route-v2` | Route 100% traffic to v2 |
| `make route-canary` | 90% v1, 10% v2 split |
| `make route-header` | Header-based routing |
| `make fault-inject` | Add 3s delay to users-service |
| `make fault-remove` | Remove fault injection |
| `make security-apply` | Enable mTLS + authorization |
| `make security-remove` | Remove security policies |
| `make k6-smoke` | Run smoke test |
| `make k6-load` | Run load test |
| `make k6-canary` | Validate canary traffic split |
| `make kiali` | Open Kiali dashboard |
| `make jaeger` | Open Jaeger UI |
| `make grafana` | Open Grafana dashboards |
| `make clean` | Delete all resources |

## License

MIT
