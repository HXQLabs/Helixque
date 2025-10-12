/**
 * Example usage of Brevo mailer utilities
 * This file demonstrates how to use the various email functions
 */

import { 
  sendEmail, 
  sendWelcomeEmail, 
  sendPasswordResetEmail, 
  sendNotificationEmail,
  sendTemplateEmail,
  verifyBrevoConnection 
} from './brevo';

// Example: Send a welcome email
export async function exampleWelcomeEmail() {
  const result = await sendWelcomeEmail('user@example.com', 'John Doe');
  console.log('Welcome email result:', result);
  return result;
}

// Example: Send a password reset email
export async function examplePasswordReset() {
  const resetToken = 'secure-reset-token-123';
  const result = await sendPasswordResetEmail('user@example.com', resetToken, 'John Doe');
  console.log('Password reset email result:', result);
  return result;
}

// Example: Send a custom notification
export async function exampleNotification() {
  const result = await sendNotificationEmail(
    'user@example.com',
    'New Message Received',
    'You have received a new message from a professional in your network!',
    'John Doe'
  );
  console.log('Notification email result:', result);
  return result;
}

// Example: Send a custom email with HTML
export async function exampleCustomEmail() {
  const result = await sendEmail({
    to: 'user@example.com',
    subject: 'Custom Email from Helixque',
    htmlContent: `
      <h1>Hello from Helixque!</h1>
      <p>This is a custom email with <strong>HTML formatting</strong>.</p>
      <p>You can include any HTML content you want.</p>
    `,
    textContent: 'Hello from Helixque! This is a custom email with plain text content.',
    from: {
      email: 'custom@helixque.com',
      name: 'Helixque Custom'
    }
  });
  console.log('Custom email result:', result);
  return result;
}

// Example: Send email using Brevo template
export async function exampleTemplateEmail() {
  // Note: You need to create a template in Brevo first and get its ID
  const templateId = 1; // Replace with your actual template ID
  const templateParams = {
    userName: 'John Doe',
    message: 'Welcome to our platform!',
    // Add any other parameters your template expects
  };
  
  const result = await sendTemplateEmail('user@example.com', templateId, templateParams);
  console.log('Template email result:', result);
  return result;
}

// Example: Verify Brevo connection
export async function exampleVerifyConnection() {
  const isConnected = await verifyBrevoConnection();
  console.log('Brevo connection status:', isConnected ? 'Connected' : 'Failed');
  return isConnected;
}

// Example: Send email with attachments
export async function exampleEmailWithAttachments() {
  const result = await sendEmail({
    to: 'user@example.com',
    subject: 'Email with Attachment',
    htmlContent: '<p>Please find the attached file.</p>',
    textContent: 'Please find the attached file.',
    attachments: [
      {
        content: 'SGVsbG8gV29ybGQ=', // Base64 encoded "Hello World"
        name: 'hello.txt',
        type: 'text/plain'
      }
    ]
  });
  console.log('Email with attachment result:', result);
  return result;
}

// Example: Send email to multiple recipients
export async function exampleBulkEmail() {
  const result = await sendEmail({
    to: ['user1@example.com', 'user2@example.com', 'user3@example.com'],
    subject: 'Bulk Email Notification',
    htmlContent: '<p>This email was sent to multiple recipients.</p>',
    textContent: 'This email was sent to multiple recipients.'
  });
  console.log('Bulk email result:', result);
  return result;
}

// Run examples (uncomment to test)
// async function runExamples() {
//   console.log('Testing Brevo mailer examples...');
//   
//   // Verify connection first
//   await exampleVerifyConnection();
//   
//   // Test different email types
//   await exampleWelcomeEmail();
//   await examplePasswordReset();
//   await exampleNotification();
//   await exampleCustomEmail();
//   await exampleBulkEmail();
//   
//   console.log('Examples completed!');
// }
// 
// runExamples().catch(console.error);
