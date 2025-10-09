package controllers

import (
	"net/http"

	"github.com/ericp/ylab-hackathon/config"
	"github.com/ericp/ylab-hackathon/models"
	"github.com/ericp/ylab-hackathon/utils"
	"github.com/gin-gonic/gin"
)

// GetTeamProfile godoc
// @Summary Profil de l'équipe
// @Description Récupère le profil de l'équipe connectée
// @Tags Team
// @Produce json
// @Security BearerAuth
// @Success 200 {object} models.TeamResponse "Profil de l'équipe"
// @Failure 401 {object} map[string]string "Non authentifié"
// @Failure 404 {object} map[string]string "Équipe non trouvée"
// @Router /api/team/profile [get]
func GetTeamProfile(c *gin.Context) {
	userID, _ := c.Get("user_id")
	teamID := userID.(uint)

	var team models.Team
	if err := config.DB.First(&team, teamID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Team not found"})
		return
	}

	c.JSON(http.StatusOK, team.ToResponse())
}

// UpdateTeamProfile godoc
// @Summary Mettre à jour le profil de l'équipe
// @Description Permet à l'équipe connectée de mettre à jour son email
// @Tags Team
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param profile body models.UpdateTeamProfileRequest true "Nouvelles informations du profil"
// @Success 200 {object} models.TeamResponse "Profil mis à jour"
// @Failure 400 {object} map[string]string "Requête invalide"
// @Failure 401 {object} map[string]string "Non authentifié"
// @Failure 404 {object} map[string]string "Équipe non trouvée"
// @Router /api/team/profile [put]
func UpdateTeamProfile(c *gin.Context) {
	userID, _ := c.Get("user_id")
	teamID := userID.(uint)

	var req models.UpdateTeamProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if valid email (has @ and .)
	if !utils.IsValidEmail(req.Email) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid email format"})
		return
	}

	var team models.Team
	if err := config.DB.First(&team, teamID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Team not found"})
		return
	}

	// Check if email is already taken by another team
	var existingTeam models.Team
	if err := config.DB.Where("email = ? AND id != ?", req.Email, teamID).First(&existingTeam).Error; err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email already taken"})
		return
	}

	team.Email = req.Email
	if err := config.DB.Save(&team).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
		return
	}

	c.JSON(http.StatusOK, team.ToResponse())
}

func GetTeamPurchases(c *gin.Context) {
	userID, _ := c.Get("user_id")
	teamID := userID.(uint)

	query := config.DB.Where("team_id = ?", teamID).Preload("Resource")

	// Optional filter for items that need to be returned
	needsReturn := c.Query("needs_return")
	if needsReturn == "true" {
		query = query.Where("needs_return = ? AND status = ? AND is_returned = ?", true, models.StatusConfirmed, false)
	}

	var purchases []models.Purchase
	if err := query.Order("purchase_date DESC").Find(&purchases).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch purchases"})
		return
	}

	c.JSON(http.StatusOK, purchases)
}

func GetTeamVotes(c *gin.Context) {
	userID, _ := c.Get("user_id")
	teamID := userID.(uint)

	var votes []models.Vote
	if err := config.DB.Where("team_id = ?", teamID).Preload("Poll").Find(&votes).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch votes"})
		return
	}

	c.JSON(http.StatusOK, votes)
}

// GetAllTeams godoc
// @Summary Liste de toutes les équipes (Admin)
// @Description Récupère toutes les équipes pour le filtre admin
// @Tags Admin
// @Produce json
// @Security BearerAuth
// @Success 200 {array} models.TeamResponse "Liste des équipes"
// @Failure 401 {object} map[string]string "Non authentifié"
// @Failure 403 {object} map[string]string "Accès admin requis"
// @Failure 500 {object} map[string]string "Erreur serveur"
// @Router /api/admin/teams [get]
func GetAllTeams(c *gin.Context) {
	var teams []models.Team
	if err := config.DB.Find(&teams).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch teams"})
		return
	}

	// Convert to response format
	teamResponses := make([]models.TeamResponse, len(teams))
	for i, team := range teams {
		teamResponses[i] = team.ToResponse()
	}

	c.JSON(http.StatusOK, teamResponses)
}
