package main

import (
	"log"

	"github.com/ericp/ylab-hackathon/config"
	"github.com/ericp/ylab-hackathon/controllers"
	_ "github.com/ericp/ylab-hackathon/docs"
	"github.com/ericp/ylab-hackathon/middleware"
	"github.com/ericp/ylab-hackathon/models"
	"github.com/ericp/ylab-hackathon/routes"
	"github.com/gin-gonic/gin"
)

// @title YLab Hackathon API
// @version 1.0
// @description API pour la plateforme de gestion du Hackathon Ynov Toulouse 2025
// @contact.name YLab Hackathon Team
// @contact.email admin@ylabhackathon.com
// @host localhost:8080
// @BasePath /
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Entrez le token JWT avec le préfixe 'Bearer '

func main() {
	// Load configuration
	config.LoadConfig()

	// Connect to database
	config.ConnectDatabase()

	// Run migrations
	err := config.DB.AutoMigrate(
		&models.Team{},
		&models.Admin{},
		&models.Resource{},
		&models.Purchase{},
		&models.Poll{},
		&models.Vote{},
		&models.TeamComposition{},
	)
	if err != nil {
		log.Fatal("Failed to run migrations:", err)
	}

	log.Println("Database migrations completed successfully")

	// Initialize email service
	controllers.InitEmailService()

	// Setup Gin router
	router := gin.Default()

	// Add middleware
	router.Use(middleware.CorsMiddleware())

	// Setup routes
	routes.SetupRoutes(router)

	// Start server
	port := ":" + config.AppConfig.ServerPort
	log.Printf("Server starting on port %s", port)
	if err := router.Run(port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
