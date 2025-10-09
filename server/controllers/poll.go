package controllers

import (
	"net/http"

	"github.com/ericp/ylab-hackathon/config"
	"github.com/ericp/ylab-hackathon/models"
	"github.com/gin-gonic/gin"
)

// GetPolls godoc
// @Summary Liste des sondages
// @Description Récupère tous les sondages avec filtre optionnel par statut
// @Tags Polls
// @Produce json
// @Param status query string false "Filtrer par statut" Enums(ouvert, fermé)
// @Success 200 {array} models.Poll "Liste des sondages"
// @Failure 500 {object} map[string]string "Erreur serveur"
// @Router /api/polls [get]
func GetPolls(c *gin.Context) {
	var polls []models.Poll
	query := config.DB

	// Filter by status if provided
	status := c.Query("status")
	if status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Order("start_date DESC").Find(&polls).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch polls"})
		return
	}

	c.JSON(http.StatusOK, polls)
}

func GetPoll(c *gin.Context) {
	id := c.Param("id")

	var poll models.Poll
	if err := config.DB.Preload("Votes").First(&poll, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Poll not found"})
		return
	}

	c.JSON(http.StatusOK, poll)
}

func GetPollResults(c *gin.Context) {
	id := c.Param("id")

	var poll models.Poll
	if err := config.DB.First(&poll, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Poll not found"})
		return
	}

	var votes []models.Vote
	if err := config.DB.Where("poll_id = ?", id).Find(&votes).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch votes"})
		return
	}

	// Calculate results
	results := make(map[string]struct {
		Count        int `json:"count"`
		TotalCredits int `json:"total_credits"`
	})

	for _, vote := range votes {
		result := results[vote.ChosenOption]
		result.Count++
		result.TotalCredits += vote.CreditStaked
		results[vote.ChosenOption] = result
	}

	c.JSON(http.StatusOK, gin.H{
		"poll":    poll,
		"results": results,
	})
}
