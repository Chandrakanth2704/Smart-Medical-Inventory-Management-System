
import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import type { IncomingHttpHeaders } from "node:http";
import { ObjectId, type Document } from "mongodb";
import { randomUUID } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import https from "node:https";

import { pool } from "@/lib/mysql";
import { requireRole } from "@/lib/auth";
import { getMongoDb, getGridFSBucket } from "@/lib/mongodb";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const MAX_MEDICINE_ID = BigInt("18446744073709551615");

interface MedicineRow extends RowDataPacket {
  MedicineID: string;
}

interface MedicineImageDocument extends Document {
  medicineId: string;
  fileId: ObjectId;
  filename: string;
  contentType: string;
  size: number;
  altText: string | null;
  isPrimary: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
  uploadedBy: string;
}

interface DownloadedImage {
  buffer: Buffer;
  contentType: "image/jpeg" | "image/png" | "image/webp";
}

interface ImageResponse {
  statusCode: number;
  headers: IncomingHttpHeaders;
  buffer: Buffer;
}

function isValidMedicineId(value: string): boolean {
  if (!/^[1-9]\d{0,19}$/.test(value)) {
    return false;
  }

  try {
    return BigInt(value) <= MAX_MEDICINE_ID;
  } catch {
    return false;
  }
}

function isPublicIPv4(address: string): boolean {
  const parts = address.split(".").map(Number);

  if (
    parts.length !== 4 ||
    parts.some(
      (part) =>
        !Number.isInteger(part) ||
        part < 0 ||
        part > 255
    )
  ) {
    return false;
  }

  const [a, b, c] = parts;

  // Reject private, loopback, link-local, multicast,
  // reserved and documentation IPv4 ranges.
  if (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 88 && c === 99) ||
    (a === 198 && (b === 18 || b === 19 || b === 51)) ||
    (a === 203 && b === 0 && c === 113)
  ) {
    return false;
  }

  return true;
}

function isPublicIP(address: string): boolean {
  const version = isIP(address);

  if (version === 4) {
    return isPublicIPv4(address);
  }

  if (version === 6) {
    const normalized = address.toLowerCase();

    // Accept only global unicast IPv6 addresses in 2000::/3.
    // Reject documentation addresses.
    return (
      (normalized.startsWith("2") ||
        normalized.startsWith("3")) &&
      !normalized.startsWith("2001:db8:")
    );
  }

  return false;
}

async function resolvePublicAddress(
  hostname: string
): Promise<{ address: string; family: number }> {
  const version = isIP(hostname);

  if (version) {
    if (!isPublicIP(hostname)) {
      throw new Error(
        "Private or reserved IP addresses are not allowed."
      );
    }

    return {
      address: hostname,
      family: version,
    };
  }

  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local")
  ) {
    throw new Error("Local addresses are not allowed.");
  }

  const addresses = await lookup(hostname, {
    all: true,
    verbatim: true,
  });

  if (
    addresses.length === 0 ||
    addresses.some(
      (entry) => !isPublicIP(entry.address)
    )
  ) {
    throw new Error(
      "The image URL resolves to an unsafe address."
    );
  }

  // Pin the HTTPS connection to the validated IP address.
  return addresses[0];
}

function requestImage(
  url: URL,
  address: { address: string; family: number }
): Promise<ImageResponse> {
  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        protocol: "https:",
        hostname: url.hostname,
        port: 443,
        path: `${url.pathname}${url.search}`,
        method: "GET",
        servername: url.hostname,
        timeout: 12000,
        headers: {
          "User-Agent": "SmartMedicalInventory/1.0",
          Accept: "image/jpeg,image/png,image/webp",
        },

        // Handle both Node.js DNS lookup callback formats.
        lookup: (_hostname, options, callback) => {
          const lookupOptions = options as {
            all?: boolean;
          };

          if (lookupOptions?.all === true) {
            callback(null, [
              {
                address: address.address,
                family: address.family,
              },
            ]);
          } else {
            callback(
              null,
              address.address,
              address.family
            );
          }
        },
      },
      (response) => {
        const statusCode = response.statusCode ?? 500;

        if (
          [301, 302, 303, 307, 308].includes(statusCode)
        ) {
          response.resume();

          resolve({
            statusCode,
            headers: response.headers,
            buffer: Buffer.alloc(0),
          });

          return;
        }

        if (statusCode !== 200) {
          response.resume();

          reject(
            new Error(
              "The image server did not return a successful response."
            )
          );

          return;
        }

        const contentLength = Number(
          response.headers["content-length"] ?? 0
        );

        if (
          Number.isFinite(contentLength) &&
          contentLength > MAX_FILE_SIZE
        ) {
          response.destroy();

          reject(
            new Error("The image exceeds the 5 MB size limit.")
          );

          return;
        }

        const chunks: Buffer[] = [];
        let totalSize = 0;

        response.on("data", (chunk: Buffer) => {
          totalSize += chunk.length;

          if (totalSize > MAX_FILE_SIZE) {
            response.destroy(
              new Error("The image exceeds the 5 MB size limit.")
            );

            return;
          }

          chunks.push(Buffer.from(chunk));
        });

        response.on("end", () => {
          resolve({
            statusCode,
            headers: response.headers,
            buffer: Buffer.concat(chunks),
          });
        });

        response.on("error", reject);
      }
    );

    request.on("timeout", () => {
      request.destroy(
        new Error("Image download timed out.")
      );
    });

    request.on("error", reject);

    request.end();
  });
}

