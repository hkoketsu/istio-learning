.PHONY: all build push deploy clean istio-install istio-addons \
	k6-smoke k6-load k6-canary

# Docker image prefix
IMAGE_PREFIX := istio-demo

# Build all Docker images
build:
	docker build -t $(IMAGE_PREFIX)/frontend:latest ./apps/frontend
	docker build -t $(IMAGE_PREFIX)/api-gateway:latest ./apps/api-gateway
	docker build -t $(IMAGE_PREFIX)/users-service:latest ./apps/users-service
	docker build -t $(IMAGE_PREFIX)/orders-service:latest ./apps/orders-service

# Install Istio with demo profile
istio-install:
	istioctl install --set profile=demo -y

# Install Istio addons (Kiali, Jaeger, Prometheus, Grafana)
istio-addons:
	@ISTIO_VERSION=$$(istioctl version --short 2>/dev/null | grep client | awk '{print $$3}'); \
	echo "Installing addons for Istio $${ISTIO_VERSION}..."; \
	kubectl apply -f https://raw.githubusercontent.com/istio/istio/$${ISTIO_VERSION}/samples/addons/prometheus.yaml; \
	kubectl apply -f https://raw.githubusercontent.com/istio/istio/$${ISTIO_VERSION}/samples/addons/grafana.yaml; \
	kubectl apply -f https://raw.githubusercontent.com/istio/istio/$${ISTIO_VERSION}/samples/addons/jaeger.yaml; \
	kubectl apply -f https://raw.githubusercontent.com/istio/istio/$${ISTIO_VERSION}/samples/addons/kiali.yaml
	kubectl rollout status deployment/kiali -n istio-system

# Deploy base resources
deploy-base:
	kubectl apply -f k8s/base/namespace.yaml
	kubectl apply -f k8s/base/

# Deploy Istio gateway and destination rules
deploy-istio:
	kubectl apply -f k8s/istio/gateway.yaml
	kubectl apply -f k8s/istio/destination-rules/

# Route all traffic to v1
route-v1:
	kubectl apply -f k8s/istio/virtual-services/orders-v1-only.yaml

# Canary deployment (90/10)
route-canary:
	kubectl apply -f k8s/istio/virtual-services/orders-canary.yaml

# Header-based routing
route-header:
	kubectl apply -f k8s/istio/virtual-services/orders-header-routing.yaml

# Enable fault injection (delay on users-service)
fault-delay:
	kubectl apply -f k8s/istio/fault-injection/users-delay.yaml

# Enable fault injection (abort on orders-service)
fault-abort:
	kubectl apply -f k8s/istio/fault-injection/orders-abort.yaml

# Enable all fault injections
fault-all:
	kubectl apply -k k8s/istio/fault-injection/

# Remove all fault injections
fault-remove:
	kubectl delete -k k8s/istio/fault-injection/ --ignore-not-found

# Enable strict mTLS
mtls-strict:
	kubectl apply -f k8s/istio/security/peer-authentication.yaml

# Apply deny-all policy
authz-deny:
	kubectl apply -f k8s/istio/security/deny-all.yaml

# Apply allow policies
authz-allow:
	kubectl apply -f k8s/istio/security/allow-policies.yaml

# Apply all security policies (mTLS + authorization)
security-apply:
	kubectl apply -k k8s/istio/security/

# Remove all security policies
security-remove:
	kubectl delete -k k8s/istio/security/ --ignore-not-found

# Full deployment
deploy: deploy-base deploy-istio route-v1

# Open dashboards
kiali:
	istioctl dashboard kiali

jaeger:
	istioctl dashboard jaeger

grafana:
	istioctl dashboard grafana

# Port forward to access the app
port-forward:
	kubectl port-forward -n istio-system svc/istio-ingressgateway 8080:80

# Check pod status
status:
	kubectl get pods -n istio-demo

# View logs
logs-gateway:
	kubectl logs -f -n istio-demo -l app=api-gateway

logs-users:
	kubectl logs -f -n istio-demo -l app=users-service

logs-orders:
	kubectl logs -f -n istio-demo -l app=orders-service

# Clean up
clean:
	kubectl delete namespace istio-demo --ignore-not-found

# Full setup from scratch
setup: istio-install istio-addons build deploy
	@echo "Setup complete! Run 'make port-forward' and visit http://localhost:8080"

# ============ k6 Load Testing ============

# Quick smoke test (1 VU, 30s)
k6-smoke:
	k6 run k6/scenarios/smoke.js

# Standard load test (ramp up to 20 VUs)
k6-load:
	k6 run k6/scenarios/load.js

# Canary validation test (use after make route-canary)
k6-canary:
	k6 run k6/scenarios/canary.js

