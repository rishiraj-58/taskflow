import nodemailer from 'nodemailer';

type InvitationEmailProps = {
  email: string;
  workspaceName: string;
  inviterName: string;
  invitationLink: string;
};

type EmailResult = {
  messageId: string;
  testAccount?: boolean;
  previewUrl?: string;
};

// Define transport config type for Gmail
type TransportConfig = {
  host?: string;
  port?: number;
  secure?: boolean;
  service?: string;
  auth: {
    user: string | undefined;
    pass: string | undefined;
  };
  tls?: {
    rejectUnauthorized: boolean;
  };
};

export async function sendInvitationEmail({
  email,
  workspaceName,
  inviterName,
  invitationLink,
}: InvitationEmailProps): Promise<EmailResult> {
  try {
    console.log('Attempting to send invitation email to:', email);
    console.log('Email settings:');
    console.log('- HOST:', process.env.EMAIL_SERVER_HOST);
    console.log('- PORT:', process.env.EMAIL_SERVER_PORT);
    console.log('- USER:', process.env.EMAIL_SERVER_USER);
    console.log('- SECURE:', process.env.EMAIL_SERVER_SECURE);
    
    // Create a test account if no email credentials are provided
    let testAccount;
    let isTestAccount = false;
    
    if (!process.env.EMAIL_SERVER_USER || !process.env.EMAIL_SERVER_PASSWORD) {
      console.log('No email credentials found, creating test account');
      testAccount = await nodemailer.createTestAccount();
      isTestAccount = true;
    }

    const isGmail = process.env.EMAIL_SERVER_HOST?.includes('gmail');
    console.log(`Using email provider: ${isGmail ? 'Gmail' : process.env.EMAIL_SERVER_HOST || 'Ethereal'}`);

    // Gmail specific configuration
    let transportConfig: TransportConfig = {
      host: process.env.EMAIL_SERVER_HOST || 'smtp.ethereal.email',
      port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
      secure: process.env.EMAIL_SERVER_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_SERVER_USER || testAccount?.user,
        pass: process.env.EMAIL_SERVER_PASSWORD || testAccount?.pass,
      },
      tls: {
        // Do not fail on invalid certificates
        rejectUnauthorized: false
      }
    };

    if (isGmail) {
      // Gmail specific settings
      console.log('Using Gmail-specific configuration');
      transportConfig = {
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD, // App password
        },
        tls: {
          rejectUnauthorized: false
        }
      };
      
      console.log('Gmail auth configuration:');
      console.log('- USER:', process.env.EMAIL_SERVER_USER);
      console.log('- PASS:', process.env.EMAIL_SERVER_PASSWORD ? '********' : 'not set');
    }

    const transporter = nodemailer.createTransport(transportConfig);

    try {
      // Verify SMTP connection configuration
      await transporter.verify();
      console.log('SMTP connection verified successfully');
    } catch (error: any) {
      console.error('SMTP verification failed:', error);
      throw new Error(`SMTP verification failed: ${error.message}`);
    }

    const mailOptions = {
      from: `"TaskFlow" <${process.env.EMAIL_FROM || 'noreply@taskflow.app'}>`,
      to: email,
      subject: `You've been invited to join ${workspaceName} on TaskFlow`,
      text: `
        Hi there,
        
        ${inviterName} has invited you to join ${workspaceName} on TaskFlow.
        
        Click the link below to accept the invitation:
        ${invitationLink}
        
        This invitation will expire in 7 days.
        
        Best regards,
        The TaskFlow Team
      `,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>You've been invited to join ${workspaceName}</h2>
          <p>${inviterName} has invited you to collaborate on TaskFlow.</p>
          <div style="margin: 30px 0;">
            <a href="${invitationLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Accept Invitation
            </a>
          </div>
          <p>This invitation will expire in 7 days.</p>
          <hr style="border-top: 1px solid #eaeaea; margin: 20px 0;" />
          <p style="color: #666; font-size: 14px;">The TaskFlow Team</p>
        </div>
      `,
    };

    console.log('Sending email to:', email);
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    
    const result: EmailResult = {
      messageId: info.messageId,
    };
    
    if (isTestAccount) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log('Preview URL: %s', previewUrl);
      result.testAccount = true;
      result.previewUrl = previewUrl as string;
    }
    
    return result;
  } catch (error: any) {
    console.error('Failed to send invitation email:', error);
    throw error;
  }
} 