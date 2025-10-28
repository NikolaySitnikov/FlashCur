import * as sgMail from '@sendgrid/mail'
import { createLogger } from '../lib/logger'
import * as crypto from 'crypto'

const logger = createLogger()

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

interface EmailVerificationData {
    email: string
    name?: string
    verificationUrl: string
}

interface WelcomeEmailData {
    email: string
    name?: string
    tier: string
}

export class EmailService {
    private static instance: EmailService
    private fromEmail: string
    private verificationTemplateId: string
    private welcomeTemplateId: string
    private baseUrl: string

    constructor() {
        this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@volspike.com'
        this.verificationTemplateId = process.env.SENDGRID_VERIFICATION_TEMPLATE_ID || ''
        this.welcomeTemplateId = process.env.SENDGRID_WELCOME_TEMPLATE_ID || ''
        this.baseUrl = process.env.EMAIL_VERIFICATION_URL_BASE || 'http://localhost:3000'
    }

    static getInstance(): EmailService {
        if (!EmailService.instance) {
            EmailService.instance = new EmailService()
        }
        return EmailService.instance
    }

    /**
     * Generate a secure verification token
     */
    generateVerificationToken(): string {
        return crypto.randomBytes(32).toString('hex')
    }

    /**
     * Send email verification email
     */
    async sendVerificationEmail(data: EmailVerificationData): Promise<boolean> {
        try {
            const msg = {
                to: data.email,
                from: {
                    email: this.fromEmail,
                    name: 'VolSpike Team'
                },
                templateId: this.verificationTemplateId,
                dynamicTemplateData: {
                    first_name: data.name || data.email.split('@')[0],
                    verification_url: data.verificationUrl,
                    support_email: 'support@volspike.com',
                    company_name: 'VolSpike'
                },
                // Fallback HTML if template is not available
                html: this.getVerificationEmailHTML(data),
                text: this.getVerificationEmailText(data)
            }

            await sgMail.send(msg)
            logger.info(`Verification email sent to ${data.email}`)
            return true
        } catch (error) {
            logger.error('Failed to send verification email:', error)
            return false
        }
    }

