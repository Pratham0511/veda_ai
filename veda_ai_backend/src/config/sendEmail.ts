import sgMail from '@sendgrid/mail';

export const sendEmail = async ({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}) => {
  if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  }

  const msg = {
    to,
    from: process.env.EMAIL_FROM || 'test@example.com', // Change to your verified sender
    subject,
    text: text || '',
    html: html || '',
  };

  try {
    const response = await sgMail.send(msg);
    console.log('[Email] Sent via SendGrid to:', to);
    return response;
  } catch (error: any) {
    console.error('[Email] Failed to send:', error.response?.body || error.message);
    throw new Error(error.message);
  }
};

// Called on server startup to confirm email is configured
export const verifySMTP = () => {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('[Email] SENDGRID_API_KEY is not set — emails will not work.');
  } else {
    console.log('[Email] SendGrid is configured and ready.');
  }
};