async function downloadImage(
  input: string,
  redirects = 0
): Promise<DownloadedImage> {
  if (redirects > MAX_REDIRECTS) {
    throw new Error("Too many image URL redirects.");
  }

  let url: URL;

  try {
    url = new URL(input);
  } catch {
    throw new Error("Please provide a valid image URL.");
  }

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    !url.hostname ||
    (url.port && url.port !== "443")
  ) {
    throw new Error(
      "Only valid HTTPS image URLs on the standard HTTPS port are allowed."
    );
  }

  const address = await resolvePublicAddress(url.hostname);
  const response = await requestImage(url, address);

  // Handle redirects and validate every redirected destination.
  if (
    [301, 302, 303, 307, 308].includes(response.statusCode)
  ) {
    const location = response.headers.location;

    if (!location) {
      throw new Error("The image URL redirect is invalid.");
    }

    const nextUrl = new URL(location, url);

    return downloadImage(
      nextUrl.toString(),
      redirects + 1
    );
  }

  const contentType = String(
    response.headers["content-type"] ?? ""
  )
    .split(";")[0]
    .trim()
    .toLowerCase();

  let verifiedType: DownloadedImage["contentType"] | null =
    null;

  // Verify both declared MIME type and actual file signature.
  if (
    contentType === "image/jpeg" &&
    response.buffer.length >= 3 &&
    response.buffer[0] === 0xff &&
    response.buffer[1] === 0xd8 &&
    response.buffer[2] === 0xff
  ) {
    verifiedType = "image/jpeg";
  } else if (
    contentType === "image/png" &&
    response.buffer.length >= 8 &&
    response.buffer
      .subarray(0, 8)
      .equals(
        Buffer.from([
          137, 80, 78, 71, 13, 10, 26, 10,
        ])
      )
  ) {
    verifiedType = "image/png";
  } else if (
    contentType === "image/webp" &&
    response.buffer.length >= 12 &&
    response.buffer.toString("ascii", 0, 4) === "RIFF" &&
    response.buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    verifiedType = "image/webp";
  }

  if (!verifiedType) {
    throw new Error(
      "The URL must return a valid JPEG, PNG, or WebP image."
    );
  }

  if (
    response.buffer.length === 0 ||
    response.buffer.length > MAX_FILE_SIZE
  ) {
    throw new Error("The downloaded image has an invalid size.");
  }

  return {
    buffer: response.buffer,
    contentType: verifiedType,
  };
}

