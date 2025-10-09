package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"

	"gorm.io/gorm"
)

type PollStatus string

const (
	PollStatusOpen   PollStatus = "ouvert"
	PollStatusClosed PollStatus = "fermé"
)

// StringArray is a custom type for string arrays in PostgreSQL
type StringArray []string

// Scan implements the sql.Scanner interface
func (s *StringArray) Scan(value interface{}) error {
	if value == nil {
		*s = []string{}
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("failed to scan StringArray")
	}

	return json.Unmarshal(bytes, s)
}

// Value implements the driver.Valuer interface
func (s StringArray) Value() (driver.Value, error) {
	if len(s) == 0 {
		return json.Marshal([]string{})
	}
	return json.Marshal(s)
}

type Poll struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Question  string         `gorm:"not null" json:"question"`
	Options   StringArray    `gorm:"type:jsonb" json:"options"`
	StartDate time.Time      `json:"start_date"`
	EndDate   time.Time      `json:"end_date"`
	Status    PollStatus     `gorm:"default:'ouvert'" json:"status"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
	Votes     []Vote         `gorm:"foreignKey:PollID" json:"votes,omitempty"`
}
