package controllers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/ericp/ylab-hackathon/config"
	"github.com/ericp/ylab-hackathon/models"
	"github.com/ericp/ylab-hackathon/utils"
	"github.com/gin-gonic/gin"
)

var emailService *utils.EmailService

func InitEmailService() {
	emailService = utils.NewEmailService(
		config.AppConfig.SMTPHost,
		config.AppConfig.SMTPPort,
		config.AppConfig.SMTPUser,
		config.AppConfig.SMTPPass,
		config.AppConfig.SMTPFrom,
	)
}

// CreatePurchase godoc
// @Summary Acheter une ressource
// @Description Créer une demande d'achat pour une ressource (statut: en attente)
// @Tags Purchases
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param purchase body models.PurchaseRequest true "Détails de l'achat"
// @Success 201 {object} models.Purchase "Achat créé avec succès"
// @Failure 400 {object} map[string]string "Requête invalide ou crédit insuffisant"
// @Failure 401 {object} map[string]string "Non authentifié"
// @Failure 404 {object} map[string]string "Ressource non trouvée"
// @Router /api/team/purchases [post]
func CreatePurchase(c *gin.Context) {
	userID, _ := c.Get("user_id")
	teamID := userID.(uint)

	var req models.PurchaseRequest
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

	// Get team
	var team models.Team
	if err := tx.First(&team, teamID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Team not found"})
		return
	}

	// Get resource
	var resource models.Resource
	if err := tx.First(&resource, req.ResourceID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Resource not found"})
		return
	}

	// Check if resource is active
	if !resource.IsActive {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Resource is not available"})
		return
	}

	// Check quantity available
	if resource.Quantity < req.Quantity {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Insufficient quantity available"})
		return
	}

	// Check max per team
	var teamPurchasesCount int64
	tx.Model(&models.Purchase{}).
		Where("team_id = ? AND resource_id = ? AND status = ?", teamID, req.ResourceID, models.StatusConfirmed).
		Count(&teamPurchasesCount)

	if int(teamPurchasesCount)+req.Quantity > resource.MaxPerTeam {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Ressource %s : dépassement de la quantité maximale par équipe", resource.Name)})
		return
	}

	// Calculate total cost
	totalCost := resource.Cost * req.Quantity

	// Check team credit
	if team.Credit < totalCost {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Insufficient credit"})
		return
	}

	// Deduct credit
	team.Credit -= totalCost
	if err := tx.Save(&team).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update credit"})
		return
	}

	// Create purchase
	purchase := models.Purchase{
		TeamID:       teamID,
		ResourceID:   req.ResourceID,
		Quantity:     req.Quantity,
		PurchaseDate: time.Now(),
		Status:       models.StatusPending,
		IsReturned:   false,
	}

	if err := tx.Create(&purchase).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create purchase"})
		return
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Transaction failed"})
		return
	}

	// Load relations for response
	config.DB.Preload("Resource").Preload("Team").First(&purchase, purchase.ID)

	// Send purchase creation email (pending status)
	go emailService.SendEmail(
		purchase.Team.Email,
		"Demande d'achat reçue - YLab Hackathon",
		fmt.Sprintf(`
			<html>
			<body>
				<h2>Demande d'achat reçue</h2>
				<p>Bonjour %s,</p>
				<p>Votre demande d'achat pour la ressource <b>%s</b> (quantité : %d) a bien été enregistrée et est en attente de validation par l'administration.</p>
				<p>Vous recevrez un email dès que votre demande sera traitée.</p>
			</body>
			</html>
		`, purchase.Team.Name, purchase.Resource.Name, purchase.Quantity),
	)

	c.JSON(http.StatusCreated, purchase)
}

