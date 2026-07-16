import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
  await transporter.sendMail({
    from: `"PawSync" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Reset your PawSync password",
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1D9E75;">Reset Your Password</h2>
      <p>Click the button below to create a new password.</p>
      <a href="${resetUrl}" style="display: inline-block; background-color: #1D9E75; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 20px 0;">Reset Password</a>
      <p>This link expires in 1 hour.</p>
    </div>`,
  });
}

export async function sendProviderPendingEmail(email: string, name: string) {
  await transporter.sendMail({
    from: `"PawSync" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Your PawSync application is under review",
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1D9E75;">Application Received</h2>
      <p>Hi ${name},</p>
      <p>Thank you for applying. Our team will review your credentials within 2-3 business days.</p>
    </div>`,
  });
}

export async function sendProviderInformationRequestEmail(email: string, name: string, note: string) {
  await transporter.sendMail({
    from: `"PawSync" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'More information is required for your PawSync application',
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><h2 style="color:#1D9E75">Application update</h2><p>Hi ${name},</p><p>Our verification team needs the following information:</p><p style="padding:12px;background:#f3f4f6">${note}</p><p>Please sign in after approval support confirms your updated documents.</p></div>`,
  });
}
