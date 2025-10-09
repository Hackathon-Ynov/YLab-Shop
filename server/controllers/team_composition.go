package controllers

import (
	"net/http"

	"github.com/ericp/ylab-hackathon/config"
	"github.com/ericp/ylab-hackathon/models"
	"github.com/gin-gonic/gin"
)

// GetAllTeamCompositions godoc
// @Summary Liste de toutes les compositions d'équipes (Admin)
// @Description Récupère toutes les compositions d'équipes pour la gestion
// @Tags Admin
// @Produce json
// @Security BearerAuth
// @Success 200 {array} models.TeamComposition "Liste des compositions d'équipes"
// @Failure 401 {object} map[string]string "Non authentifié"
// @Failure 403 {object} map[string]string "Accès admin requis"
// @Failure 500 {object} map[string]string "Erreur serveur"
// @Router /api/admin/team-compositions [get]
func GetAllTeamCompositions(c *gin.Context) {
	var teams []models.TeamComposition
	if err := config.DB.Find(&teams).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch team compositions"})
		return
	}

	c.JSON(http.StatusOK, teams)
}

// ToggleTeamSlot godoc
// @Summary Remplir ou vider un slot d'un département (Admin)
// @Description Permet de remplir ou de vider un slot pour un département spécifique d'une équipe
// @Tags Admin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID de la composition d'équipe"
// @Param request body models.ToggleSlotRequest true "Département et action"
// @Success 200 {object} models.TeamComposition "Composition d'équipe mise à jour"
// @Failure 400 {object} map[string]string "Requête invalide"
// @Failure 401 {object} map[string]string "Non authentifié"
// @Failure 403 {object} map[string]string "Accès admin requis"
// @Failure 404 {object} map[string]string "Équipe non trouvée"
// @Router /api/admin/team-compositions/{id}/toggle [post]
func ToggleTeamSlot(c *gin.Context) {
	teamID := c.Param("id")

	var req models.ToggleSlotRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var team models.TeamComposition
	if err := config.DB.First(&team, teamID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Team composition not found"})
		return
	}

	// Calculate the change
	change := 1
	if req.Action == "empty" {
		change = -1
	}

	// Update the appropriate department filled count
	switch req.Department {
	case "dev":
		team.DevFilled += change
		if team.DevFilled < 0 {
			team.DevFilled = 0
		}
		if team.DevFilled > team.DevTotal {
			team.DevFilled = team.DevTotal
		}
	case "infra":
		team.InfraFilled += change
		if team.InfraFilled < 0 {
			team.InfraFilled = 0
		}
		if team.InfraFilled > team.InfraTotal {
			team.InfraFilled = team.InfraTotal
		}
	case "data":
		team.DataFilled += change
		if team.DataFilled < 0 {
			team.DataFilled = 0
		}
		if team.DataFilled > team.DataTotal {
			team.DataFilled = team.DataTotal
		}
	case "iot":
		team.IoTFilled += change
		if team.IoTFilled < 0 {
			team.IoTFilled = 0
		}
		if team.IoTFilled > team.IoTTotal {
			team.IoTFilled = team.IoTTotal
		}
	case "sysemb":
		team.SysembFilled += change
		if team.SysembFilled < 0 {
			team.SysembFilled = 0
		}
		if team.SysembFilled > team.SysembTotal {
			team.SysembFilled = team.SysembTotal
		}
	}

	if err := config.DB.Save(&team).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update team composition"})
		return
	}

	c.JSON(http.StatusOK, team)
}
