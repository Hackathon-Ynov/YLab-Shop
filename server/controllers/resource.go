package controllers

import (
	"net/http"

	"github.com/ericp/ylab-hackathon/config"
	"github.com/ericp/ylab-hackathon/models"
	"github.com/gin-gonic/gin"
)

// GetResources godoc
// @Summary Liste des ressources
// @Description Récupère la liste de toutes les ressources actives, avec filtre optionnel par type
// @Tags Resources
// @Produce json
// @Param type query string false "Type de ressource" Enums(service, matériel, avantage)
// @Success 200 {array} models.Resource "Liste des ressources"
// @Failure 500 {object} map[string]string "Erreur serveur"
// @Router /api/resources [get]
func GetResources(c *gin.Context) {
	var resources []models.Resource
	query := config.DB.Where("is_active = ?", true)

	// Optional filters
	resourceType := c.Query("type")
	if resourceType != "" {
		query = query.Where("type = ?", resourceType)
	}

	if err := query.Find(&resources).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch resources"})
		return
	}

	c.JSON(http.StatusOK, resources)
}

// GetResource godoc
// @Summary Détails d'une ressource
// @Description Récupère les détails complets d'une ressource par son ID
// @Tags Resources
// @Produce json
// @Param id path int true "ID de la ressource"
// @Success 200 {object} models.Resource "Détails de la ressource"
// @Failure 404 {object} map[string]string "Ressource non trouvée"
// @Router /api/resources/{id} [get]
func GetResource(c *gin.Context) {
	id := c.Param("id")

	var resource models.Resource
	if err := config.DB.First(&resource, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Resource not found"})
		return
	}

	c.JSON(http.StatusOK, resource)
}
