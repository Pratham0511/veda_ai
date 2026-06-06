import nodemailer from 'nodemailer';

/**
 * Sends an email using Nodemailer
 * Falls back to console logging if SMTP is not configured.
 */
export const sendEmail = async ({ to, subject, text, html }) => {
  const hasSMTP = process.env.SMTP_USER && process.env.SMTP_PASS;

  if (!hasSMTP) {
    console.log('\n======================================================');
    console.log(`[SMTP MOCK LOG] Email to: ${to}`);
    console.log(`[SMTP MOCK LOG] Subject: ${subject}`);
    console.log(`[SMTP MOCK LOG] Body:\n${text}`);
    console.log('======================================================\n');
    return { success: true, mocked: true };
  }

  try {
    const config = process.env.SMTP_HOST
      ? {
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        }
      : {
          service: 'gmail',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        };

    const transporter = nodemailer.createTransport(config);

    const info = await transporter.sendMail({
      from: `"Veda AI" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    });

    console.log(`Email sent successfully: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`Error sending email via SMTP: ${error.message}`);
    console.log('\n======================================================');
    console.log(`[FALLBACK LOG] Email to: ${to}`);
    console.log(`[FALLBACK LOG] Subject: ${subject}`);
    console.log(`[FALLBACK LOG] Body:\n${text}`);
    console.log('======================================================\n');
    return { success: false, error: error.message };
  }
};

/**
 * Verifies the SMTP configuration on startup and logs the status.
 */
export const verifySMTP = async () => {
  const hasSMTP = process.env.SMTP_USER && process.env.SMTP_PASS;
  if (!hasSMTP) {
    console.log('[SMTP] Warning: SMTP_USER or SMTP_PASS environment variables are missing. Running in MOCK mode (emails will print to console logs only).');
    return;
  }

  try {
    const config = process.env.SMTP_HOST
      ? {
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        }
      : {
          service: 'gmail',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        };

    const transporter = nodemailer.createTransport(config);
    await transporter.verify();
    console.log('[SMTP] Success: Connection verified and ready to send emails.');
  } catch (error) {
    console.error(`[SMTP] Error: Connection verification failed. Check your credentials or app password: ${error.message}`);
  }
};
