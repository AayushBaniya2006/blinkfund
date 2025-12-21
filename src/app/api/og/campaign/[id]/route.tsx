/**
 * Dynamic OG Image Generator for Campaigns
 * Generates campaign-specific preview images for social sharing
 */

import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getCampaignById } from "@/lib/campaigns/queries";
import { lamportsToSol } from "@/lib/campaigns/validation";

// Image dimensions for Twitter/OG
const WIDTH = 1200;
const HEIGHT = 630;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const campaign = await getCampaignById(id);

    if (!campaign) {
      // Return a fallback image for missing campaigns
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
              fontFamily: "system-ui, sans-serif",
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
                Blink<span style={{ color: "#f5d47a" }}>Fund</span>
              </span>
            </div>
            <span style={{ fontSize: "32px", color: "#888" }}>
              Campaign Not Found
            </span>
          </div>
        ),
        { width: WIDTH, height: HEIGHT },
      );
    }

    const goalSol = lamportsToSol(BigInt(campaign.goalLamports));
    const raisedSol = lamportsToSol(BigInt(campaign.raisedLamports));
    const progressPercent =
      goalSol > 0 ? Math.min(100, Math.round((raisedSol / goalSol) * 100)) : 0;

    // Format deadline
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
            fontFamily: "system-ui, sans-serif",
            position: "relative",
          }}
        >
          {/* Background campaign image with overlay */}
          {campaign.imageUrl && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: "flex",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={campaign.imageUrl}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  opacity: 0.3,
                }}
              />
            </div>
          )}

          {/* Gradient overlay for readability */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background:
                "linear-gradient(180deg, rgba(26,26,46,0.7) 0%, rgba(22,33,62,0.95) 100%)",
              display: "flex",
            }}
          />

          {/* Content */}
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
            {/* Header with logo */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "32px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
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
                  Blink<span style={{ color: "#f5d47a" }}>Fund</span>
                </span>
              </div>

              {/* Status badge */}
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

            {/* Campaign title */}
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
                {campaign.title}
              </h1>

              {/* Description preview */}
              {campaign.description && (
                <p
                  style={{
                    fontSize: "24px",
                    color: "rgba(255,255,255,0.7)",
                    margin: 0,
                    marginBottom: "32px",
                    maxWidth: "800px",
                    lineHeight: 1.4,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {campaign.description.slice(0, 120)}
                  {campaign.description.length > 120 ? "..." : ""}
                </p>
              )}
            </div>

            {/* Progress section */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              {/* Amount raised */}
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "12px",
                }}
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

              {/* Progress bar */}
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

              {/* Progress percentage */}
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
      {
        width: WIDTH,
        height: HEIGHT,
      },
    );
  } catch (error) {
    console.error("OG Image generation error:", error);

    // Return error fallback
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
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
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
              Blink<span style={{ color: "#f5d47a" }}>Fund</span>
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
      { width: WIDTH, height: HEIGHT },
    );
  }
}
