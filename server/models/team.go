package models

import (
	"time"

	"gorm.io/gorm"
)

type Team struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	Name         string         `gorm:"unique;not null" json:"name"`
	Email        string         `gorm:"unique;not null" json:"email"`
	PasswordHash string         `gorm:"not null" json:"-"`
	Credit       int            `gorm:"default:1000;not null" json:"credit"`
	LastActivity time.Time      `json:"last_activity"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
	Purchases    []Purchase     `gorm:"foreignKey:TeamID" json:"purchases,omitempty"`
	Votes        []Vote         `gorm:"foreignKey:TeamID" json:"votes,omitempty"`
}

type TeamLoginRequest struct {
	Name     string `json:"name" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type TeamResponse struct {
	ID           uint      `json:"id"`
	Name         string    `json:"name"`
	Email        string    `json:"email"`
	Credit       int       `json:"credit"`
	LastActivity time.Time `json:"last_activity"`
}

type UpdateTeamProfileRequest struct {
	Email string `json:"email" binding:"required,email"`
}

func (t *Team) ToResponse() TeamResponse {
	return TeamResponse{
		ID:           t.ID,
		Name:         t.Name,
		Email:        t.Email,
		Credit:       t.Credit,
		LastActivity: t.LastActivity,
	}
}