// CreateBatchPurchase godoc
// @Summary Acheter plusieurs ressources
// @Description Créer une demande d'achat pour plusieurs ressources (statut: en attente)
// @Tags Purchases
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param purchase body models.BatchPurchaseRequest true "Liste des articles à acheter"
// @Success 201 {array} models.Purchase "Achats créés avec succès"
// @Failure 400 {object} map[string]string "Requête invalide ou crédit insuffisant"
// @Failure 401 {object} map[string]string "Non authentifié"
// @Failure 404 {object} map[string]string "Ressource non trouvée"
// @Router /api/team/purchases/batch [post]
func CreateBatchPurchase(c *gin.Context) {
	userID, _ := c.Get("user_id")
	teamID := userID.(uint)

	var req models.BatchPurchaseRequest
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

	// Get team
	var team models.Team
	if err := tx.First(&team, teamID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Team not found"})
		return
	}

	// Validate all items first and calculate total cost
	totalCost := 0
	type validatedItem struct {
		resource models.Resource
		quantity int
	}
	validatedItems := make([]validatedItem, 0, len(req.Items))

	for _, item := range req.Items {
		var resource models.Resource
		if err := tx.First(&resource, item.ResourceID).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusNotFound, gin.H{"error": "Resource not found", "resource_id": item.ResourceID})
			return
		}

		if !resource.IsActive {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Resource is not available", "resource": resource.Name})
			return
		}

		if resource.Quantity < item.Quantity {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Insufficient quantity available", "resource": resource.Name})
			return
		}

		// Check max per team
		var teamPurchasesCount int64
		tx.Model(&models.Purchase{}).
			Where("team_id = ? AND resource_id = ? AND status = ?", teamID, item.ResourceID, models.StatusConfirmed).
			Count(&teamPurchasesCount)

		if int(teamPurchasesCount)+item.Quantity > resource.MaxPerTeam {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Ressource %s : dépassement de la quantité maximale par équipe", resource.Name)})
			return
		}

		totalCost += resource.Cost * item.Quantity
		validatedItems = append(validatedItems, validatedItem{resource: resource, quantity: item.Quantity})
	}

	// Check team credit
	if team.Credit < totalCost {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Insufficient credit"})
		return
	}

	// Deduct credit
	team.Credit -= totalCost
	if err := tx.Save(&team).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update credit"})
		return
	}

	// Generate unique batch ID for this purchase group
	batchID := fmt.Sprintf("%s-%d", time.Now().Format("20060102150405"), teamID)

	// Assure the comment is not too long
	if len(req.Comment) > 3000 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Comment is too long"})
		return
	}

	// Create purchases with batch_id and comment
	purchases := make([]models.Purchase, 0, len(validatedItems))
	for _, item := range validatedItems {
		purchase := models.Purchase{
			BatchID:           &batchID,
			TeamID:            teamID,
			ResourceID:        item.resource.ID,
			Quantity:          item.quantity,
			RequestedQuantity: item.quantity,
			Comment:           req.Comment,
			PurchaseDate:      time.Now(),
			Status:            models.StatusPending,
			IsReturned:        false,
			NeedsReturn:       !item.resource.IsNonReturnable, // Set needs_return based on resource type
		}

		if err := tx.Create(&purchase).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create purchase"})
			return
		}

		purchases = append(purchases, purchase)
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Transaction failed"})
		return
	}

	// Load relations for response
	for i := range purchases {
		config.DB.Preload("Resource").Preload("Team").First(&purchases[i], purchases[i].ID)
	}

	// Send batch purchase creation email
	if len(purchases) > 0 {
		// Build list of items for email
		itemsHTML := ""
		for _, p := range purchases {
			itemsHTML += fmt.Sprintf("<li>%s (quantité : %d)</li>", p.Resource.Name, p.Quantity)
		}
		
		go emailService.SendEmail(
			team.Email,
			"Demande d'achat groupée reçue - YLab Hackathon",
			fmt.Sprintf(`
				<html>
				<body>
					<h2>Demande d'achat groupée reçue</h2>
					<p>Bonjour %s,</p>
					<p>Votre demande d'achat groupée pour %d ressource(s) a bien été enregistrée et est en attente de validation par l'administration.</p>
					<p><b>Ressources demandées :</b></p>
					<ul>%s</ul>
					<p>Vous recevrez un email dès que votre demande sera traitée.</p>
				</body>
				</html>
			`, team.Name, len(purchases), itemsHTML),
		)
	}

	c.JSON(http.StatusCreated, purchases)
}

