import "server-only";
import { createEmailVerification, createPasswordReset } from "./auth";
import { appUrl, emailLayout, sendEmail } from "./mailer";

export async function sendVerificationEmail(user: { id: string; email: string; name: string | null }) {
  const token = await createEmailVerification(user.id);
  const url = `${appUrl()}/api/auth/verify?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: "Confirm your CareerMatch AI email",
    html: emailLayout(`Welcome${user.name ? `, ${user.name.split(" ")[0]}` : ""}!`, "<p>Confirm your email address to turn on job alerts and follow-up reminders. The link expires in 24 hours.</p>", { label: "Confirm email", url }),
  });
  return url;
}

export async function sendPasswordResetEmail(user: { id: string; email: string }) {
  const token = await createPasswordReset(user.id);
  const url = `${appUrl()}/reset-password?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: "Reset your CareerMatch AI password",
    html: emailLayout("Reset your password", "<p>Someone (hopefully you) asked to reset your password. The link expires in 30 minutes and can be used once. If this wasn't you, you can ignore this email.</p>", { label: "Choose a new password", url }),
  });
  return url;
}
