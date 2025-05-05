import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the correct path
const envPath = path.join(__dirname, '..', '..', '.env');
console.log('\n=== Loading Environment Variables ===');
console.log('Looking for .env file at:', envPath);
dotenv.config({ path: envPath });

// Debug: Log environment variables
console.log('\n=== Email Configuration ===');
console.log('Email User:', process.env.EMAIL_USER);
console.log('Has Password:', !!process.env.EMAIL_PASSWORD);
console.log('All env variables:', Object.keys(process.env));
console.log('========================\n');

// Create a transporter using SMTP with more detailed configuration
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Test email function
export const testEmailConnection = async () => {
  try {
    console.log('\n=== Testing SMTP Connection ===');
    console.log('Using email:', process.env.EMAIL_USER);
    const info = await transporter.verify();
    console.log('SMTP Connection Test Result:', info);
    console.log('SMTP Connection Test: SUCCESS\n');
    return true;
  } catch (error) {
    console.error('\n=== SMTP Connection Test Failed ===');
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      command: error.command
    });
    console.error('==============================\n');
    return false;
  }
};

// Verify transporter configuration
transporter.verify(function(error, success) {
  if (error) {
    console.error('\n=== SMTP Configuration Error ===');
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      command: error.command
    });
    console.error('=============================\n');
  } else {
    console.log('\n=== SMTP Server Ready ===');
    console.log('Server is ready to send emails');
    console.log('========================\n');
  }
});

// Email templates
const emailTemplates = {
  applicationStatus: (name, jobTitle, status, company) => ({
    subject: `Application Status Update - ${jobTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Application Status Update</h2>
        <p>Dear ${name},</p>
        <p>Your application for the position of <strong>${jobTitle}</strong> at <strong>${company}</strong> has been updated.</p>
        <p>Current Status: <strong style="color: #800000;">${status}</strong></p>
        <p>Please log in to your account to view more details about your application.</p>
        <p>Best regards,<br>The ${company} Team</p>
      </div>
    `
  }),
  
  interviewScheduled: (name, jobTitle, company, interviewDate, interviewTime, location) => ({
    subject: `Interview Scheduled - ${jobTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Interview Scheduled</h2>
        <p>Dear ${name},</p>
        <p>Congratulations! You have been selected for an interview for the position of <strong>${jobTitle}</strong> at <strong>${company}</strong>.</p>
        <p>Interview Details:</p>
        <ul>
          <li>Date: ${interviewDate}</li>
          <li>Time: ${interviewTime}</li>
          <li>Location: ${location}</li>
        </ul>
        <p>Please arrive 10 minutes before your scheduled time.</p>
        <p>Best regards,<br>The ${company} Team</p>
      </div>
    `
  })
};

// Function to send email
export const sendEmail = async (to, template, data) => {
  try {
    console.log('\n=== Attempting to Send Email ===');
    console.log('To:', to);
    console.log('Template:', template);
    console.log('Data:', data);
    
    // Validate recipient
    if (!to) {
      console.error('Error: No recipient email provided');
      return false;
    }
    
    // Validate template
    if (!template || !emailTemplates[template]) {
      console.error(`Error: Invalid or missing template: ${template}`);
      return false;
    }
    
    // Validate data
    if (!data || !Array.isArray(data)) {
      console.error('Error: Data must be an array');
      return false;
    }
    
    // Make sure we have all required data elements for the template
    // Replace any undefined values with default placeholders
    const sanitizedData = [...data];
    for (let i = 0; i < sanitizedData.length; i++) {
      if (sanitizedData[i] === undefined || sanitizedData[i] === null) {
        console.warn(`Warning: Data element at index ${i} is undefined, using placeholder`);
        
        // Use appropriate placeholders based on index/context
        switch (i) {
          case 0: // Usually the name
            sanitizedData[i] = 'Candidate';
            break;
          case 1: // Usually job title
            sanitizedData[i] = 'the position';
            break;
          case 2: // Usually status or other info
            sanitizedData[i] = 'updated';
            break;
          case 3: // Usually company
            sanitizedData[i] = 'Our Company';
            break;
          default:
            sanitizedData[i] = 'Not specified';
        }
      }
    }
    
    console.log('Using email:', process.env.EMAIL_USER);
    console.log('Sanitized data:', sanitizedData);

    const { subject, html } = emailTemplates[template](...sanitizedData);
    
    const mailOptions = {
      from: `"SmartHire" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    };

    console.log('Mail options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    });

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    console.log('===========================\n');
    return true;
  } catch (error) {
    console.error('\n=== Error Sending Email ===');
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      command: error.command
    });
    console.error('========================\n');
    return false;
  }
}; 