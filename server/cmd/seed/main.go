package main

import (
	"log"

	"github.com/ericp/ylab-hackathon/utils"
)

func main() {
	// Create admin user
	adminPassword, _ := utils.HashPassword("HackathonM1:)")
	log.Printf("Admin password: %s\n", "HackathonM1:)")
	log.Printf("Admin hashed password: %s\n", adminPassword)

	// Team password prefix
	var teamPasswordPrefix = "HackathonTeam"

	// create new index int var
	var index int = 1
	for i := 0; i < 1; i++ {
		teamName := "Team" + string(rune('A'+i))
		teamPassword, _ := utils.HashPassword(teamPasswordPrefix + string(rune('A'+i)))
		log.Printf("Team: %s, Password: %s, Hashed Password: %s\n", teamName, teamPasswordPrefix+string(rune('A'+i)), teamPassword)
		index++
	}
}
