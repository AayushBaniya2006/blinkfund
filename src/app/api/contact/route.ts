import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { contacts } from "@/db/schema/contact";
import sendMail from "@/lib/email/sendMail";
import { appConfig } from "@/lib/config";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  company: z.string().max(100).optional(),
  message: z.string().min(10, "Message must be at least 10 characters").max(2000),
});

// Rate limit config: 3 requests per minute per IP
const contactRateLimit = { maxRequests: 3, windowMs: 60 * 1000 };

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIp = getClientIp(request);
    const rateLimitResponse = await checkRateLimit(contactRateLimit, clientIp, "contact");
    if (rateLimitResponse) return rateLimitResponse;

    // Parse and validate body
    const body = await request.json();
    const result = contactSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, company, message } = result.data;

    // Save to database
    const [contact] = await db
      .insert(contacts)
      .values({
        name,
        email,
        company: company || null,
        message,
      })
      .returning();

    // Send email notification
    const contactEmail = process.env.CONTACT_EMAIL || "blinkfund28@gmail.com";

    await sendMail({
      to: contactEmail,
      subject: `New Contact Form Submission from ${name}`,
      html: `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a1a1a;">New Contact Form Submission</h2>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Name:</strong> ${escapeHtml(name)}</p>
            <p><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
            ${company ? `<p><strong>Company:</strong> ${escapeHtml(company)}</p>` : ""}
            <p><strong>Message:</strong></p>
            <div style="background: white; padding: 15px; border-radius: 4px; white-space: pre-wrap;">${escapeHtml(message)}</div>
          </div>
          <p style="color: #666; font-size: 12px;">
            Submitted at ${new Date().toISOString()}<br>
            Contact ID: ${contact.id}
          </p>
        </div>
      `,
      replyTo: email,
    });

    return NextResponse.json({
      success: true,
      message: "Thank you for your message! We'll get back to you soon.",
    });
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "Failed to submit contact form. Please try again." },
      { status: 500 }
    );
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
