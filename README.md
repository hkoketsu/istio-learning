# Istio Learning Project

A hands-on project to learn Istio's core features: traffic management, security (mTLS), and observability.

## Prerequisites

- Docker Desktop with Kubernetes enabled (4+ CPU, 8GB+ RAM recommended)
- `kubectl` configured
- `istioctl` (`brew install istioctl`)
- Go 1.25+
- Node.js 24+ / pnpm

## Quick Start

```bash
# 1. Install Istio and addons
make istio-install
make istio-addons

# 2. Build Docker images
make build

# 3. Deploy everything
make deploy

# 4. Access the app
make port-forward
# Visit http://localhost:8080
```

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│   Frontend  │────▶│ API Gateway │────▶│ Users Service   │
│ (TypeScript)│     │    (Go)     │     │     (Go)        │
└─────────────┘     └─────────────┘     └─────────────────┘
                           │
                           ▼
                    ┌─────────────────┐
                    │ Orders Service  │  ← v1 and v2
                    │     (Go)        │
                    └─────────────────┘
```

## Learning Exercises

### Traffic Management

```bash
# Route all traffic to v1
make route-v1

# Canary: 90% v1, 10% v2
make route-canary

# Header-based routing (use x-version: v2 header)
make route-header

# Inject 3s delay on users-service
make fault-inject
make fault-remove  # to remove
```

### Security

```bash
# Enable strict mTLS
make mtls-strict

# Apply authorization policies
make authz-apply
make authz-remove  # to remove
```

### Observability

```bash
# Open Kiali (service mesh visualization)
make kiali

# Open Jaeger (distributed tracing)
make jaeger

# Open Grafana (metrics)
make grafana
```

## Useful Commands

```bash
# Check pod status
make status

# View logs
make logs-gateway
make logs-users
make logs-orders

# Cleanup
make clean
```

## Project Structure

```
istio-learning/
├── apps/
│   ├── frontend/          # React + Vite + TypeScript
│   ├── api-gateway/       # Go + Chi
│   ├── users-service/     # Go + Chi
│   └── orders-service/    # Go + Chi (v1 & v2)
├── k8s/
│   ├── base/              # Kubernetes manifests
│   └── istio/             # Istio configurations
├── Makefile
├── PLAN.md                # Detailed learning plan
└── README.md
```

## v1 vs v2 Difference

- **v1**: Returns basic order list
- **v2**: Returns order list with `estimated_delivery` field

When you see delivery dates in the UI, you're hitting v2!
