package controllers

import (
	"net/http"
	"time"

	"github.com/ericp/ylab-hackathon/config"
	"github.com/ericp/ylab-hackathon/models"
	"github.com/gin-gonic/gin"
)

// CreateVote godoc
// @Summary Voter sur un sondage
// @Description Créer un vote sur un sondage ouvert en misant des crédits
// @Tags Votes
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param vote body models.VoteRequest true "Détails du vote"
// @Success 201 {object} models.Vote "Vote créé avec succès"
// @Failure 400 {object} map[string]string "Requête invalide, crédit insuffisant, ou déjà voté"
// @Failure 401 {object} map[string]string "Non authentifié"
// @Failure 404 {object} map[string]string "Sondage non trouvé"
// @Router /api/team/votes [post]
func CreateVote(c *gin.Context) {
	userID, _ := c.Get("user_id")
	teamID := userID.(uint)

	var req models.VoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Start transaction
	tx := config.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Get poll
	var poll models.Poll
	if err := tx.First(&poll, req.PollID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Poll not found"})
		return
	}

	// Check if poll is open
	if poll.Status != models.PollStatusOpen {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Poll is closed"})
		return
	}

	// Check if poll is within date range
	now := time.Now()
	if now.Before(poll.StartDate) || now.After(poll.EndDate) {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Poll is not currently active"})
		return
	}

	// Check if option is valid
	validOption := false
	for _, option := range poll.Options {
		if option == req.ChosenOption {
			validOption = true
			break
		}
	}
	if !validOption {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid option"})
		return
	}

	// Check if team already voted
	var existingVote models.Vote
	if err := tx.Where("team_id = ? AND poll_id = ?", teamID, req.PollID).First(&existingVote).Error; err == nil {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Team has already voted on this poll"})
		return
	}

	// Get team
	var team models.Team
	if err := tx.First(&team, teamID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Team not found"})
		return
	}

	// Check team credit
	if team.Credit < req.CreditStaked {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Insufficient credit"})
		return
	}

	// Deduct credit
	team.Credit -= req.CreditStaked
	if err := tx.Save(&team).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update credit"})
		return
	}

	// Create vote
	vote := models.Vote{
		TeamID:       teamID,
		PollID:       req.PollID,
		ChosenOption: req.ChosenOption,
		CreditStaked: req.CreditStaked,
		VoteDate:     time.Now(),
	}

	if err := tx.Create(&vote).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create vote"})
		return
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Transaction failed"})
		return
	}

	// Load relations for response
	config.DB.Preload("Poll").Preload("Team").First(&vote, vote.ID)

	c.JSON(http.StatusCreated, vote)
}

func GetVote(c *gin.Context) {
	userID, _ := c.Get("user_id")
	teamID := userID.(uint)
	pollID := c.Param("pollId")

	var vote models.Vote
	if err := config.DB.Where("team_id = ? AND poll_id = ?", teamID, pollID).
		Preload("Poll").First(&vote).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Vote not found"})
		return
	}

	c.JSON(http.StatusOK, vote)
}
