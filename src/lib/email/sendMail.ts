import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { appConfig } from "@/lib/config";

const ses = new SESClient({
  region: process.env.AWS_REGION || "us-east-1",
});

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

const sendMail = async ({ to, subject, html, replyTo }: SendMailOptions) => {
  const fromEmail = process.env.SES_FROM_EMAIL || appConfig.email.senderEmail;
  const fromName = appConfig.email.senderName;

  // In development, just log the email
  if (process.env.NODE_ENV === "development" && !process.env.SES_FROM_EMAIL) {
    console.log("📧 Email (dev mode):", { to, subject, html: html.substring(0, 200) + "..." });
    return { success: true, messageId: "dev-mode" };
  }

  try {
    const command = new SendEmailCommand({
      Source: `${fromName} <${fromEmail}>`,
      Destination: {
        ToAddresses: [to],
      },
      Message: {
        Subject: {
          Charset: "UTF-8",
          Data: subject,
        },
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: html,
          },
        },
      },
      ReplyToAddresses: replyTo ? [replyTo] : undefined,
    });

    const result = await ses.send(command);
    console.log("📧 Email sent:", result.MessageId);
    return { success: true, messageId: result.MessageId };
  } catch (error) {
    console.error("📧 Email failed:", error);
    throw error;
  }
};

export default sendMail;
