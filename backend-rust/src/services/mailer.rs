use crate::config::AppConfig;
use anyhow::Result;
use lettre::{
    message::{header::ContentType, Mailbox, MultiPart, SinglePart},
    transport::smtp::authentication::Credentials,
    AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor,
};

pub struct Mailer {
    transport: Option<AsyncSmtpTransport<Tokio1Executor>>,
    from: String,
    reply_to: Option<String>,
}

impl Mailer {
    pub fn new(config: &AppConfig) -> Self {
        let smtp_host = match &config.smtp_host {
            Some(h) if !h.is_empty() => h.clone(),
            _ => {
                tracing::warn!("SMTP_HOST not set — mailer disabled");
                return Mailer {
                    transport: None,
                    from: config
                        .email_from
                        .clone()
                        .unwrap_or_else(|| "noreply@localhost".to_string()),
                    reply_to: config.email_reply_to.clone(),
                };
            }
        };

        let smtp_port = config.smtp_port.unwrap_or(if config.smtp_secure { 465 } else { 587 });

        let transport = if let (Some(user), Some(pass)) =
            (&config.smtp_user, &config.smtp_password)
        {
            let creds = Credentials::new(user.clone(), pass.clone());
            if config.smtp_secure {
                AsyncSmtpTransport::<Tokio1Executor>::relay(&smtp_host)
                    .ok()
                    .map(|b| b.credentials(creds).port(smtp_port).build())
            } else {
                AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(&smtp_host)
                    .ok()
                    .map(|b| b.credentials(creds).port(smtp_port).build())
            }
        } else {
            None
        };

        if transport.is_none() {
            tracing::warn!("SMTP credentials not configured — mailer disabled");
        }

        Mailer {
            transport,
            from: config
                .email_from
                .clone()
                .unwrap_or_else(|| "noreply@localhost".to_string()),
            reply_to: config.email_reply_to.clone(),
        }
    }

    /// Returns `true` when SMTP is configured and the mailer can send emails.
    pub fn is_enabled(&self) -> bool {
        self.transport.is_some()
    }

    pub async fn send_verification_email(&self, to: &str, token: &str, app_url: &str) -> Result<()> {
        let transport = match &self.transport {
            Some(t) => t,
            None => {
                tracing::warn!(to, "Mailer disabled — skipping verification email");
                return Ok(());
            }
        };

        let verify_link = format!("{}/verify-email?token={}", app_url.trim_end_matches('/'), token);

        let html_body = format!(
            r#"<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
  <h2 style="margin: 0 0 12px;">Vérifiez votre adresse e-mail</h2>
  <p style="margin: 0 0 12px;">Merci pour votre inscription. Veuillez vérifier votre adresse e-mail pour activer votre compte.</p>
  <p style="margin: 16px 0;">
    <a href="{link}" style="display: inline-block; padding: 12px 18px; background: #14b8a6; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">
      Vérifier mon e-mail
    </a>
  </p>
  <p style="margin: 0 0 12px;">Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :</p>
  <p style="margin: 0; word-break: break-all; color: #0f766e;">{link}</p>
  <p style="margin: 16px 0 0; color: #64748b; font-size: 12px;">
    Ce lien expire dans 24 heures. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.
  </p>
</div>"#,
            link = verify_link,
        );

        let text_body = format!(
            "Cliquez ici pour vérifier votre adresse e-mail : {}",
            verify_link
        );

        self.send(to, "Vérifiez votre adresse e-mail", &text_body, &html_body, transport)
            .await
    }

    pub async fn send_reset_email(&self, to: &str, token: &str, app_url: &str) -> Result<()> {
        let transport = match &self.transport {
            Some(t) => t,
            None => {
                tracing::warn!(to, "Mailer disabled — skipping reset email");
                return Ok(());
            }
        };

        let reset_link = format!("{}/reset-password?token={}", app_url.trim_end_matches('/'), token);

        let html_body = format!(
            r#"<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
  <h2 style="margin: 0 0 12px;">Réinitialisation du mot de passe</h2>
  <p style="margin: 0 0 12px;">Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour continuer :</p>
  <p style="margin: 16px 0;">
    <a href="{link}" style="display: inline-block; padding: 12px 18px; background: #14b8a6; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">
      Réinitialiser le mot de passe
    </a>
  </p>
  <p style="margin: 0 0 12px;">Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :</p>
  <p style="margin: 0; word-break: break-all; color: #0f766e;">{link}</p>
  <p style="margin: 16px 0 0; color: #64748b; font-size: 12px;">
    Ce lien expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.
  </p>
</div>"#,
            link = reset_link,
        );

        let text_body = format!(
            "Cliquez ici pour réinitialiser votre mot de passe : {}",
            reset_link
        );

        self.send(to, "Réinitialisation du mot de passe", &text_body, &html_body, transport)
            .await
    }

    async fn send(
        &self,
        to: &str,
        subject: &str,
        text: &str,
        html: &str,
        transport: &AsyncSmtpTransport<Tokio1Executor>,
    ) -> Result<()> {
        let from_mailbox: Mailbox = self
            .from
            .parse()
            .map_err(|e: lettre::address::AddressError| anyhow::anyhow!("Invalid from address: {}", e))?;

        let to_mailbox: Mailbox = to
            .parse()
            .map_err(|e: lettre::address::AddressError| anyhow::anyhow!("Invalid to address: {}", e))?;

        let mut builder = Message::builder()
            .from(from_mailbox)
            .to(to_mailbox)
            .subject(subject);

        if let Some(ref reply_to) = self.reply_to {
            if let Ok(rt) = reply_to.parse::<Mailbox>() {
                builder = builder.reply_to(rt);
            }
        }

        let email = builder.multipart(
            MultiPart::alternative()
                .singlepart(
                    SinglePart::builder()
                        .header(ContentType::TEXT_PLAIN)
                        .body(text.to_string()),
                )
                .singlepart(
                    SinglePart::builder()
                        .header(ContentType::TEXT_HTML)
                        .body(html.to_string()),
                ),
        )?;

        transport.send(email).await?;
        Ok(())
    }
}
