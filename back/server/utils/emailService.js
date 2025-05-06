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
  applicationStatus: (candidateName, jobTitle, status, companyName, departmentHead, interviewDate, interviewTime, meetLink) => ({
    subject: `Application Status Update - ${jobTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="/uploads/company-logo.png" alt="Company Logo" style="max-width: 200px; height: auto;">
        </div>
        <h2 style="color: #333;">Application Status Update</h2>
        <p>Dear ${candidateName},</p>
        <p>We would like to inform you about the status of your application for the position of ${jobTitle} at ${companyName}.</p>
        <p>Your application status has been updated to: <strong>${status}</strong></p>
        ${status === 'interviewed' ? `
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #2c3e50; margin-top: 0;">Interview Details</h3>
            <p><strong>Date:</strong> ${interviewDate}</p>
            <p><strong>Time:</strong> ${interviewTime}</p>
            <p><strong>Meeting Link:</strong> <a href="${meetLink}" style="color: #3498db; text-decoration: none;">${meetLink}</a></p>
            <p style="margin-top: 15px; color: #666;">Please join the meeting 5 minutes before the scheduled time.</p>
          </div>
        ` : ''}
        <p>If you have any questions or need further information, please don't hesitate to contact us.</p>
        <div style="margin-top: 40px;">
          <table cellpadding="0" cellspacing="0" border="0" style="vertical-align: -webkit-baseline-middle; font-size: medium; font-family: Arial;">
            <tbody>
              <tr>
                <td>
                  <table cellpadding="0" cellspacing="0" border="0" style="vertical-align: -webkit-baseline-middle; font-size: medium; font-family: Arial;">
                    <tbody>
                      <tr>
                        <td style="vertical-align: top;">
                          <table cellpadding="0" cellspacing="0" border="0" style="vertical-align: -webkit-baseline-middle; font-size: medium; font-family: Arial;">
                            <tbody>
                              <tr>
                                <td style="text-align: center;">
                                  <img src="https://pbs.twimg.com/profile_images/1394261489054277638/rijXG1C__400x400.jpg" role="presentation" width="130" style="max-width: 128px; display: block;">
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                        <td width="46" aria-label="Vertical Spacer">
                          <div style="width: 46px;"></div>
                        </td>
                        <td style="padding: 0px; vertical-align: middle;">
                          <h2 style="margin: 0px; font-size: 18px; font-family: Arial; color: rgb(0, 0, 0); font-weight: 600;">
                            <span>${departmentHead}</span>
                          </h2>
                          <p style="margin: 0px; color: rgb(0, 0, 0); font-size: 14px; line-height: 22px;">
                            <span>Department Head</span>
                          </p>
                          <div style="margin: 0px; font-weight: 500; color: rgb(0, 0, 0); font-size: 14px; line-height: 22px;">
                            <span>All departments</span>
                            <span>&nbsp;|&nbsp;</span>
                            <span>${companyName}</span>
                          </div>
                          <table cellpadding="0" cellspacing="0" border="0" style="vertical-align: -webkit-baseline-middle; font-size: medium; font-family: Arial; width: 100%;">
                            <tbody>
                              <tr>
                                <td height="30" aria-label="Horizontal Spacer"></td>
                              </tr>
                              <tr>
                                <td width="auto" aria-label="Divider" style="width: 100%; height: 1px; border-bottom: 1px solid rgb(248, 98, 149); border-left: none; display: block;"></td>
                              </tr>
                              <tr>
                                <td height="30" aria-label="Horizontal Spacer"></td>
                              </tr>
                            </tbody>
                          </table>
                          <table cellpadding="0" cellspacing="0" border="0" style="vertical-align: -webkit-baseline-middle; font-size: medium; font-family: Arial;">
                            <tbody>
                              <tr style="vertical-align: middle; height: 25px;">
                                <td width="30" style="vertical-align: middle;">
                                  <table cellpadding="0" cellspacing="0" border="0" style="vertical-align: -webkit-baseline-middle; font-size: medium; font-family: Arial;">
                                    <tbody>
                                      <tr>
                                        <td style="vertical-align: bottom;">
                                          <span style="display: inline-block; background-color: rgb(248, 98, 149);">
                                            <img src="https://cdn2.hubspot.net/hubfs/53/tools/email-signature-generator/icons/phone-icon-2x.png" alt="mobilePhone" width="13" style="display: block; background-color: rgb(248, 98, 149);">
                                          </span>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </td>
                                <td style="padding: 0px; color: rgb(0, 0, 0);">
                                  <a href="tel:50962694" style="text-decoration: none; color: rgb(0, 0, 0); font-size: 14px;">
                                    <span>50962694</span>
                                  </a>
                                </td>
                              </tr>
                              <tr style="vertical-align: middle; height: 25px;">
                                <td width="30" style="vertical-align: middle;">
                                  <table cellpadding="0" cellspacing="0" border="0" style="vertical-align: -webkit-baseline-middle; font-size: medium; font-family: Arial;">
                                    <tbody>
                                      <tr>
                                        <td style="vertical-align: bottom;">
                                          <span style="display: inline-block; background-color: rgb(248, 98, 149);">
                                            <img src="https://cdn2.hubspot.net/hubfs/53/tools/email-signature-generator/icons/email-icon-2x.png" alt="emailAddress" width="13" style="display: block; background-color: rgb(248, 98, 149);">
                                          </span>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </td>
                                <td style="padding: 0px; color: rgb(0, 0, 0);">
                                  <a href="mailto:depHead@esprit.tn" style="text-decoration: none; color: rgb(0, 0, 0); font-size: 14px;">
                                    <span>depHead@esprit.tn</span>
                                  </a>
                                </td>
                              </tr>
                              <tr style="vertical-align: middle; height: 25px;">
                                <td width="30" style="vertical-align: middle;">
                                  <table cellpadding="0" cellspacing="0" border="0" style="vertical-align: -webkit-baseline-middle; font-size: medium; font-family: Arial;">
                                    <tbody>
                                      <tr>
                                        <td style="vertical-align: bottom;">
                                          <span style="display: inline-block; background-color: rgb(248, 98, 149);">
                                            <img src="https://cdn2.hubspot.net/hubfs/53/tools/email-signature-generator/icons/link-icon-2x.png" alt="website" width="13" style="display: block; background-color: rgb(248, 98, 149);">
                                          </span>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </td>
                                <td style="padding: 0px; color: rgb(0, 0, 0);">
                                  <a href="//www.SmartHire.tn" style="text-decoration: none; color: rgb(0, 0, 0); font-size: 14px;">
                                    <span>www.SmartHire.tn</span>
                                  </a>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
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