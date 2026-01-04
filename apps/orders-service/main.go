package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

type Order struct {
	ID                string `json:"id"`
	Product           string `json:"product"`
	Status            string `json:"status"`
	EstimatedDelivery string `json:"estimated_delivery,omitempty"`
}

func main() {
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	version := getEnv("VERSION", "v1")

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("OK"))
	})

	r.Get("/orders", func(w http.ResponseWriter, r *http.Request) {
		orders := getOrders(version)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string][]Order{"orders": orders})
	})

	port := getEnv("PORT", "8080")
	log.Printf("Orders Service %s starting on port %s", version, port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}

func getOrders(version string) []Order {
	orders := []Order{
		{ID: "1", Product: "Laptop", Status: "shipped"},
		{ID: "2", Product: "Keyboard", Status: "processing"},
		{ID: "3", Product: "Mouse", Status: "delivered"},
	}

	// v2 includes estimated delivery dates
	if version == "v2" {
		orders[0].EstimatedDelivery = "2025-01-10"
		orders[1].EstimatedDelivery = "2025-01-12"
		orders[2].EstimatedDelivery = "2025-01-05"
	}

	return orders
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
