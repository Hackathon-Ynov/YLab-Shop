package routes

import (
	"github.com/ericp/ylab-hackathon/controllers"
	"github.com/ericp/ylab-hackathon/middleware"
	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

func SetupRoutes(router *gin.Engine) {
	// Public routes
	api := router.Group("/api")
	{
		// Auth routes
		auth := api.Group("/auth")
		{
			auth.POST("/team/login", controllers.TeamLogin)
			auth.POST("/admin/login", controllers.AdminLogin)
			auth.GET("/verify", middleware.AuthMiddleware(""), controllers.VerifyToken)
		}

		// Public resources (view only)
		api.GET("/resources", controllers.GetResources)
		api.GET("/resources/:id", controllers.GetResource)

		// Public polls (view only)
		api.GET("/polls", controllers.GetPolls)
		api.GET("/polls/:id", controllers.GetPoll)
		api.GET("/polls/:id/results", controllers.GetPollResults)
	}

	// Team protected routes
	team := api.Group("/team")
	team.Use(middleware.AuthMiddleware("team"))
	{
		team.GET("/profile", controllers.GetTeamProfile)
		team.PUT("/profile", controllers.UpdateTeamProfile)
		team.GET("/purchases", controllers.GetTeamPurchases)
		team.GET("/votes", controllers.GetTeamVotes)

		// Purchase management
		team.POST("/purchases", controllers.CreatePurchase)
		team.POST("/purchases/batch", controllers.CreateBatchPurchase)
		team.POST("/purchases/:id/return", controllers.ReturnPurchase)

		// Voting
		team.POST("/votes", controllers.CreateVote)
		team.GET("/votes/poll/:pollId", controllers.GetVote)
	}

	// Admin protected routes
	admin := api.Group("/admin")
	admin.Use(middleware.AuthMiddleware("admin"))
	{
		// Purchase management
		admin.GET("/purchases", controllers.GetAllPurchases)
		admin.POST("/purchases/:id/action", controllers.UpdatePurchaseStatus)
		admin.POST("/purchases/batch/action", controllers.UpdateBatchPurchaseStatus)
		admin.POST("/purchases/:id/mark-returned", controllers.MarkPurchaseAsReturned)
		admin.POST("/purchases/:id/unmark-returned", controllers.UnmarkPurchaseAsReturned)
		admin.GET("/teams", controllers.GetAllTeams)

		// Team composition management
		admin.GET("/team-compositions", controllers.GetAllTeamCompositions)
		admin.POST("/team-compositions/:id/toggle", controllers.ToggleTeamSlot)
	}

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// Swagger documentation
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// Serve static files from the frontend build
	router.Static("/assets", "./static/assets")
	router.StaticFile("/favicon.ico", "./static/favicon.ico")

	// Catch-all route for frontend routing (SPA)
	// This must be the last route to avoid conflicts with API routes
	router.NoRoute(func(c *gin.Context) {
		c.File("./static/index.html")
	})
}
