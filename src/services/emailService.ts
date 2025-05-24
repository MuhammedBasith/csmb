import nodemailer from 'nodemailer';
import { config } from '../config/config';

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.secure,
  auth: {
    user: config.email.auth.user,
    pass: config.email.auth.pass,
  },
});

export class EmailService {
  static async sendPasswordResetEmail(
    email: string,
    resetToken: string,
    name: string
  ): Promise<void> {
    const resetUrl = `${config.cors.origin}/reset-password?token=${resetToken}`;
  
    const message = {
      from: config.email.from,
      to: email,
      subject: 'Reset Your Password – Blowlin',
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #111;">Hi ${name},</h2>
  
          <p>We received a request to reset your password for your <strong>Blowlin</strong> account.</p>
  
          <p>If you made this request, please click the button below to reset your password:</p>
  
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #EF4444; color: #fff; padding: 12px 20px; border-radius: 6px; text-decoration: none; display: inline-block; font-weight: bold;">
              Reset Password
            </a>
          </div>
  
          <p>If the button above doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-word;"><a href="${resetUrl}" style="color: #1D4ED8;">${resetUrl}</a></p>
  
          <p><strong>Note:</strong> This link is valid for <strong>1 hour</strong> for your security.</p>
  
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
  
          <p>If you did not request a password reset, you can safely ignore this email — your password will remain unchanged.</p>
  
          <p style="margin-top: 32px;">Best regards,<br><strong>The Blowlin Team</strong></p>
        </div>
      `
    };
  
    try {
      await transporter.sendMail(message);
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error('Error sending password reset email');
    }
  }

  static async sendWelcomeEmail(
    email: string,
    resetToken: string,
    name: string,
    role: string
  ): Promise<void> {
    const resetUrl = `${config.cors.origin}/set-password?token=${resetToken}`;
    const isFounder = role === 'founder';
  
    const message = {
      from: config.email.from,
      to: email,
      subject: '🎉 Welcome to Blowlin — Set Your Password',
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #111;">Hi ${name},</h2>
  
          <p>Welcome to <strong>Blowlin</strong>! Your account has been set up, and you're just one step away from getting started.</p>
  
          <p>Please set your password by clicking the button below:</p>
  
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #1D4ED8; color: #fff; padding: 12px 20px; border-radius: 6px; text-decoration: none; display: inline-block; font-weight: bold;">
              Set Your Password
            </a>
          </div>
  
          <p>If the button doesn’t work, you can also copy and paste this link into your browser:</p>
          <p style="word-break: break-word;"><a href="${resetUrl}" style="color: #1D4ED8;">${resetUrl}</a></p>
  
          <p><strong>Note:</strong> This link will expire in <strong>24 hours</strong>.</p>
  
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
  
          <p>If you have any questions or need help, just reach out — we’re here for you.</p>
  
          <p style="margin-top: 32px;">Best regards,<br><strong>The Blowlin Team</strong></p>
        </div>
      `
    };
  
    try {
      await transporter.sendMail(message);
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error('Error sending welcome email');
    }
  }

}