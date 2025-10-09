package models

import (
	"time"

	"gorm.io/gorm"
)

type TeamComposition struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Name      string         `gorm:"unique;not null" json:"name"`
	// Total slots per department (fixed capacity)
	DevTotal    int `gorm:"default:0;not null" json:"dev_total"`
	InfraTotal  int `gorm:"default:0;not null" json:"infra_total"`
	DataTotal   int `gorm:"default:0;not null" json:"data_total"`
	IoTTotal    int `gorm:"default:0;not null" json:"iot_total"`
	SysembTotal int `gorm:"default:0;not null" json:"sysemb_total"`
	// Filled slots per department (variable)
	DevFilled    int `gorm:"default:0;not null" json:"dev_filled"`
	InfraFilled  int `gorm:"default:0;not null" json:"infra_filled"`
	DataFilled   int `gorm:"default:0;not null" json:"data_filled"`
	IoTFilled    int `gorm:"default:0;not null" json:"iot_filled"`
	SysembFilled int `gorm:"default:0;not null" json:"sysemb_filled"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

type ToggleSlotRequest struct {
	Department string `json:"department" binding:"required,oneof=dev infra data iot sysemb"`
	Action     string `json:"action" binding:"required,oneof=fill empty"`
}
