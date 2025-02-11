import nodemailer from "nodemailer";
import { config } from "dotenv";
import path from "path";

config(); // Load environment variables

export async function sendTestEmail(imageAttachment?: string): Promise<string> {
  try {
    // Create transporter using .env SMTP settings
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST, // e.g., smtp.elasticemail.com
      port: parseInt(process.env.SMTP_PORT || "2525", 10),
      secure: false, // false for port 2525 (true for port 465)
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Email content (HTML and plain text)
    const htmlContent = `
      <html>
        <head>
          <title>Esto no es Spam, sueltame el brazo</title>
        </head>
        <body>
          <h1>Esto no es Spam, sueltame el brazo</h1>
          <p>Thank you for choosing alo.</p>
          <p>This is a test email sent via Elastic Email using Nodemailer.</p>
        </body>
      </html>
    `;

    const textContent = `
      Esto no es Spam, sueltame el brazo

      Thank you for choosing alo.

      This is a test email sent via Elastic Email using Nodemailer.
    `;

    // Build attachments array if an image attachment is provided
    const attachments = imageAttachment
      ? [
          {
            filename: path.basename(imageAttachment),
            path: imageAttachment,
          },
        ]
      : [];

    // Email options loaded from .env variables
    const mailOptions = {
      from: process.env.EMAIL_FROM, // e.g., "Hola coca cola <draanacastiblanco@muevemicarro.com>"
      to: process.env.EMAIL_TO, // Recipient's email address
      subject: "Nuevo cliente #2222",
      html: htmlContent,
      text: textContent,
      attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully! Message ID:", info.messageId);
    return info.messageId;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}