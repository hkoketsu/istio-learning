# Istio Learning Project Plan

## Overview
A hands-on project to learn Istio's core features: traffic management, security (mTLS), and observability. Uses Docker Desktop Kubernetes for local development with a custom TypeScript + Go microservices application.

## Goals
- Learn Istio traffic management (canary deployments, routing, fault injection)
- Understand mTLS and authorization policies
- Practice observability with Kiali, Jaeger, and Grafana

## Tech Stack
| Component | Technology |
|-----------|------------|
| Frontend | TypeScript, React 18, Vite |
| Backend | Go 1.25+, Chi router |
| Container | Docker |
| Orchestration | Kubernetes (Docker Desktop) |
| Service Mesh | Istio |
| Package Manager | pnpm (frontend), Go modules (backend) |

## Project Structure
```
istio-learning/
├── PLAN.md                # This file
├── README.md              # Quick start guide
├── Makefile               # Common commands
├── apps/
│   ├── frontend/          # TypeScript/React frontend
│   │   ├── src/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── vite.config.ts
│   ├── api-gateway/       # Go API gateway
│   │   ├── main.go
│   │   ├── Dockerfile
│   │   └── go.mod
│   ├── users-service/     # Go users microservice
│   │   ├── main.go
│   │   ├── Dockerfile
│   │   └── go.mod
│   └── orders-service/    # Go orders microservice (v1, v2)
│       ├── main.go
│       ├── Dockerfile
│       └── go.mod
├── k8s/
│   ├── base/              # Base Kubernetes manifests
│   │   ├── namespace.yaml
│   │   ├── frontend.yaml
│   │   ├── api-gateway.yaml
│   │   ├── users-service.yaml
│   │   └── orders-service.yaml
│   └── istio/             # Istio configurations
│       ├── gateway.yaml
│       ├── virtual-services/
│       │   ├── orders-v1-only.yaml
│       │   ├── orders-canary.yaml
│       │   └── orders-header-routing.yaml
│       ├── destination-rules/
│       │   └── orders.yaml
│       ├── fault-injection.yaml
│       └── security/
│           ├── peer-authentication.yaml
│           └── authorization-policy.yaml
└── scripts/
    ├── setup-istio.sh
    └── deploy.sh
```

---

## Phase 1: Environment Setup

### Prerequisites
```bash
# Verify Docker Desktop Kubernetes is running
kubectl get nodes

# Install istioctl via Homebrew
brew install istioctl
istioctl version
```

### Install Istio
```bash
# Install with demo profile (includes all features for learning)
istioctl install --set profile=demo -y

# Create namespace for the app
kubectl create namespace istio-demo

# Enable automatic sidecar injection
kubectl label namespace istio-demo istio-injection=enabled

# Verify installation
kubectl get pods -n istio-system
```

### Install Observability Addons
```bash
ISTIO_VERSION=$(istioctl version --short 2>/dev/null | head -1)
kubectl apply -f https://raw.githubusercontent.com/istio/istio/${ISTIO_VERSION}/samples/addons/prometheus.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/${ISTIO_VERSION}/samples/addons/grafana.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/${ISTIO_VERSION}/samples/addons/jaeger.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/${ISTIO_VERSION}/samples/addons/kiali.yaml

# Wait for Kiali to be ready
kubectl rollout status deployment/kiali -n istio-system
```

---

## Phase 2: Build Sample Application

### Architecture
```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│   Frontend  │────▶│ API Gateway │────▶│ Users Service   │
│ (TypeScript)│     │    (Go)     │     │     (Go)        │
└─────────────┘     └─────────────┘     └─────────────────┘
                           │
                           ▼
                    ┌─────────────────┐
                    │ Orders Service  │  ← v1 and v2 for canary
                    │     (Go)        │
                    └─────────────────┘
```

### 2.1 Frontend (TypeScript/React)
- React 18 + Vite + TypeScript
- Displays users list and orders list
- Calls API Gateway via fetch
- Simple UI, no CSS framework

**Key files:**
- `apps/frontend/src/App.tsx` - Main component
- `apps/frontend/src/api.ts` - API client
- `apps/frontend/Dockerfile` - Multi-stage build

### 2.2 API Gateway (Go + Chi)
```go
// Routes
r.Get("/api/users", proxyToUsersService)
r.Get("/api/orders", proxyToOrdersService)
r.Get("/health", healthCheck)
```
- Proxies requests to backend services
- Service discovery via K8s DNS (`users-service.istio-demo.svc.cluster.local`)

### 2.3 Users Service (Go + Chi)
```go
// Endpoints
GET /users       → List users (mock data)
GET /users/{id}  → Get user by ID
GET /health      → Health check
```

### 2.4 Orders Service (Go + Chi) - Two Versions
```go
// v1 response
{"orders": [{"id": "1", "product": "Widget", "status": "shipped"}]}

// v2 response (adds estimated_delivery)
{"orders": [{"id": "1", "product": "Widget", "status": "shipped", "estimated_delivery": "2025-01-10"}]}
```

The only difference between v1 and v2 is the `estimated_delivery` field. This makes it easy to verify which version is serving traffic.

---

