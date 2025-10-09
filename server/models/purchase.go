package models

import (
	"time"

	"gorm.io/gorm"
)

type PurchaseStatus string

const (
	StatusPending   PurchaseStatus = "en attente"
	StatusConfirmed PurchaseStatus = "confirmé"
	StatusCancelled PurchaseStatus = "annulé"
)

type Purchase struct {
	ID                uint           `gorm:"primaryKey" json:"id"`
	BatchID           *string        `gorm:"index" json:"batch_id,omitempty"` // Groups multiple items purchased together
	TeamID            uint           `gorm:"not null;index" json:"team_id"`
	ResourceID        uint           `gorm:"not null;index" json:"resource_id"`
	Quantity          int            `gorm:"not null" json:"quantity"`
	RequestedQuantity int            `gorm:"not null" json:"requested_quantity"` // Original quantity requested
	Comment           string         `gorm:"type:text" json:"comment"`           // Required comment explaining why the purchase is needed
	PurchaseDate      time.Time      `json:"purchase_date"`
	IsReturned        bool           `gorm:"default:false" json:"is_returned"`     // Marks if item was physically returned (no refund)
	NeedsReturn       bool           `gorm:"default:false" json:"needs_return"`    // Marks if item needs to be returned
	Status            PurchaseStatus `gorm:"default:'en attente'" json:"status"`
	CreatedAt         time.Time      `json:"created_at"`
	UpdatedAt         time.Time      `json:"updated_at"`
	DeletedAt         gorm.DeletedAt `gorm:"index" json:"-"`
	Team              Team           `gorm:"foreignKey:TeamID" json:"team,omitempty"`
	Resource          Resource       `gorm:"foreignKey:ResourceID" json:"resource,omitempty"`
}

type PurchaseRequest struct {
	ResourceID uint `json:"resource_id" binding:"required"`
	Quantity   int  `json:"quantity" binding:"required,min=1"`
}

type PurchaseItem struct {
	ResourceID uint `json:"resource_id" binding:"required"`
	Quantity   int  `json:"quantity" binding:"required,min=1"`
}

type BatchPurchaseRequest struct {
	Items   []PurchaseItem `json:"items" binding:"required,min=1,dive"`
	Comment string         `json:"comment" binding:"required,min=10"` // Required comment explaining why the purchase is needed (min 10 chars)
}

type PurchaseActionRequest struct {
	Action string `json:"action" binding:"required,oneof=confirm cancel"`
}

// BatchPurchaseActionRequest allows partial approval with quantity adjustments
type BatchPurchaseActionRequest struct {
	Items []PurchaseItemAction `json:"items" binding:"required,min=1,dive"`
}

type PurchaseItemAction struct {
	PurchaseID       uint   `json:"purchase_id" binding:"required"`
	Action           string `json:"action" binding:"required,oneof=confirm cancel"`
	ApprovedQuantity *int   `json:"approved_quantity,omitempty"` // If provided, overrides requested quantity (for partial approval)
}