    /**
     * Send welcome email after successful verification
     */
    async sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
        try {
            const msg = {
                to: data.email,
                from: {
                    email: this.fromEmail,
                    name: 'VolSpike Team'
                },
                templateId: this.welcomeTemplateId,
                dynamicTemplateData: {
                    first_name: data.name || data.email.split('@')[0],
                    tier: data.tier,
                    dashboard_url: `${this.baseUrl}/dashboard`,
                    support_email: 'support@volspike.com',
                    company_name: 'VolSpike'
                },
                // Fallback HTML if template is not available
                html: this.getWelcomeEmailHTML(data),
                text: this.getWelcomeEmailText(data)
            }

            await sgMail.send(msg)
            logger.info(`Welcome email sent to ${data.email}`)
            return true
        } catch (error) {
            logger.error('Failed to send welcome email:', error)
            return false
        }
    }

    /**
     * Fallback HTML template for verification email
     */
    private getVerificationEmailHTML(data: EmailVerificationData): string {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email - VolSpike</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #0f172a; color: #e2e8f0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { width: 60px; height: 60px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; }
        .logo-text { color: white; font-weight: bold; font-size: 24px; }
        .content { background: #1e293b; border-radius: 12px; padding: 30px; margin-bottom: 20px; }
        .button { display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        .footer { text-align: center; color: #64748b; font-size: 14px; }
        .highlight { color: #10b981; font-weight: 600; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">
                <div class="logo-text">⚡</div>
            </div>
            <h1>Welcome to VolSpike!</h1>
        </div>
        
        <div class="content">
            <h2>Verify Your Email Address</h2>
            <p>Hi ${data.name || 'there'},</p>
            <p>Thank you for signing up for VolSpike! To complete your registration and start tracking volume spikes on Binance Perpetual Futures, please verify your email address.</p>
            
            <div style="text-align: center;">
                <a href="${data.verificationUrl}" class="button">Verify Email Address</a>
            </div>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #334155; padding: 10px; border-radius: 6px; font-family: monospace;">${data.verificationUrl}</p>
            
            <p><strong>Important:</strong> This verification link will expire in 24 hours for security reasons.</p>
            
            <p>If you didn't create an account with VolSpike, you can safely ignore this email.</p>
        </div>
        
        <div class="footer">
            <p>© 2024 VolSpike. All rights reserved.</p>
            <p>Need help? Contact us at <a href="mailto:support@volspike.com" style="color: #10b981;">support@volspike.com</a></p>
        </div>
    </div>
</body>
</html>
        `
    }

    /**
     * Fallback text template for verification email
     */
    private getVerificationEmailText(data: EmailVerificationData): string {
        return `
Welcome to VolSpike!

Hi ${data.name || 'there'},

Thank you for signing up for VolSpike! To complete your registration and start tracking volume spikes on Binance Perpetual Futures, please verify your email address.

Click this link to verify: ${data.verificationUrl}

This verification link will expire in 24 hours for security reasons.

If you didn't create an account with VolSpike, you can safely ignore this email.

Need help? Contact us at support@volspike.com

© 2024 VolSpike. All rights reserved.
        `
    }

    /**
     * Fallback HTML template for welcome email
     */
    private getWelcomeEmailHTML(data: WelcomeEmailData): string {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to VolSpike!</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #0f172a; color: #e2e8f0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { width: 60px; height: 60px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; }
        .logo-text { color: white; font-weight: bold; font-size: 24px; }
        .content { background: #1e293b; border-radius: 12px; padding: 30px; margin-bottom: 20px; }
        .button { display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        .footer { text-align: center; color: #64748b; font-size: 14px; }
        .highlight { color: #10b981; font-weight: 600; }
        .tier-badge { display: inline-block; background: #334155; color: #10b981; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">
                <div class="logo-text">⚡</div>
            </div>
            <h1>Welcome to VolSpike!</h1>
        </div>
        
        <div class="content">
            <h2>Your Account is Ready</h2>
            <p>Hi ${data.name || 'there'},</p>
            <p>🎉 <strong>Congratulations!</strong> Your email has been verified and your VolSpike account is now active.</p>
            
            <div style="text-align: center; margin: 20px 0;">
                <span class="tier-badge">${data.tier} Tier</span>
            </div>
            
            <p>You can now:</p>
            <ul>
                <li>📊 Track real-time volume spikes on Binance Perpetual Futures</li>
                <li>🔔 Set up custom alerts for your favorite trading pairs</li>
                <li>📈 Monitor market data with our advanced dashboard</li>
                <li>⚡ Get instant notifications when volume spikes occur</li>
            </ul>
            
            <div style="text-align: center;">
                <a href="${this.baseUrl}" class="button">Start Trading</a>
            </div>
            
            <p><strong>Pro Tip:</strong> Upgrade to Pro or Elite tier to unlock advanced features like email alerts, SMS notifications, and faster refresh rates!</p>
        </div>
        
        <div class="footer">
            <p>© 2024 VolSpike. All rights reserved.</p>
            <p>Need help? Contact us at <a href="mailto:support@volspike.com" style="color: #10b981;">support@volspike.com</a></p>
        </div>
    </div>
</body>
</html>
        `
    }

    /**
     * Fallback text template for welcome email
     */
    private getWelcomeEmailText(data: WelcomeEmailData): string {
        return `
Welcome to VolSpike!

Hi ${data.name || 'there'},

🎉 Congratulations! Your email has been verified and your VolSpike account is now active.

Your account tier: ${data.tier.toUpperCase()}

You can now:
- Track real-time volume spikes on Binance Perpetual Futures
- Set up custom alerts for your favorite trading pairs
- Monitor market data with our advanced dashboard
- Get instant notifications when volume spikes occur

Start trading: ${this.baseUrl}

Pro Tip: Upgrade to Pro or Elite tier to unlock advanced features like email alerts, SMS notifications, and faster refresh rates!

Need help? Contact us at support@volspike.com

© 2024 VolSpike. All rights reserved.
        `
    }
}

export default EmailService