// GetAllPurchases godoc
// @Summary Liste de tous les achats (Admin)
// @Description Récupère tous les achats avec filtres optionnels (admin uniquement)
// @Tags Purchases
// @Produce json
// @Security BearerAuth
// @Param status query string false "Filtrer par statut" Enums(en attente, confirmé, annulé)
// @Param team_id query int false "Filtrer par équipe"
// @Param needs_return query bool false "Filtrer par articles à retourner"
// @Success 200 {array} models.Purchase "Liste des achats"
// @Failure 401 {object} map[string]string "Non authentifié"
// @Failure 403 {object} map[string]string "Accès admin requis"
// @Failure 500 {object} map[string]string "Erreur serveur"
// @Router /api/admin/purchases [get]
func GetAllPurchases(c *gin.Context) {
	var purchases []models.Purchase
	query := config.DB.Preload("Team").Preload("Resource")

	// Optional filters
	status := c.Query("status")
	if status != "" {
		query = query.Where("status = ?", status)
	}

	teamID := c.Query("team_id")
	if teamID != "" {
		query = query.Where("team_id = ?", teamID)
	}

	needsReturn := c.Query("needs_return")
	if needsReturn == "true" {
		query = query.Where("needs_return = ? AND status = ? AND is_returned = ?", true, models.StatusConfirmed, false)
	}

	if err := query.Order("purchase_date DESC").Find(&purchases).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch purchases"})
		return
	}

	c.JSON(http.StatusOK, purchases)
}

// UpdatePurchaseStatus godoc
// @Summary Valider ou refuser un achat (Admin)
// @Description Confirme ou annule une demande d'achat en attente (admin uniquement)
// @Tags Purchases
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID de l'achat"
// @Param action body models.PurchaseActionRequest true "Action à effectuer"
// @Success 200 {object} models.Purchase "Achat mis à jour"
// @Failure 400 {object} map[string]string "Requête invalide"
// @Failure 401 {object} map[string]string "Non authentifié"
// @Failure 403 {object} map[string]string "Accès admin requis"
// @Failure 404 {object} map[string]string "Achat non trouvé"
// @Router /api/admin/purchases/{id}/action [post]
func UpdatePurchaseStatus(c *gin.Context) {
	id := c.Param("id")

	var req models.PurchaseActionRequest
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

	var purchase models.Purchase
	if err := tx.Preload("Team").Preload("Resource").First(&purchase, id).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Purchase not found"})
		return
	}

	if purchase.Status != models.StatusPending {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Purchase already processed"})
		return
	}

	if req.Action == "confirm" {
		// Update resource quantity
		var resource models.Resource
		if err := tx.First(&resource, purchase.ResourceID).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Resource not found"})
			return
		}

		resource.Quantity -= purchase.Quantity
		if err := tx.Save(&resource).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update resource"})
			return
		}

		purchase.Status = models.StatusConfirmed
		if err := tx.Save(&purchase).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update purchase"})
			return
		}

		// Send confirmation email
		go emailService.SendPurchaseConfirmation(
			purchase.Team.Email,
			purchase.Team.Name,
			purchase.Resource.Name,
			purchase.Quantity,
		)

	} else if req.Action == "cancel" {
		// Refund credit
		var team models.Team
		if err := tx.First(&team, purchase.TeamID).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Team not found"})
			return
		}

		refund := purchase.Resource.Cost * purchase.Quantity
		team.Credit += refund
		if err := tx.Save(&team).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to refund credit"})
			return
		}

		purchase.Status = models.StatusCancelled
		if err := tx.Save(&purchase).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update purchase"})
			return
		}

		// Send rejection email
		go emailService.SendPurchaseRejection(
			purchase.Team.Email,
			purchase.Team.Name,
			purchase.Resource.Name,
			purchase.Quantity,
		)
	}

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Transaction failed"})
		return
	}

	c.JSON(http.StatusOK, purchase)
}

func ReturnPurchase(c *gin.Context) {
	userID, _ := c.Get("user_id")
	teamID := userID.(uint)
	id := c.Param("id")

	// Start transaction
	tx := config.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	var purchase models.Purchase
	if err := tx.Preload("Resource").First(&purchase, id).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Purchase not found"})
		return
	}

	// Check ownership
	if purchase.TeamID != teamID {
		tx.Rollback()
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized"})
		return
	}

	// Check if already returned
	if purchase.IsReturned {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Purchase already returned"})
		return
	}

	// Check if confirmed
	if purchase.Status != models.StatusConfirmed {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Can only return confirmed purchases"})
		return
	}

	// Check if non-returnable
	if purchase.Resource.IsNonReturnable {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "This resource is non-returnable"})
		return
	}

	// Mark as returned (NO REFUND - just marks the item as physically returned)
	purchase.IsReturned = true
	if err := tx.Save(&purchase).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark as returned"})
		return
	}

	// Restore resource quantity
	var resource models.Resource
	if err := tx.First(&resource, purchase.ResourceID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Resource not found"})
		return
	}

	resource.Quantity += purchase.Quantity
	if err := tx.Save(&resource).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to restore resource"})
		return
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Transaction failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Purchase marked as returned successfully (no refund)"})
}

