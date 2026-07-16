import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

@Injectable()
export class EmailService {
  constructor(private readonly configService: ConfigService) {}

  ensureSmtpConfigured() {
    if (
      !this.configService.get<string>('SMTP_HOST') ||
      !this.configService.get<string>('SMTP_USER') ||
      !this.configService.get<string>('SMTP_PASS') ||
      !this.configService.get<string>('SMTP_FROM')
    ) {
      throw new InternalServerErrorException('SMTP configuration is missing');
    }
  }

  async sendVerificationEmail({
    to,
    name,
    verificationUrl,
  }: {
    to: string;
    name: string;
    verificationUrl: string;
  }) {
    this.ensureSmtpConfigured();

    const smtpPort = Number(this.configService.get<string>('SMTP_PORT') ?? 587);

    const transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });

    await transporter.sendMail({
      from: `"AscendCart Ventures" <${this.configService.get<string>('SMTP_FROM')}>`,
      to,
      subject: 'Verify your AscendCart account', // Note: removed the '3' unless that was intentional
      headers: {
        'List-Unsubscribe': `<mailto:unsubscribe@ascendcartventures.com?subject=unsubscribe>, <https://ascendcartventures.com/unsubscribe>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      text: `
Hi ${name},

Please verify your AscendCart account by clicking the link below:

${verificationUrl}

If you did not request this email, you can ignore it.

AscendCart Ventures
      `.trim(),
      html: `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>

<body bgcolor="#f5f7fb" style="margin:0;padding:40px;background-color:#f5f7fb;font-family:Arial,Helvetica,sans-serif;color:#000000;">

<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#f5f7fb">
<tr>
<td align="center">

<table width="600" cellpadding="0" cellspacing="0" bgcolor="#ffffff"
style="background-color:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:40px;">

<tr>
<td align="center">
<h1 style="margin:0;color:#000000;font-size:22px;">
AscendCart Ventures
</h1>

<p style="margin-top:10px;color:#333333;font-size:14px;">
Verify your email address
</p>
</td>
</tr>

<tr>
<td style="padding-top:30px;">
<p style="font-size:16px;color:#000000;">
Hello ${escapeHtml(name)},
</p>

<p style="font-size:15px;color:#333333;line-height:1.8;">
Please verify your email address to activate your account.
</p>
</td>
</tr>

<tr>
<td align="center" style="padding:32px 0;">
<a href="${escapeHtml(verificationUrl)}"
style="
background-color:#000000;
color:#ffffff;
padding:14px 32px;
border-radius:10px;
text-decoration:none;
font-weight:600;
display:inline-block;
">
Verify Email
</a>
</td>
</tr>

<tr>
<td>
<p style="font-size:14px;color:#333333;line-height:1.7;">
If you did not create this account, ignore this email.
</p>

<p style="font-size:13px;color:#333333;">
This link expires in 24 hours.
</p>
</td>
</tr>

<tr>
<td style="padding-top:24px;border-top:1px solid #e5e7eb;">
<p style="font-size:12px;color:#333333;word-break:break-all;">
${escapeHtml(verificationUrl)}
</p>
</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
`,
    });
  }
}
