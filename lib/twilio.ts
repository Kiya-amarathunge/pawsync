import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

export async function sendSMS(to: string, message: string): Promise<boolean> {
  try {
    if (!accountSid || !authToken || !fromNumber) {
      console.warn('Twilio credentials not configured. Skipping SMS.');
      return false;
    }

    // Skip SMS in development if using test credentials
    if (accountSid.startsWith('AC') === false) {
      console.warn('Invalid Twilio Account SID. Skipping SMS.');
      return false;
    }

    const client = twilio(accountSid, authToken);

    await client.messages.create({
      body: message,
      from: fromNumber,
      to,
    });

    console.log(`SMS sent to ${to}`);
    return true;
  } catch (error) {
    console.error('Twilio SMS error:', error);
    return false;
  }
}