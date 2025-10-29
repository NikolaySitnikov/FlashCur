import * as sgMail from '@sendgrid/mail'
import { createLogger } from '../lib/logger'
import * as crypto from 'crypto'

const logger = createLogger()

// Initialize SendGrid with CJS/ESM interop and safety for missing keys
const mail: any = (sgMail as any)?.default ?? (sgMail as any)
try {
    if (process.env.SENDGRID_API_KEY) {
        if (typeof mail.setApiKey === 'function') {
            mail.setApiKey(process.env.SENDGRID_API_KEY)
        }
    }
} catch (err) {
    // Don't crash on startup if SendGrid init fails; log only
    createLogger().warn('SendGrid initialization warning:', err)
}

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
            // Check if SendGrid is configured
            if (!process.env.SENDGRID_API_KEY) {
                logger.error('SENDGRID_API_KEY is not set in environment variables')
                return false
            }

            if (!this.fromEmail || this.fromEmail === 'noreply@volspike.com' && !process.env.SENDGRID_FROM_EMAIL) {
                logger.warn(`SendGrid from email may not be verified: ${this.fromEmail}`)
            }

            const msg: any = {
                to: data.email,
                from: {
                    email: this.fromEmail,
                    name: 'VolSpike Team'
                },
                // Fallback HTML/text are always included
                html: this.getVerificationEmailHTML(data),
                text: this.getVerificationEmailText(data),
                subject: 'Verify Your Email - VolSpike'
            }

            // Only include templateId if it's configured
            if (this.verificationTemplateId) {
                msg.templateId = this.verificationTemplateId
                msg.dynamicTemplateData = {
                    first_name: data.name || data.email.split('@')[0],
                    verification_url: data.verificationUrl,
                    support_email: 'support@volspike.com',
                    company_name: 'VolSpike'
                }
            }

            logger.info(`Attempting to send verification email to ${data.email} from ${this.fromEmail}`)
            
            const response = await mail.send(msg)
            
            // Log SendGrid response for debugging
            logger.info(`SendGrid response for ${data.email}:`, {
                statusCode: response[0]?.statusCode,
                headers: response[0]?.headers,
                body: response[0]?.body
            })

            logger.info(`✅ Verification email sent successfully to ${data.email}`)
            return true
        } catch (error: any) {
            // Detailed error logging
            logger.error('❌ Failed to send verification email:', {
                email: data.email,
                fromEmail: this.fromEmail,
                error: error?.message || error,
                response: error?.response?.body || error?.response,
                code: error?.code,
                stack: error?.stack
            })

            // Check for specific SendGrid errors
            if (error?.response?.body) {
                const sendgridError = error.response.body
                logger.error('SendGrid API Error Details:', {
                    errors: sendgridError.errors,
                    message: sendgridError.message
                })
            }

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

            await mail.send(msg)
            logger.info(`Welcome email sent to ${data.email}`)
            return true
        } catch (error) {
            logger.error('Failed to send welcome email:', error)
            return false
        }
    }

    /**
     * Fallback HTML template for verification email
     * Optimized for deliverability, responsiveness, and compatibility across all email clients
     */
    private getVerificationEmailHTML(data: EmailVerificationData): string {
        // Escape HTML to prevent XSS
        const safeName = (data.name || 'there').replace(/[<>]/g, '')
        const safeUrl = data.verificationUrl.replace(/"/g, '&quot;')
        
        return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>Verify Your Email - VolSpike</title>
    <!--[if mso]>
    <style type="text/css">
        table {border-collapse:collapse;border-spacing:0;margin:0;}
        div, td {padding:0;}
        div {margin:0 !important;}
    </style>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style>
        /* Reset styles */
        body, table, td, p, a, li, blockquote {-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;}
        table, td {mso-table-lspace: 0pt; mso-table-rspace: 0pt;}
        img {-ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none;}
        
        /* Mobile styles */
        @media only screen and (max-width: 600px) {
            .email-container { width: 100% !important; margin: 0 !important; }
            .email-body { padding: 20px !important; }
            .button { padding: 14px 28px !important; font-size: 16px !important; }
            .logo-container { margin-bottom: 20px !important; }
        }
        
        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
            .email-body { background-color: #1e293b !important; }
            .text-primary { color: #e2e8f0 !important; }
            .text-secondary { color: #94a3b8 !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f1f5f9; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
    <!-- Outer table for email clients -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <!-- Main container -->
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" class="email-container" style="max-width: 600px; width: 100%; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td align="center" style="padding: 40px 40px 20px 40px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 12px 12px 0 0;">
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center" class="logo-container">
                                        <div style="width: 80px; height: 80px; background-color: rgba(255, 255, 255, 0.2); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; backdrop-filter: blur(10px);">
                                            <span style="font-size: 40px; color: #ffffff;">⚡</span>
                                        </div>
                                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; line-height: 1.2;">Welcome to VolSpike!</h1>
                                        <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px; line-height: 1.5;">Professional Crypto Market Analysis</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td class="email-body" style="padding: 40px; background-color: #ffffff;">
                            <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 24px; font-weight: 600; line-height: 1.3;">Verify Your Email Address</h2>
                            <p style="margin: 0 0 16px 0; color: #475569; font-size: 16px; line-height: 1.6;">Hi ${safeName},</p>
                            <p style="margin: 0 0 24px 0; color: #475569; font-size: 16px; line-height: 1.6;">Thank you for signing up for VolSpike! To complete your registration and start tracking volume spikes on Binance Perpetual Futures, please verify your email address by clicking the button below.</p>
                            
                            <!-- CTA Button -->
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 32px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="${safeUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; line-height: 1.5; text-align: center; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); -webkit-text-size-adjust: none; mso-hide: all;">Verify Email Address</a>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Fallback link -->
                            <p style="margin: 24px 0 16px 0; color: #64748b; font-size: 14px; line-height: 1.5;">If the button doesn't work, copy and paste this link into your browser:</p>
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 24px 0;">
                                <tr>
                                    <td style="background-color: #f1f5f9; border-radius: 6px; padding: 12px; word-break: break-all;">
                                        <p style="margin: 0; color: #475569; font-size: 12px; font-family: 'Courier New', Courier, monospace; line-height: 1.6;">${data.verificationUrl}</p>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Security notice -->
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                                <tr>
                                    <td style="padding: 16px;">
                                        <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;"><strong>⏰ Important:</strong> This verification link will expire in <strong>24 hours</strong> for security reasons. If you didn't request this email, you can safely ignore it.</p>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 24px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">If you didn't create an account with VolSpike, you can safely ignore this email.</p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td align="center" style="padding: 32px 40px; background-color: #f8fafc; border-radius: 0 0 12px 12px; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px; line-height: 1.5;">© ${new Date().getFullYear()} VolSpike. All rights reserved.</p>
                            <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.5;">
                                Need help? Contact us at 
                                <a href="mailto:support@volspike.com" style="color: #10b981; text-decoration: none; font-weight: 500;">support@volspike.com</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
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