// POST: Upload a medicine image.
// Only ADMIN can upload images.
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  let uploadedFileId: ObjectId | null = null;
  let insertedMetadataId: ObjectId | null = null;

  let medicineId: string | null = null;
  let previousPrimaryIds: ObjectId[] = [];
  let primaryImagesChanged = false;

  try {
    // 1. Authenticate administrator.
    const session = await requireRole(["ADMIN"]);

    if (!session) {
      return NextResponse.json(
        {
          message: "Unauthorized. Admin access is required.",
        },
        { status: 403 }
      );
    }

    // 2. Validate medicine ID.
    const { id } = await context.params;
    medicineId = id;

    if (!isValidMedicineId(id)) {
      return NextResponse.json(
        { message: "Invalid medicine ID." },
        { status: 400 }
      );
    }

    // 3. Verify medicine exists in MySQL.
    const [medicineRows] =
      await pool.execute<MedicineRow[]>(
        `SELECT MedicineID
         FROM medicines
         WHERE MedicineID = ?
         LIMIT 1`,
        [id]
      );

    if (medicineRows.length === 0) {
      return NextResponse.json(
        { message: "Medicine not found." },
        { status: 404 }
      );
    }

    // 4. Read and validate JSON request.
    let body: {
      url?: unknown;
      altText?: unknown;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { message: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const imageUrl =
      typeof body.url === "string"
        ? body.url.trim()
        : "";

    const altText =
      typeof body.altText === "string"
        ? body.altText.trim()
        : "";

    if (!imageUrl || imageUrl.length > 2048) {
      return NextResponse.json(
        {
          message:
            "Please provide a valid image URL (maximum 2048 characters).",
        },
        { status: 400 }
      );
    }

    if (altText.length > 200) {
      return NextResponse.json(
        {
          message:
            "Image description cannot exceed 200 characters.",
        },
        { status: 400 }
      );
    }

    // 5. Download and validate external image.
    const downloaded = await downloadImage(imageUrl);

    // 6. Connect to MongoDB and GridFS.
    const db = await getMongoDb();
    const bucket = await getGridFSBucket();

    const images =
      db.collection<MedicineImageDocument>(
        "medicine_images"
      );

    // 7. Determine next display order.
    const lastImage = await images
      .find({ medicineId: id })
      .sort({ displayOrder: -1 })
      .limit(1)
      .next();

    const nextOrder =
      (lastImage?.displayOrder ?? 0) + 1;

    // 8. Generate filename.
    const extension =
      downloaded.contentType === "image/jpeg"
        ? "jpg"
        : downloaded.contentType.split("/")[1];

    const filename = `${randomUUID()}.${extension}`;

    // 9. Upload image bytes to GridFS.
    const uploadStream = bucket.openUploadStream(
      filename,
      {
        metadata: {
          medicineId: id,
          contentType: downloaded.contentType,
          uploadedBy: session.userId,
        },
      }
    );

    await new Promise<void>((resolve, reject) => {
      uploadStream.once("finish", resolve);
      uploadStream.once("error", reject);
      uploadStream.end(downloaded.buffer);
    });

    uploadedFileId = uploadStream.id as ObjectId;

    // 10. Find existing primary images.
    const previousPrimaryImages = await images
      .find({
        medicineId: id,
        isPrimary: true,
      })
      .project<{ _id: ObjectId }>({ _id: 1 })
      .toArray();

    previousPrimaryIds = previousPrimaryImages.map(
      (image) => image._id
    );

    // 11. Make previous primary images non-primary.
    if (previousPrimaryIds.length > 0) {
      primaryImagesChanged = true;

      await images.updateMany(
        {
          medicineId: id,
          isPrimary: true,
        },
        {
          $set: {
            isPrimary: false,
            updatedAt: new Date(),
          },
        }
      );
    }

    // 12. Insert new image metadata as primary.
    const now = new Date();

    const imageDocument: MedicineImageDocument = {
      medicineId: id,
      fileId: uploadedFileId,
      filename,
      contentType: downloaded.contentType,
      size: downloaded.buffer.length,
      altText: altText || null,
      isPrimary: true,
      displayOrder: nextOrder,
      createdAt: now,
      updatedAt: now,
      uploadedBy: session.userId,
    };

    const insertResult = await images.insertOne(
      imageDocument
    );

    insertedMetadataId = insertResult.insertedId;

    return NextResponse.json(
      {
        message: "Medicine image saved successfully.",
        medicineId: id,
        image: {
          id: insertedMetadataId.toString(),
          fileId: uploadedFileId.toString(),
          filename,
          contentType: downloaded.contentType,
          size: downloaded.buffer.length,
          altText: imageDocument.altText,
          isPrimary: imageDocument.isPrimary,
          displayOrder: nextOrder,
          url: `/api/medicines/${id}/images/${uploadedFileId.toString()}`,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Medicine image URL error:", error);

    // 13. Clean up partial uploads and restore previous primary.
    try {
      const db = await getMongoDb();
      const bucket = await getGridFSBucket();

      if (insertedMetadataId) {
        await db
          .collection("medicine_images")
          .deleteOne({
            _id: insertedMetadataId,
          });
      }

      if (uploadedFileId) {
        await bucket.delete(uploadedFileId);
      }

      if (
        primaryImagesChanged &&
        medicineId &&
        previousPrimaryIds.length > 0
      ) {
        await db
          .collection("medicine_images")
          .updateMany(
            {
              _id: { $in: previousPrimaryIds },
              medicineId,
            },
            {
              $set: {
                isPrimary: true,
                updatedAt: new Date(),
              },
            }
          );
      }
    } catch (cleanupError) {
      console.error(
        "Image cleanup failed:",
        cleanupError
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "Unable to save the medicine image.";

    const status =
      /URL|HTTPS|address|image|redirect|timed out|5 MB|private|reserved|local/i.test(
        message
      )
        ? 400
        : 500;

    return NextResponse.json(
      { message },
      { status }
    );
  }
}

// GET: Retrieve image metadata.
// ADMIN and CUSTOMER can view images.
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Allow both Admin and Customer to view image metadata.
    const session = await requireRole([
      "ADMIN",
      "CUSTOMER",
    ]);

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized." },
        { status: 403 }
      );
    }

    // 1. Validate medicine ID.
    const { id } = await context.params;

    if (!isValidMedicineId(id)) {
      return NextResponse.json(
        { message: "Invalid medicine ID." },
        { status: 400 }
      );
    }

    // 2. Retrieve image metadata.
    const db = await getMongoDb();

    const images =
      db.collection<MedicineImageDocument>(
        "medicine_images"
      );

    const results = await images
      .find({ medicineId: id })
      .sort({ displayOrder: 1 })
      .toArray();

    return NextResponse.json({
      medicineId: id,
      images: results.map((image) => ({
        id: image._id?.toString(),
        fileId: image.fileId.toString(),
        filename: image.filename,
        contentType: image.contentType,
        size: image.size,
        altText: image.altText,
        isPrimary: image.isPrimary,
        displayOrder: image.displayOrder,
        url: `/api/medicines/${id}/images/${image.fileId.toString()}`,
      })),
    });
  } catch (error) {
    console.error(
      "Medicine image metadata retrieval error:",
      error
    );

    return NextResponse.json(
      {
        message: "Unable to retrieve medicine images.",
      },
      { status: 500 }
    );
  }
}
