import * as brevo from '@getbrevo/brevo';

// Initialize Brevo API client
const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY || '');

export interface EmailOptions {
  to: string | string[];
  subject: string;
  htmlContent?: string;
  textContent?: string;
  templateId?: number;
  templateParams?: Record<string, any>;
  from?: {
    email: string;
    name?: string;
  };
  replyTo?: {
    email: string;
    name?: string;
  };
  attachments?: Array<{
    content: string; // base64 encoded content
    name: string;
    type?: string;
  }>;
}

export interface BrevoResponse {
  messageId: string;
  success: boolean;
  error?: string;
}

/**
 * Send a transactional email using Brevo
 */
export async function sendEmail(options: EmailOptions): Promise<BrevoResponse> {
  try {
    // Validate required fields
    if (!options.to || (!options.htmlContent && !options.textContent && !options.templateId)) {
      throw new Error('Missing required fields: to, and either htmlContent, textContent, or templateId');
    }

    // Prepare recipients
    const recipients = Array.isArray(options.to) 
      ? options.to.map(email => ({ email: email.trim() }))
      : [{ email: options.to.trim() }];

    // Prepare sender
    const sender = options.from || {
      email: process.env.BREVO_FROM_EMAIL || 'noreply@helixque.com',
      name: process.env.BREVO_FROM_NAME || 'Helixque'
    };

    // Prepare email data
    const emailData: brevo.SendSmtpEmail = {
      sender,
      to: recipients,
      subject: options.subject,
      htmlContent: options.htmlContent,
      textContent: options.textContent,
      templateId: options.templateId,
      params: options.templateParams,
      replyTo: options.replyTo,
      attachment: options.attachments,
    };

    // Send email
    const response = await apiInstance.sendTransacEmail(emailData);
    
    return {
      messageId: response.messageId || 'unknown',
      success: true
    };

  } catch (error: any) {
    console.error('Brevo email error:', error);
    return {
      messageId: '',
      success: false,
      error: error.message || 'Unknown error occurred'
    };
  }
}

/**
 * Send a welcome email to new users
 */
export async function sendWelcomeEmail(
  userEmail: string, 
  userName: string
): Promise<BrevoResponse> {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Welcome to Helixque</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #4F46E5;">Welcome to Helixque!</h1>
        <p>Hi ${userName},</p>
        <p>Welcome to Helixque - the professional real-time video chat platform that connects you with like-minded professionals!</p>
        <p>You can now:</p>
        <ul>
          <li>Connect with professionals from various fields</li>
          <li>Engage in high-quality video conversations</li>
          <li>Network and build meaningful connections</li>
          <li>Skip unlimited times to find the perfect match</li>
        </ul>
        <p>Ready to start networking? <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" style="color: #4F46E5;">Get started now</a></p>
        <p>Best regards,<br>The Helixque Team</p>
      </div>
    </body>
    </html>
  `;

  const textContent = `
    Welcome to Helixque!
    
    Hi ${userName},
    
    Welcome to Helixque - the professional real-time video chat platform that connects you with like-minded professionals!
    
    You can now:
    - Connect with professionals from various fields
    - Engage in high-quality video conversations
    - Network and build meaningful connections
    - Skip unlimited times to find the perfect match
    
    Ready to start networking? Visit: ${process.env.FRONTEND_URL || 'http://localhost:3000'}
    
    Best regards,
    The Helixque Team
  `;

  return sendEmail({
    to: userEmail,
    subject: 'Welcome to Helixque - Start Networking Today!',
    htmlContent,
    textContent
  });
}

/**
 * Send a password reset email
 */
export async function sendPasswordResetEmail(
  userEmail: string,
  resetToken: string,
  userName?: string
): Promise<BrevoResponse> {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Reset Your Password - Helixque</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #4F46E5;">Reset Your Password</h1>
        <p>Hi ${userName || 'there'},</p>
        <p>We received a request to reset your password for your Helixque account.</p>
        <p>Click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
        </div>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        <p><strong>This link will expire in 1 hour for security reasons.</strong></p>
        <p>If you didn't request this password reset, please ignore this email.</p>
        <p>Best regards,<br>The Helixque Team</p>
      </div>
    </body>
    </html>
  `;

  const textContent = `
    Reset Your Password - Helixque
    
    Hi ${userName || 'there'},
    
    We received a request to reset your password for your Helixque account.
    
    Click the link below to reset your password:
    ${resetUrl}
    
    This link will expire in 1 hour for security reasons.
    
    If you didn't request this password reset, please ignore this email.
    
    Best regards,
    The Helixque Team
  `;

  return sendEmail({
    to: userEmail,
    subject: 'Reset Your Helixque Password',
    htmlContent,
    textContent
  });
}

/**
 * Send a notification email
 */
export async function sendNotificationEmail(
  userEmail: string,
  subject: string,
  message: string,
  userName?: string
): Promise<BrevoResponse> {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${subject}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #4F46E5;">${subject}</h1>
        <p>Hi ${userName || 'there'},</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
          ${message}
        </div>
        <p>Best regards,<br>The Helixque Team</p>
      </div>
    </body>
    </html>
  `;

  const textContent = `
    ${subject}
    
    Hi ${userName || 'there'},
    
    ${message}
    
    Best regards,
    The Helixque Team
  `;

  return sendEmail({
    to: userEmail,
    subject,
    htmlContent,
    textContent
  });
}

/**
 * Send a template-based email using Brevo templates
 */
export async function sendTemplateEmail(
  userEmail: string,
  templateId: number,
  templateParams: Record<string, any> = {}
): Promise<BrevoResponse> {
  return sendEmail({
    to: userEmail,
    subject: templateParams.subject || 'Notification from Helixque',
    templateId,
    templateParams
  });
}

/**
 * Verify Brevo API connection
 */
export async function verifyBrevoConnection(): Promise<boolean> {
  try {
    // Try to get account information to verify the API key
    const accountApi = new brevo.AccountApi();
    accountApi.setApiKey(brevo.AccountApiApiKeys.apiKey, process.env.BREVO_API_KEY || '');
    
    await accountApi.getAccount();
    return true;
  } catch (error) {
    console.error('Brevo API verification failed:', error);
    return false;
  }
}