// MarkPurchaseAsReturned godoc
// @Summary Marquer un achat comme retourné (Admin)
// @Description Marque un achat confirmé comme retourné physiquement (admin uniquement, pas de remboursement)
// @Tags Purchases
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID de l'achat"
// @Success 200 {object} map[string]string "Achat marqué comme retourné"
// @Failure 400 {object} map[string]string "Requête invalide"
// @Failure 401 {object} map[string]string "Non authentifié"
// @Failure 403 {object} map[string]string "Accès admin requis"
// @Failure 404 {object} map[string]string "Achat non trouvé"
// @Router /api/admin/purchases/{id}/mark-returned [post]
func MarkPurchaseAsReturned(c *gin.Context) {
	purchaseID := c.Param("id")

	var purchase models.Purchase
	if err := config.DB.Preload("Resource").Preload("Team").First(&purchase, purchaseID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Purchase not found"})
		return
	}

	if purchase.Status != models.StatusConfirmed {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only confirmed purchases can be marked as returned"})
		return
	}

	if purchase.IsReturned {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Purchase already marked as returned"})
		return
	}

	purchase.IsReturned = true
	if err := config.DB.Save(&purchase).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update purchase"})
		return
	}

	// Send return confirmation email to user
	go emailService.SendEmail(
		purchase.Team.Email,
		"Retour de ressource traité - YLab Hackathon",
		fmt.Sprintf(`
			<html>
			<body>
				<h2>Retour de ressource traité</h2>
				<p>Bonjour %s,</p>
				<p>Votre retour pour la ressource <b>%s</b> (quantité : %d) a été traité par l'administration.</p>
				<p>Statut de l'achat : %s</p>
				<p>Merci de votre participation au YLab Hackathon 2025 !</p>
			</body>
			</html>
		`, purchase.Team.Name, purchase.Resource.Name, purchase.Quantity, purchase.Status),
	)

	c.JSON(http.StatusOK, gin.H{"message": "Purchase marked as returned"})
}

// UnmarkPurchaseAsReturned godoc
// @Summary Démarquer un achat comme non retourné (Admin)
// @Description Retire le statut "retourné" d'un achat (admin uniquement)
// @Tags Purchases
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID de l'achat"
// @Success 200 {object} map[string]string "Statut retiré"
// @Failure 400 {object} map[string]string "Requête invalide"
// @Failure 401 {object} map[string]string "Non authentifié"
// @Failure 403 {object} map[string]string "Accès admin requis"
// @Failure 404 {object} map[string]string "Achat non trouvé"
// @Router /api/admin/purchases/{id}/unmark-returned [post]
func UnmarkPurchaseAsReturned(c *gin.Context) {
	purchaseID := c.Param("id")

	var purchase models.Purchase
	if err := config.DB.First(&purchase, purchaseID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Purchase not found"})
		return
	}

	if !purchase.IsReturned {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Purchase is not marked as returned"})
		return
	}

	purchase.IsReturned = false
	if err := config.DB.Save(&purchase).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update purchase"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Purchase unmarked as returned"})
}

