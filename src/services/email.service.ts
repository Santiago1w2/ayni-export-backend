import nodemailer from "nodemailer";
import { env } from "../config/env";
import { AppError } from "../utils/errors";

const transporter = env.gmailUser && env.gmailAppPassword
  ? nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
      auth: { user: env.gmailUser, pass: env.gmailAppPassword },
    })
  : null;

function deliveryError(error: unknown): AppError {
  const smtpError = error as { code?: string; responseCode?: number; message?: string };
  console.error("[Email] Gmail SMTP delivery failed", {
    code: smtpError.code,
    responseCode: smtpError.responseCode,
    message: smtpError.message,
  });
  return new AppError("No se pudo enviar el correo de verificacion. Intenta nuevamente en unos minutos.", 503);
}

export async function sendVerificationEmail(to: string, code: string): Promise<void> {
  if (!transporter) throw new AppError("El servicio de correo no esta configurado", 503);

  try {
    await transporter.sendMail({
      from: { name: env.emailFromName, address: env.gmailUser },
      to,
      subject: "Verifica tu correo - Ayni Exports",
      text: `Tu codigo de verificacion es ${code}. Expira en 10 minutos.`,
      html: `<div style="margin:0;padding:32px 12px;background:#F8FAF8;font-family:Arial,sans-serif;color:#12372A"><div style="max-width:560px;margin:auto;background:white;border-radius:14px;overflow:hidden;border:1px solid #e4e9e5"><div style="background:#12372A;padding:24px 30px;color:white;font-weight:700;font-size:20px">AYNI <span style="color:#D91E2B">EXPORTS</span></div><div style="padding:30px"><h1 style="font-size:24px;margin:0 0 14px">Verifica tu correo</h1><p>Usa el siguiente codigo para continuar con tu registro en Ayni Exports.</p><div style="margin:28px 0;padding:18px;text-align:center;background:#F8FAF8;border-radius:10px;font-size:32px;font-weight:700;letter-spacing:9px;color:#D91E2B">${code}</div><p>Este codigo expira en 10 minutos.</p><p style="font-size:13px;color:#6B756F">Si tu no creaste esta cuenta, ignora este correo.</p></div></div></div>`,
    });
  } catch (error) {
    throw deliveryError(error);
  }
}
