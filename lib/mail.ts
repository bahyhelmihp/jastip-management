import nodemailer from "nodemailer";

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendMailOptions) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || '"Jastip Management" <no-reply@jastip-management.com>';

  if (host && user && pass) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });

      await transporter.sendMail({
        from,
        to,
        subject,
        html,
      });
      console.log(`[MAIL] Email sent successfully via SMTP to ${to}`);
      return { sent: true, mode: "smtp" };
    } catch (err: any) {
      console.error(`[MAIL ERROR] SMTP delivery failed: ${err.message}`);
      console.log(`\n========================================`);
      console.log(`[MAIL FALLBACK MODE] Email to: ${to}`);
      console.log(`[MAIL FALLBACK MODE] Subject: ${subject}`);
      console.log(`[MAIL FALLBACK MODE] Content:\n${html.replace(/<[^>]*>?/gm, "")}`);
      console.log(`========================================\n`);
      return { sent: false, mode: "console", error: err.message };
    }
  } else {
    // Development / fallback mode: Log to console
    console.log(`\n========================================`);
    console.log(`[MAIL DEV MODE] Email to: ${to}`);
    console.log(`[MAIL DEV MODE] Subject: ${subject}`);
    console.log(`[MAIL DEV MODE] Content:\n${html.replace(/<[^>]*>?/gm, "")}`);
    console.log(`========================================\n`);
    return { sent: true, mode: "console" };
  }
}

export async function sendVerificationEmail(toEmail: string, token: string, baseUrl: string) {
  const verificationUrl = `${baseUrl}/verify-email?token=${token}`;
  const subject = "Verify your email address - Jastip Management";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
      <h2 style="color: #2563eb; margin-bottom: 16px;">Welcome to Jastip Management!</h2>
      <p style="color: #334155; font-size: 16px; line-height: 1.5;">
        Thank you for registering. Please verify your email address to activate your account and start managing your jastip invoices.
      </p>
      <div style="margin: 28px 0;">
        <a href="${verificationUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          Verify Email Address
        </a>
      </div>
      <p style="color: #64748b; font-size: 14px;">
        Or copy and paste this link into your browser:<br/>
        <a href="${verificationUrl}" style="color: #2563eb;">${verificationUrl}</a>
      </p>
      <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
        If you did not create an account, please ignore this email.
      </p>
    </div>
  `;

  const result = await sendEmail({ to: toEmail, subject, html });
  return { ...result, verificationUrl };
}

export async function sendPasswordResetEmail(toEmail: string, token: string, baseUrl: string) {
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;
  const subject = "Reset your password - Jastip Management";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
      <h2 style="color: #2563eb; margin-bottom: 16px;">Password Reset Request</h2>
      <p style="color: #334155; font-size: 16px; line-height: 1.5;">
        We received a request to reset your password. Click the button below to set a new password for your account:
      </p>
      <div style="margin: 28px 0;">
        <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          Reset Password
        </a>
      </div>
      <p style="color: #64748b; font-size: 14px;">
        Or copy and paste this link into your browser:<br/>
        <a href="${resetUrl}" style="color: #2563eb;">${resetUrl}</a>
      </p>
      <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
        If you did not request a password reset, you can safely ignore this email.
      </p>
    </div>
  `;

  const result = await sendEmail({ to: toEmail, subject, html });
  return { ...result, resetUrl };
}
