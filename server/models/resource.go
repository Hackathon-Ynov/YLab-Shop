package models

import (
	"time"

	"gorm.io/gorm"
)

type Resource struct {
	ID              uint           `gorm:"primaryKey" json:"id"`
	Name            string         `gorm:"not null" json:"name"`
	Description     string         `json:"description"`
	Cost            int            `gorm:"not null" json:"cost"`
	Quantity        int            `gorm:"not null" json:"quantity"`
	MaxPerTeam      int            `gorm:"not null" json:"max_per_team"`
	Type            string         `gorm:"not null" json:"type"` // "service", "matériel", "avantage"
	ImageURL        string         `json:"image_url"`
	IsActive        bool           `gorm:"default:true" json:"is_active"`
	IsNonReturnable bool           `gorm:"default:false" json:"is_non_returnable"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
	Purchases       []Purchase     `gorm:"foreignKey:ResourceID" json:"purchases,omitempty"`
}
