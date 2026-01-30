import nodemailer from 'nodemailer';

// Email configuration - using environment variables for production
const EMAIL_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
};

const APP_URL = process.env.APP_URL || 'http://localhost:5174';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@podcastdirectory.com';

// Create reusable transporter
let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    // Only create transporter if SMTP credentials are provided
    if (EMAIL_CONFIG.auth.user && EMAIL_CONFIG.auth.pass) {
      transporter = nodemailer.createTransport(EMAIL_CONFIG);
    } else {
      console.warn('SMTP credentials not configured. Email functionality disabled.');
      console.warn('Set SMTP_USER and SMTP_PASS environment variables to enable emails.');
    }
  }
  return transporter;
}

export async function sendPasswordResetEmail(email: string, resetToken: string, username: string): Promise<boolean> {
  const transport = getTransporter();
  
  if (!transport) {
    console.error('Email service not configured. Cannot send password reset email.');
    // In development, log the reset link to console
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n========================================');
      console.log('PASSWORD RESET LINK (Development Mode):');
      console.log(`${APP_URL}/reset-password/${resetToken}`);
      console.log('========================================\n');
    }
    return false;
  }

  const resetLink = `${APP_URL}/reset-password/${resetToken}`;

  const mailOptions = {
    from: `Podcast Directory <${FROM_EMAIL}>`,
    to: email,
    subject: 'Password Reset Request',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .button {
            display: inline-block;
            padding: 12px 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white !important;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            color: #666;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎙️ Password Reset</h1>
          </div>
          <div class="content">
            <p>Hi ${username},</p>
            <p>We received a request to reset your password for your Podcast Directory account.</p>
            <p>Click the button below to reset your password:</p>
            <p style="text-align: center;">
              <a href="${resetLink}" class="button">Reset Password</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #667eea;">${resetLink}</p>
            <p><strong>This link will expire in 1 hour.</strong></p>
            <p>If you didn't request a password reset, you can safely ignore this email.</p>
            <p>Best regards,<br>The Podcast Directory Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Hi ${username},

      We received a request to reset your password for your Podcast Directory account.

      Click the link below to reset your password:
      ${resetLink}

      This link will expire in 1 hour.

      If you didn't request a password reset, you can safely ignore this email.

      Best regards,
      The Podcast Directory Team
    `,
  };

  try {
    await transport.sendMail(mailOptions);
    console.log(`Password reset email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    // In development, still log the link even if email fails
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n========================================');
      console.log('EMAIL SEND FAILED - Password Reset Link:');
      console.log(`${APP_URL}/reset-password/${resetToken}`);
      console.log('========================================\n');
    }
    return false;
  }
}

// Verify email configuration on startup
export function verifyEmailConfig() {
  const transport = getTransporter();
  if (transport) {
    transport.verify((error, success) => {
      if (error) {
        console.error('Email configuration error:', error);
      } else {
        console.log('✓ Email service ready');
      }
    });
  }
}
