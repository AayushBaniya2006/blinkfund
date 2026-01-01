/**
 * API Route for getting presigned S3 upload URLs for campaign images
 * POST - Returns presigned URL and fields for direct S3 upload
 */

import { NextRequest, NextResponse } from "next/server";
import createS3UploadFields from "@/lib/s3/createS3UploadFields";
import { v4 as uuidv4 } from "uuid";

// Allowed image types
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

// Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fileName, fileType, fileSize } = body;

    // Validate required fields
    if (!fileName || !fileType || !fileSize) {
      return NextResponse.json(
        { error: "Missing required fields: fileName, fileType, fileSize" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(fileType)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate file size
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    // Generate unique file path
    const fileExtension = fileName.split(".").pop() || "jpg";
    const uniqueFileName = `${uuidv4()}.${fileExtension}`;
    const path = `campaigns/images/${uniqueFileName}`;

    // Get presigned post data
    const presignedPost = await createS3UploadFields({
      path,
      maxSize: MAX_FILE_SIZE,
      contentType: fileType,
    });

    return NextResponse.json({
      url: presignedPost.url,
      fields: presignedPost.fields,
    });
  } catch (error) {
    console.error("Error creating presigned URL:", error);
    return NextResponse.json(
      { error: "Failed to create upload URL" },
      { status: 500 }
    );
  }
}