## Phase 3: Traffic Management

### 3.1 Istio Gateway + VirtualService
```yaml
# k8s/istio/gateway.yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: app-gateway
  namespace: istio-demo
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - "*"
```

### 3.2 Route All Traffic to v1
```yaml
# k8s/istio/virtual-services/orders-v1-only.yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: orders-service
  namespace: istio-demo
spec:
  hosts:
  - orders-service
  http:
  - route:
    - destination:
        host: orders-service
        subset: v1
      weight: 100
```

### 3.3 Canary Deployment (90/10)
```yaml
# k8s/istio/virtual-services/orders-canary.yaml
spec:
  http:
  - route:
    - destination:
        host: orders-service
        subset: v1
      weight: 90
    - destination:
        host: orders-service
        subset: v2
      weight: 10
```

### 3.4 Header-based Routing
```yaml
# k8s/istio/virtual-services/orders-header-routing.yaml
spec:
  http:
  - match:
    - headers:
        x-version:
          exact: v2
    route:
    - destination:
        host: orders-service
        subset: v2
  - route:
    - destination:
        host: orders-service
        subset: v1
```

### 3.5 Destination Rules (Subsets)
```yaml
# k8s/istio/destination-rules/orders.yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: orders-service
  namespace: istio-demo
spec:
  host: orders-service
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

### 3.6 Fault Injection
```yaml
# k8s/istio/fault-injection.yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: users-service-fault
  namespace: istio-demo
spec:
  hosts:
  - users-service
  http:
  - fault:
      delay:
        percentage:
          value: 100
        fixedDelay: 3s
    route:
    - destination:
        host: users-service
```

---

## Phase 4: Security

### 4.1 Verify mTLS
```bash
# Check if mTLS is enabled
istioctl analyze -n istio-demo

# View proxy config
istioctl proxy-config cluster deploy/api-gateway -n istio-demo
```

### 4.2 Strict mTLS Policy
```yaml
# k8s/istio/security/peer-authentication.yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-demo
spec:
  mtls:
    mode: STRICT
```

### 4.3 Authorization Policy
```yaml
# k8s/istio/security/authorization-policy.yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: users-service-policy
  namespace: istio-demo
spec:
  selector:
    matchLabels:
      app: users-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/istio-demo/sa/api-gateway"]
```

---

## Phase 5: Observability

### Access Dashboards
```bash
# Kiali - Service mesh visualization
istioctl dashboard kiali

# Jaeger - Distributed tracing
istioctl dashboard jaeger

# Grafana - Metrics dashboards
istioctl dashboard grafana

# Prometheus - Raw metrics
istioctl dashboard prometheus
```

### What to Look For
- **Kiali**: Service graph, traffic flow, health status
- **Jaeger**: Request traces across services, latency breakdown
- **Grafana**: Istio dashboards for request rate, error rate, latency

---

## Learning Exercises

| # | Exercise | Istio Concept | Commands |
|---|----------|---------------|----------|
| 1 | Deploy all services | Sidecar injection | `kubectl apply -k k8s/base` |
| 2 | Route all to v1 | VirtualService | `kubectl apply -f k8s/istio/virtual-services/orders-v1-only.yaml` |
| 3 | Canary 90/10 | Traffic splitting | `kubectl apply -f k8s/istio/virtual-services/orders-canary.yaml` |
| 4 | Header routing | Match conditions | `kubectl apply -f k8s/istio/virtual-services/orders-header-routing.yaml` |
| 5 | Inject 3s delay | Fault injection | `kubectl apply -f k8s/istio/fault-injection.yaml` |
| 6 | Enable strict mTLS | PeerAuthentication | `kubectl apply -f k8s/istio/security/peer-authentication.yaml` |
| 7 | Restrict access | AuthorizationPolicy | `kubectl apply -f k8s/istio/security/authorization-policy.yaml` |
| 8 | View service graph | Kiali | `istioctl dashboard kiali` |
| 9 | Trace requests | Jaeger | `istioctl dashboard jaeger` |

---

## Quick Reference

### Useful Commands
```bash
# Check Istio installation
istioctl analyze

# View sidecar proxy logs
kubectl logs deploy/api-gateway -c istio-proxy -n istio-demo

# Check VirtualService configuration
istioctl describe virtualservice orders-service -n istio-demo

# View proxy configuration
istioctl proxy-config routes deploy/api-gateway -n istio-demo

# Generate traffic for testing
while true; do curl http://localhost/api/orders; sleep 1; done
```

### Troubleshooting
```bash
# Check if sidecar is injected
kubectl get pods -n istio-demo -o jsonpath='{.items[*].spec.containers[*].name}'

# Debug proxy issues
istioctl proxy-status

# View Envoy config dump
istioctl proxy-config all deploy/api-gateway -n istio-demo -o json
```

---

## Resources
- [Istio Documentation](https://istio.io/latest/docs/)
- [Traffic Management](https://istio.io/latest/docs/tasks/traffic-management/)
- [Security](https://istio.io/latest/docs/tasks/security/)
- [Observability](https://istio.io/latest/docs/tasks/observability/)
- [Chi Router](https://github.com/go-chi/chi)