// UpdateBatchPurchaseStatus godoc
// @Summary Update batch purchase status with quantity adjustments (Admin)
// @Description Process multiple purchase items in a batch with individual actions and optional quantity adjustments
// @Tags Purchases
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param batch body models.BatchPurchaseActionRequest true "Batch actions to perform"
// @Success 200 {object} map[string]interface{} "Batch processed with results"
// @Failure 400 {object} map[string]string "Invalid request"
// @Failure 401 {object} map[string]string "Not authenticated"
// @Failure 403 {object} map[string]string "Admin access required"
// @Router /api/admin/purchases/batch/action [post]
func UpdateBatchPurchaseStatus(c *gin.Context) {
	var req models.BatchPurchaseActionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	type Result struct {
		PurchaseID uint   `json:"purchase_id"`
		Success    bool   `json:"success"`
		Error      string `json:"error,omitempty"`
		Status     string `json:"status,omitempty"`
		Quantity   int    `json:"quantity,omitempty"`
	}

	results := make([]Result, 0, len(req.Items))
	
	// Track purchases by team for email summary
	type TeamPurchaseInfo struct {
		Team      models.Team
		Confirmed []models.Purchase
		Adjusted  []models.Purchase
		Cancelled []models.Purchase
	}
	teamPurchases := make(map[uint]*TeamPurchaseInfo)

	for _, item := range req.Items {
		// Start transaction for each item
		tx := config.DB.Begin()

		var purchase models.Purchase
		if err := tx.Preload("Team").Preload("Resource").First(&purchase, item.PurchaseID).Error; err != nil {
			tx.Rollback()
			results = append(results, Result{
				PurchaseID: item.PurchaseID,
				Success:    false,
				Error:      "Purchase not found",
			})
			continue
		}

		if purchase.Status != models.StatusPending {
			tx.Rollback()
			results = append(results, Result{
				PurchaseID: item.PurchaseID,
				Success:    false,
				Error:      "Purchase already processed",
			})
			continue
		}

		// Handle action
		if item.Action == "confirm" {
			// Check if quantity adjustment is requested
			approvedQty := purchase.Quantity
			if item.ApprovedQuantity != nil && *item.ApprovedQuantity != purchase.Quantity {
				approvedQty = *item.ApprovedQuantity

				// Validate approved quantity
				if approvedQty < 1 || approvedQty > purchase.RequestedQuantity {
					tx.Rollback()
					results = append(results, Result{
						PurchaseID: item.PurchaseID,
						Success:    false,
						Error:      "Invalid approved quantity",
					})
					continue
				}

				// Calculate credit difference to refund if reducing quantity
				if approvedQty < purchase.Quantity {
					creditDiff := (purchase.Quantity - approvedQty) * purchase.Resource.Cost
					var team models.Team
					if err := tx.First(&team, purchase.TeamID).Error; err != nil {
						tx.Rollback()
						results = append(results, Result{
							PurchaseID: item.PurchaseID,
							Success:    false,
							Error:      "Team not found",
						})
						continue
					}
					team.Credit += creditDiff
					if err := tx.Save(&team).Error; err != nil {
						tx.Rollback()
						results = append(results, Result{
							PurchaseID: item.PurchaseID,
							Success:    false,
							Error:      "Failed to refund credit difference",
						})
						continue
					}
				}

				// Update purchase quantity
				purchase.Quantity = approvedQty
			}

			// Deduct from resource stock
			var resource models.Resource
			if err := tx.First(&resource, purchase.ResourceID).Error; err != nil {
				tx.Rollback()
				results = append(results, Result{
					PurchaseID: item.PurchaseID,
					Success:    false,
					Error:      "Resource not found",
				})
				continue
			}

			if resource.Quantity < purchase.Quantity {
				tx.Rollback()
				results = append(results, Result{
					PurchaseID: item.PurchaseID,
					Success:    false,
					Error:      "Insufficient stock",
				})
				continue
			}

			resource.Quantity -= purchase.Quantity
			if err := tx.Save(&resource).Error; err != nil {
				tx.Rollback()
				results = append(results, Result{
					PurchaseID: item.PurchaseID,
					Success:    false,
					Error:      "Failed to update resource stock",
				})
				continue
			}

			purchase.Status = models.StatusConfirmed
		} else if item.Action == "cancel" {
			// Refund full amount
			var team models.Team
			if err := tx.First(&team, purchase.TeamID).Error; err != nil {
				tx.Rollback()
				results = append(results, Result{
					PurchaseID: item.PurchaseID,
					Success:    false,
					Error:      "Team not found",
				})
				continue
			}

			refund := purchase.Resource.Cost * purchase.Quantity
			team.Credit += refund
			if err := tx.Save(&team).Error; err != nil {
				tx.Rollback()
				results = append(results, Result{
					PurchaseID: item.PurchaseID,
					Success:    false,
					Error:      "Failed to refund credit",
				})
				continue
			}

			purchase.Status = models.StatusCancelled
		}

		// Save purchase
		if err := tx.Save(&purchase).Error; err != nil {
			tx.Rollback()
			results = append(results, Result{
				PurchaseID: item.PurchaseID,
				Success:    false,
				Error:      "Failed to update purchase",
			})
			continue
		}

		// Commit transaction
		if err := tx.Commit().Error; err != nil {
			results = append(results, Result{
				PurchaseID: item.PurchaseID,
				Success:    false,
				Error:      "Transaction failed",
			})
			continue
		}

		// Track successful purchases for email summary
		if _, exists := teamPurchases[purchase.TeamID]; !exists {
			teamPurchases[purchase.TeamID] = &TeamPurchaseInfo{
				Team:      purchase.Team,
				Confirmed: []models.Purchase{},
				Adjusted:  []models.Purchase{},
				Cancelled: []models.Purchase{},
			}
		}

		if item.Action == "confirm" {
			if item.ApprovedQuantity != nil && *item.ApprovedQuantity != purchase.RequestedQuantity {
				// Partial approval
				teamPurchases[purchase.TeamID].Adjusted = append(teamPurchases[purchase.TeamID].Adjusted, purchase)
			} else {
				// Full approval
				teamPurchases[purchase.TeamID].Confirmed = append(teamPurchases[purchase.TeamID].Confirmed, purchase)
			}
		} else if item.Action == "cancel" {
			teamPurchases[purchase.TeamID].Cancelled = append(teamPurchases[purchase.TeamID].Cancelled, purchase)
		}

		results = append(results, Result{
			PurchaseID: item.PurchaseID,
			Success:    true,
			Status:     string(purchase.Status),
			Quantity:   purchase.Quantity,
		})
	}

	// Send summary email for each team
	for _, teamInfo := range teamPurchases {
		if len(teamInfo.Confirmed) == 0 && len(teamInfo.Adjusted) == 0 && len(teamInfo.Cancelled) == 0 {
			continue
		}

		// Build email content
		emailBody := fmt.Sprintf(`
			<html>
			<body>
				<h2>Résumé du traitement de votre commande</h2>
				<p>Bonjour %s,</p>
				<p>Votre commande a été traitée par l'administration. Voici le résumé :</p>
		`, teamInfo.Team.Name)

		// Add confirmed items
		if len(teamInfo.Confirmed) > 0 {
			emailBody += `<h3>✅ Articles confirmés :</h3><ul>`
			for _, p := range teamInfo.Confirmed {
				emailBody += fmt.Sprintf("<li>%s - Quantité : %d</li>", p.Resource.Name, p.Quantity)
			}
			emailBody += `</ul>`
		}

		// Add adjusted items
		if len(teamInfo.Adjusted) > 0 {
			emailBody += `<h3>⚠️ Articles approuvés avec ajustement :</h3><ul>`
			for _, p := range teamInfo.Adjusted {
				emailBody += fmt.Sprintf("<li>%s - Quantité demandée : %d, Quantité approuvée : %d</li>", 
					p.Resource.Name, p.RequestedQuantity, p.Quantity)
			}
			emailBody += `</ul><p><em>La différence de crédit a été restituée sur votre compte.</em></p>`
		}

		// Add cancelled items
		if len(teamInfo.Cancelled) > 0 {
			emailBody += `<h3>❌ Articles refusés :</h3><ul>`
			for _, p := range teamInfo.Cancelled {
				emailBody += fmt.Sprintf("<li>%s - Quantité : %d</li>", p.Resource.Name, p.Quantity)
			}
			emailBody += `</ul><p><em>Vos crédits ont été restitués.</em></p>`
		}

		emailBody += `
				<p>Merci de votre participation au YLab Hackathon 2025 !</p>
			</body>
			</html>
		`

		go emailService.SendEmail(
			teamInfo.Team.Email,
			"Traitement de votre commande - YLab Hackathon",
			emailBody,
		)
	}

	// Count successes and failures
	successCount := 0
	failureCount := 0
	for _, result := range results {
		if result.Success {
			successCount++
		} else {
			failureCount++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message":       "Batch processed",
		"total":         len(results),
		"success_count": successCount,
		"failure_count": failureCount,
		"results":       results,
	})
}
