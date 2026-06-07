import nodemailer from 'nodemailer';

/**
 * Returns transporter configuration.
 * Uses port 465 (SSL) which is allowed on Railway/cloud platforms.
 * Port 587 (STARTTLS) is commonly blocked on production cloud environments.
 */
function getSMTPConfig() {
  const hostName = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '465');
  // port 465 requires secure:true (SSL), port 587 uses STARTTLS (secure:false)
  const secure = process.env.SMTP_SECURE !== undefined
    ? process.env.SMTP_SECURE === 'true'
    : port === 465;

  console.log(`[SMTP] Connecting to ${hostName}:${port} (secure=${secure})`);

  return {
    host: hostName,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 10000, // 10s — fail fast instead of hanging
    greetingTimeout: 10000,
    socketTimeout: 15000,
  };
}

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
    const config = getSMTPConfig();
    const transporter = nodemailer.createTransport(config as any);

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
    const config = getSMTPConfig();
    const transporter = nodemailer.createTransport(config as any);
    await transporter.verify();
    console.log('[SMTP] Success: Connection verified and ready to send emails.');
  } catch (error) {
    console.error(`[SMTP] Error: Connection verification failed. Check your credentials or app password: ${error.message}`);
  }
};
