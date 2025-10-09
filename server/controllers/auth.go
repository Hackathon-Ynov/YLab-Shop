package controllers

import (
	"net/http"
	"time"

	"github.com/ericp/ylab-hackathon/config"
	"github.com/ericp/ylab-hackathon/models"
	"github.com/ericp/ylab-hackathon/utils"
	"github.com/gin-gonic/gin"
)

// TeamLogin godoc
// @Summary Connexion équipe
// @Description Authentification d'une équipe avec nom et mot de passe
// @Tags Authentication
// @Accept json
// @Produce json
// @Param credentials body models.TeamLoginRequest true "Identifiants de connexion"
// @Success 200 {object} map[string]interface{} "Token JWT et informations de l'équipe"
// @Failure 400 {object} map[string]string "Requête invalide"
// @Failure 401 {object} map[string]string "Identifiants invalides"
// @Router /api/auth/team/login [post]
func TeamLogin(c *gin.Context) {
	var req models.TeamLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var team models.Team
	if err := config.DB.Where("name = ?", req.Name).First(&team).Error; err != nil {
		if err = config.DB.Where("email = ?", req.Name).First(&team).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
			return
		}
	}

	if !utils.CheckPasswordHash(req.Password, team.PasswordHash) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Update last activity
	team.LastActivity = time.Now()
	config.DB.Save(&team)

	token, err := utils.GenerateToken(team.ID, "team", config.AppConfig.JWTSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"team":  team.ToResponse(),
	})
}

// AdminLogin godoc
// @Summary Connexion administrateur
// @Description Authentification d'un administrateur avec username et mot de passe
// @Tags Authentication
// @Accept json
// @Produce json
// @Param credentials body models.AdminLoginRequest true "Identifiants de connexion admin"
// @Success 200 {object} map[string]interface{} "Token JWT et informations de l'admin"
// @Failure 400 {object} map[string]string "Requête invalide"
// @Failure 401 {object} map[string]string "Identifiants invalides"
// @Router /api/auth/admin/login [post]
func AdminLogin(c *gin.Context) {
	var req models.AdminLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var admin models.Admin
	if err := config.DB.Where("username = ?", req.Username).First(&admin).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	if !utils.CheckPasswordHash(req.Password, admin.PasswordHash) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	token, err := utils.GenerateToken(admin.ID, "admin", config.AppConfig.JWTSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"admin": gin.H{
			"id":       admin.ID,
			"username": admin.Username,
			"email":    admin.Email,
		},
	})
}

// VerifyToken godoc
// @Summary Vérifier le token
// @Description Vérifie si le token JWT est valide et retourne les informations de l'utilisateur
// @Tags Authentication
// @Produce json
// @Security BearerAuth
// @Success 200 {object} map[string]interface{} "Token valide"
// @Failure 401 {object} map[string]string "Token invalide"
// @Router /api/auth/verify [get]
func VerifyToken(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
		return
	}

	userType, _ := c.Get("user_type")

	if userType == "team" {
		var team models.Team
		if err := config.DB.First(&team, userID).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"valid": true,
			"type":  "team",
			"user":  team.ToResponse(),
		})
	} else if userType == "admin" {
		var admin models.Admin
		if err := config.DB.First(&admin, userID).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"valid": true,
			"type":  "admin",
			"user": gin.H{
				"id":       admin.ID,
				"username": admin.Username,
				"email":    admin.Email,
			},
		})
	} else {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user type"})
	}
}
