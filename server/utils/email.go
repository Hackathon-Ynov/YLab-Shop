package utils

import (
	"fmt"
	"log"
	"net/smtp"
	"strings"
)

type EmailService struct {
	SMTPHost string
	SMTPPort string
	SMTPUser string
	SMTPPass string
	From     string
}
func IsValidEmail(email string) bool {
	// Basic check for presence of "@" and "."
	if strings.Count(email, "@") != 1 {
		return false
	}
	parts := strings.Split(email, "@")
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return false
	}
	if !strings.Contains(parts[1], ".") {
		return false
	}

	// If the email is way too long, reject it
	if len(email) > 254 {
		return false
	}

	return true
}

func NewEmailService(host, port, user, pass, from string) *EmailService {
	return &EmailService{
		SMTPHost: host,
		SMTPPort: port,
		SMTPUser: user,
		SMTPPass: pass,
		From:     from,
	}
}

func (e *EmailService) SendEmail(to, subject, body string) error {
	// Check if SMTP credentials are set
	if e.SMTPUser == "" || e.SMTPPass == "" {
		// Email not configured, skip sending
		return nil
	}

	auth := smtp.PlainAuth("", e.SMTPUser, e.SMTPPass, e.SMTPHost)

	msg := []byte(fmt.Sprintf("From: %s\r\n"+
		"To: %s\r\n"+
		"Subject: %s\r\n"+
		"Content-Type: text/html; charset=UTF-8\r\n"+
		"\r\n"+
		"%s\r\n", e.From, to, subject, body))

	addr := fmt.Sprintf("%s:%s", e.SMTPHost, e.SMTPPort)
	err := smtp.SendMail(addr, auth, e.From, []string{to}, msg)
	return err
}

func (e *EmailService) SendPurchaseConfirmation(to, teamName, resourceName string, quantity int) error {
	subject := "Achat confirmé - YLab Hackathon"

	log.Printf("Sending purchase confirmation email to %s for team %s\n", to, teamName)

	body := fmt.Sprintf(`
		<html>
		<body>
			<h2>Achat confirmé</h2>
			<p>Bonjour %s,</p>
			<p>Votre achat a été confirmé avec succès :</p>
			<ul>
				<li>Ressource: %s</li>
				<li>Quantité: %d</li>
			</ul>
			<p>Merci de votre participation au YLab Hackathon 2025 !</p>
		</body>
		</html>
	`, teamName, resourceName, quantity)

	return e.SendEmail(to, subject, body)
}

func (e *EmailService) SendPurchaseRejection(to, teamName, resourceName string, quantity int) error {
	subject := "Achat refusé - YLab Hackathon"
	body := fmt.Sprintf(`
		<html>
		<body>
			<h2>Achat refusé</h2>
			<p>Bonjour %s,</p>
			<p>Votre demande d'achat a été refusée :</p>
			<ul>
				<li>Ressource: %s</li>
				<li>Quantité: %d</li>
			</ul>
			<p>Vos crédits ont été restitués.</p>
			<p>Pour plus d'informations, veuillez contacter l'organisation.</p>
		</body>
		</html>
	`, teamName, resourceName, quantity)

	return e.SendEmail(to, subject, body)
}

func (e *EmailService) SendLowCreditAlert(to, teamName string, credit int) error {
	subject := "Alerte crédit faible - YLab Hackathon"
	body := fmt.Sprintf(`
		<html>
		<body>
			<h2>Alerte crédit faible</h2>
			<p>Bonjour %s,</p>
			<p>Votre crédit est maintenant de %d points.</p>
			<p>Pensez à gérer vos ressources avec précaution !</p>
		</body>
		</html>
	`, teamName, credit)

	return e.SendEmail(to, subject, body)
}

func NormalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}
