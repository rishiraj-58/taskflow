// Read .env file manually
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// Load environment variables from .env file
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = envContent.split('\n').reduce((acc, line) => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let value = match[2].trim();
    // Remove quotes if present
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    acc[key] = value;
  }
  return acc;
}, {});

async function testEmail() {
  console.log('Testing email configuration...');
  console.log('Email settings:');
  console.log('- HOST:', envVars.EMAIL_SERVER_HOST);
  console.log('- PORT:', envVars.EMAIL_SERVER_PORT);
  console.log('- USER:', envVars.EMAIL_SERVER_USER);
  console.log('- SECURE:', envVars.EMAIL_SERVER_SECURE);
  
  try {
    // For Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: envVars.EMAIL_SERVER_USER,
        pass: envVars.EMAIL_SERVER_PASSWORD // App password
      }
    });
    
    console.log('Verifying connection...');
    await transporter.verify();
    console.log('SMTP connection verified successfully!');
    
    console.log('Sending test email...');
    const info = await transporter.sendMail({
      from: `"TaskFlow Test" <${envVars.EMAIL_FROM}>`,
      to: envVars.EMAIL_SERVER_USER, // Send to yourself
      subject: 'TaskFlow Email Test',
      text: 'This is a test email from TaskFlow to verify that the email configuration is working correctly.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>TaskFlow Email Test</h2>
          <p>This is a test email from TaskFlow to verify that the email configuration is working correctly.</p>
          <p>If you're receiving this, your email setup is working!</p>
          <hr style="border-top: 1px solid #eaeaea; margin: 20px 0;" />
          <p style="color: #666; font-size: 14px;">The TaskFlow Team</p>
        </div>
      `,
    });
    
    console.log('Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    
  } catch (error) {
    console.error('Email test failed:');
    console.error(error);
    
    // Show common error solutions
    if (error.code === 'EAUTH') {
      console.log('\nAuthentication Error Tips:');
      console.log('1. Make sure you\'re using an App Password, not your regular Gmail password');
      console.log('2. Verify the App Password was generated correctly in your Google Account');
      console.log('3. Check that 2-factor authentication is enabled on your Google account');
      console.log('4. Confirm there are no spaces or extra characters in your app password');
    } else if (error.code === 'ESOCKET') {
      console.log('\nConnection Error Tips:');
      console.log('1. Check if your network or firewall is blocking SMTP connections');
      console.log('2. Verify the host and port are correct');
    }
  }
}

testEmail(); 