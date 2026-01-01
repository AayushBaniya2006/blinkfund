/**
 * Dynamic OG Image Generator for Campaigns
 * Generates campaign-specific preview images for social sharing
 * Includes CORS headers for Solana Actions/Blinks compatibility
 */

import { ImageResponse } from "next/og";
import { NextRequest, NextResponse } from "next/server";
import { getCampaignById } from "@/lib/campaigns/queries";
import { lamportsToSol } from "@/lib/campaigns/validation";
import { ACTIONS_CORS_HEADERS } from "@solana/actions";

const WIDTH = 1200;
const HEIGHT = 630;

/**
 * Combined headers for OG image responses
 * Includes CORS headers for Solana Actions/Blinks and proper content-type
 */
const OG_IMAGE_HEADERS = {
  ...ACTIONS_CORS_HEADERS,
  "Content-Type": "image/png",
};

/**
 * OPTIONS handler for CORS preflight (required for Solana Actions/Blinks)
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: OG_IMAGE_HEADERS,
  });
}

/**
 * Sanitize text for safe SVG rendering
 * Prevents XSS in OG images by escaping special characters
 */
function sanitizeText(text: string, maxLength: number = 200): string {
  return text
    .replace(/[<>&"']/g, (char) => {
      const entities: Record<string, string> = {
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&#39;",
      };
      return entities[char] || char;
    })
    .slice(0, maxLength);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const campaign = await getCampaignById(id);

    if (!campaign) {
      return new ImageResponse(
        (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
              fontFamily: "system-ui",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  background: "#f5d47a",
                  borderRadius: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "40px",
                }}
              >
                ⚡
              </div>
              <span
                style={{
                  fontSize: "48px",
                  fontWeight: "bold",
                  color: "#ffffff",
                }}
              >
                BlinkFund
              </span>
            </div>
            <span style={{ fontSize: "32px", color: "#888" }}>
              Campaign Not Found
            </span>
          </div>
        ),
        { width: WIDTH, height: HEIGHT, headers: OG_IMAGE_HEADERS },
      );
    }

    const goalSol = lamportsToSol(BigInt(campaign.goalLamports));
    const raisedSol = lamportsToSol(BigInt(campaign.raisedLamports));
    const progressPercent =
      goalSol > 0 ? Math.min(100, Math.round((raisedSol / goalSol) * 100)) : 0;
    const deadline = new Date(campaign.deadline);
    const now = new Date();
    const daysLeft = Math.max(
      0,
      Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    );
    const isExpired = deadline <= now;

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
            fontFamily: "system-ui",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              padding: "48px",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "32px",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    background: "#f5d47a",
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                  }}
                >
                  ⚡
                </div>
                <span
                  style={{
                    fontSize: "28px",
                    fontWeight: "bold",
                    color: "#ffffff",
                  }}
                >
                  BlinkFund
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: isExpired
                    ? "rgba(239,68,68,0.2)"
                    : "rgba(34,197,94,0.2)",
                  padding: "8px 16px",
                  borderRadius: "20px",
                }}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: isExpired ? "#ef4444" : "#22c55e",
                  }}
                />
                <span
                  style={{
                    fontSize: "18px",
                    color: isExpired ? "#ef4444" : "#22c55e",
                    fontWeight: "600",
                  }}
                >
                  {isExpired ? "Ended" : `${daysLeft} days left`}
                </span>
              </div>
            </div>

            {/* Title */}
            <div
              style={{
                display: "flex",
                flex: 1,
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <h1
                style={{
                  fontSize:
                    campaign.title.length > 50
                      ? "42px"
                      : campaign.title.length > 30
                        ? "52px"
                        : "64px",
                  fontWeight: "bold",
                  color: "#ffffff",
                  margin: 0,
                  lineHeight: 1.2,
                  marginBottom: "24px",
                  maxWidth: "900px",
                }}
              >
                {sanitizeText(campaign.title, 100)}
              </h1>
              {campaign.description && (
                <p
                  style={{
                    fontSize: "24px",
                    color: "rgba(255,255,255,0.7)",
                    margin: 0,
                    marginBottom: "32px",
                    maxWidth: "800px",
                    lineHeight: 1.4,
                  }}
                >
                  {sanitizeText(campaign.description, 120)}
                  {campaign.description.length > 120 ? "..." : ""}
                </p>
              )}
            </div>

            {/* Progress */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <div
                style={{ display: "flex", alignItems: "baseline", gap: "12px" }}
              >
                <span
                  style={{
                    fontSize: "56px",
                    fontWeight: "bold",
                    color: "#f5d47a",
                  }}
                >
                  {raisedSol.toFixed(2)} SOL
                </span>
                <span
                  style={{ fontSize: "28px", color: "rgba(255,255,255,0.6)" }}
                >
                  raised of {goalSol.toFixed(2)} SOL goal
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  width: "100%",
                  height: "24px",
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${progressPercent}%`,
                    height: "100%",
                    background:
                      "linear-gradient(90deg, #f5d47a 0%, #f59e0b 100%)",
                    borderRadius: "12px",
                  }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{ fontSize: "20px", color: "rgba(255,255,255,0.6)" }}
                >
                  {progressPercent}% funded
                </span>
                <span
                  style={{
                    fontSize: "20px",
                    color: "#f5d47a",
                    fontWeight: "600",
                  }}
                >
                  Donate with Solana
                </span>
              </div>
            </div>
          </div>
        </div>
      ),
      { width: WIDTH, height: HEIGHT, headers: OG_IMAGE_HEADERS },
    );
  } catch (error) {
    console.error("OG Image generation error:", error);
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
            fontFamily: "system-ui",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "80px",
                height: "80px",
                background: "#f5d47a",
                borderRadius: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "40px",
              }}
            >
              ⚡
            </div>
            <span
              style={{ fontSize: "48px", fontWeight: "bold", color: "#ffffff" }}
            >
              BlinkFund
            </span>
          </div>
          <span
            style={{
              fontSize: "28px",
              color: "rgba(255,255,255,0.6)",
              marginTop: "24px",
            }}
          >
            Crowdfunding on Solana
          </span>
        </div>
      ),
      { width: WIDTH, height: HEIGHT, headers: OG_IMAGE_HEADERS },
    );
  }
}
