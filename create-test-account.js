const nodemailer = require("nodemailer");

async function createAccount() {
  try {
    const account = await nodemailer.createTestAccount();
    
    console.log("Ethereal account created successfully!");
    console.log("SMTP Host:", account.smtp.host);
    console.log("SMTP Port:", account.smtp.port);
    console.log("User:", account.user);
    console.log("Password:", account.pass);
    
    console.log("\nAdd these to your .env file:");
    console.log(`EMAIL_SERVER_HOST=${account.smtp.host}`);
    console.log(`EMAIL_SERVER_PORT=${account.smtp.port}`);
    console.log(`EMAIL_SERVER_USER=${account.user}`);
    console.log(`EMAIL_SERVER_PASSWORD=${account.pass}`);
  } catch (err) {
    console.error("Failed to create a testing account. " + err.message);
    process.exit(1);
  }
}

createAccount(); 