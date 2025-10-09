package models

import (
	"time"

	"gorm.io/gorm"
)

type Vote struct {
	ID            uint           `gorm:"primaryKey" json:"id"`
	TeamID        uint           `gorm:"not null;index" json:"team_id"`
	PollID        uint           `gorm:"not null;index" json:"poll_id"`
	ChosenOption  string         `gorm:"not null" json:"chosen_option"`
	CreditStaked  int            `gorm:"not null" json:"credit_staked"`
	VoteDate      time.Time      `json:"vote_date"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
	Team          Team           `gorm:"foreignKey:TeamID" json:"team,omitempty"`
	Poll          Poll           `gorm:"foreignKey:PollID" json:"poll,omitempty"`
}

type VoteRequest struct {
	PollID       uint   `json:"poll_id" binding:"required"`
	ChosenOption string `json:"chosen_option" binding:"required"`
	CreditStaked int    `json:"credit_staked" binding:"required,min=1"`
}
