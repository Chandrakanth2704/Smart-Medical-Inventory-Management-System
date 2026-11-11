
import { NextRequest, NextResponse } from "next/server";
import { ObjectId, type Document } from "mongodb";

import { requireRole } from "@/lib/auth";
import { getMongoDb, getGridFSBucket } from "@/lib/mongodb";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_MEDICINE_ID = BigInt("18446744073709551615");

const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

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

function isValidObjectId(value: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(value);
}

async function getImageContext(
  id: string,
  imageID: string
) {
  const db = await getMongoDb();
  const bucket = await getGridFSBucket();

  const images = db.collection<MedicineImageDocument>(
    "medicine_images"
  );

  const fileId = new ObjectId(imageID);

  const image = await images.findOne({
    medicineId: id,
    fileId,
  });

  return {
    db,
    bucket,
    images,
    fileId,
    image,
  };
}

// GET: Retrieve image bytes from GridFS.
// ADMIN and CUSTOMER can view images.
export async function GET(
  _request: NextRequest,
  context: {
    params: Promise<{ id: string; imageID: string }>;
  }
) {
  let downloadStream:
    | Awaited<ReturnType<typeof getGridFSBucket>>["openDownloadStream"] extends (
        ...args: never[]
      ) => infer R
      ? R
      : never
    | undefined = undefined;

  try {
    const session = await requireRole(["ADMIN", "CUSTOMER"]);

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized." },
        { status: 403 }
      );
    }

    const { id, imageID } = await context.params;

    if (
      !isValidMedicineId(id) ||
      !isValidObjectId(imageID)
    ) {
      return NextResponse.json(
        { message: "Invalid medicine or image ID." },
        { status: 400 }
      );
    }

    const {
      bucket,
      image,
      fileId,
    } = await getImageContext(id, imageID);

    if (!image) {
      return NextResponse.json(
        { message: "Medicine image not found." },
        { status: 404 }
      );
    }

    const contentType = String(image.contentType ?? "");

    if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
      return NextResponse.json(
        { message: "Unsupported image format." },
        { status: 415 }
      );
    }

    if (
      typeof image.size !== "number" ||
      !Number.isSafeInteger(image.size) ||
      image.size <= 0 ||
      image.size > MAX_FILE_SIZE
    ) {
      return NextResponse.json(
        { message: "Invalid image size." },
        { status: 400 }
      );
    }

    const chunks: Buffer[] = [];
    let totalSize = 0;

    downloadStream = bucket.openDownloadStream(fileId);

    for await (const chunk of downloadStream) {
      const buffer = Buffer.from(chunk);

      totalSize += buffer.length;

      if (totalSize > MAX_FILE_SIZE) {
        downloadStream.destroy();

        return NextResponse.json(
          { message: "Image exceeds the allowed size." },
          { status: 400 }
        );
      }

      chunks.push(buffer);
    }

    const imageBuffer = Buffer.concat(chunks);

    if (
      imageBuffer.length === 0 ||
      imageBuffer.length !== image.size
    ) {
      return NextResponse.json(
        { message: "Image data is incomplete." },
        { status: 500 }
      );
    }

    return new NextResponse(
      new Uint8Array(imageBuffer),
      {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Length": String(imageBuffer.length),
          "Cache-Control": "private, max-age=3600",
          "X-Content-Type-Options": "nosniff",
        },
      }
    );
  } catch (error) {
    console.error(
      "GridFS image retrieval error:",
      error
    );

    return NextResponse.json(
      {
        message: "Unable to retrieve the medicine image.",
      },
      { status: 500 }
    );
  } finally {
    if (downloadStream && !downloadStream.destroyed) {
      downloadStream.destroy();
    }
  }
}

// PATCH: Update image metadata.
// Only ADMIN can update image metadata.
export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{ id: string; imageID: string }>;
  }
) {
  try {
    const session = await requireRole(["ADMIN"]);

    if (!session) {
      return NextResponse.json(
        {
          message: "Unauthorized. Admin access is required.",
        },
        { status: 403 }
      );
    }

    const { id, imageID } = await context.params;

    if (
      !isValidMedicineId(id) ||
      !isValidObjectId(imageID)
    ) {
      return NextResponse.json(
        { message: "Invalid medicine or image ID." },
        { status: 400 }
      );
    }

    let body: Record<string, unknown>;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { message: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const allowedFields = [
      "altText",
      "displayOrder",
      "isPrimary",
    ];

    const suppliedFields = Object.keys(body);

    if (
      suppliedFields.length === 0 ||
      suppliedFields.some(
        (field) => !allowedFields.includes(field)
      )
    ) {
      return NextResponse.json(
        {
          message:
            "Provide at least one supported field: altText, displayOrder, or isPrimary.",
        },
        { status: 400 }
      );
    }

    const updateFields: {
      altText?: string | null;
      displayOrder?: number;
    } = {};

    if ("altText" in body) {
      if (
        body.altText !== null &&
        typeof body.altText !== "string"
      ) {
        return NextResponse.json(
          {
            message:
              "Image description must be a string or null.",
          },
          { status: 400 }
        );
      }

      const altText =
        typeof body.altText === "string"
          ? body.altText.trim()
          : null;

      if (altText !== null && altText.length > 200) {
        return NextResponse.json(
          {
            message:
              "Image description cannot exceed 200 characters.",
          },
          { status: 400 }
        );
      }

      updateFields.altText = altText;
    }

    if ("displayOrder" in body) {
      if (
        typeof body.displayOrder !== "number" ||
        !Number.isSafeInteger(body.displayOrder) ||
        body.displayOrder < 0 ||
        body.displayOrder > 1000000
      ) {
        return NextResponse.json(
          {
            message:
              "Display order must be a whole number between 0 and 1000000.",
          },
          { status: 400 }
        );
      }

      updateFields.displayOrder = body.displayOrder;
    }

    if (
      "isPrimary" in body &&
      typeof body.isPrimary !== "boolean"
    ) {
      return NextResponse.json(
        {
          message: "isPrimary must be true or false.",
        },
        { status: 400 }
      );
    }

    const {
      images,
      image,
      fileId,
    } = await getImageContext(id, imageID);

    if (!image) {
      return NextResponse.json(
        { message: "Medicine image not found." },
        { status: 404 }
      );
    }

    const now = new Date();

    // Do not allow the current primary image to be
    // made non-primary without selecting another image.
    if (
      body.isPrimary === false &&
      image.isPrimary
    ) {
      return NextResponse.json(
        {
          message:
            "Select another image as primary before removing primary status from this image.",
        },
        { status: 409 }
      );
    }

    // Set this image as primary.
    // The existing primary image is unset first to
    // satisfy the unique partial MongoDB index.
    if (body.isPrimary === true) {
      const previousPrimaryImages = await images
        .find({
          medicineId: id,
          isPrimary: true,
        })
        .project<{ _id: ObjectId }>({
          _id: 1,
        })
        .toArray();

      const previousPrimaryIds =
        previousPrimaryImages.map((item) => item._id);

      try {
        await images.updateMany(
          {
            medicineId: id,
            isPrimary: true,
          },
          {
            $set: {
              isPrimary: false,
              updatedAt: now,
            },
          }
        );

        const result = await images.updateOne(
          {
            medicineId: id,
            fileId,
          },
          {
            $set: {
              ...updateFields,
              isPrimary: true,
              updatedAt: now,
            },
          }
        );

        if (result.matchedCount === 0) {
          throw new Error("Medicine image not found.");
        }
      } catch (error) {
        // Restore the previous primary image if the
        // requested update fails.
        if (previousPrimaryIds.length > 0) {
          await images.updateMany(
            {
              _id: { $in: previousPrimaryIds },
              medicineId: id,
            },
            {
              $set: {
                isPrimary: true,
                updatedAt: new Date(),
              },
            }
          );
        }

        throw error;
      }
    } else {
      const result = await images.updateOne(
        {
          medicineId: id,
          fileId,
        },
        {
          $set: {
            ...updateFields,
            updatedAt: now,
          },
        }
      );

      if (result.matchedCount === 0) {
        return NextResponse.json(
          { message: "Medicine image not found." },
          { status: 404 }
        );
      }
    }

    const updatedImage = await images.findOne({
      medicineId: id,
      fileId,
    });

    return NextResponse.json({
      message: "Medicine image metadata updated successfully.",
      image: updatedImage
        ? {
            id: updatedImage._id.toString(),
            fileId: updatedImage.fileId.toString(),
            filename: updatedImage.filename,
            contentType: updatedImage.contentType,
            size: updatedImage.size,
            altText: updatedImage.altText,
            isPrimary: updatedImage.isPrimary,
            displayOrder: updatedImage.displayOrder,
            updatedAt: updatedImage.updatedAt,
            url: `/api/medicines/${id}/images/${updatedImage.fileId.toString()}`,
          }
        : null,
    });
  } catch (error) {
    console.error(
      "Medicine image metadata update error:",
      error
    );

    if (
      error instanceof Error &&
      error.message === "Medicine image not found."
    ) {
      return NextResponse.json(
        { message: error.message },
        { status: 404 }
      );
    }

    if (
      error instanceof Error &&
      error.message.includes("E11000")
    ) {
      return NextResponse.json(
        {
          message:
            "Another image was selected as primary at the same time. Please retry.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        message: "Unable to update medicine image metadata.",
      },
      { status: 500 }
    );
  }
}

// DELETE: Delete image metadata and its GridFS file.
// If the deleted image is primary, promote another image.
// Only ADMIN can delete images.
export async function DELETE(
  _request: NextRequest,
  context: {
    params: Promise<{ id: string; imageID: string }>;
  }
) {
  try {
    const session = await requireRole(["ADMIN"]);

    if (!session) {
      return NextResponse.json(
        {
          message: "Unauthorized. Admin access is required.",
        },
        { status: 403 }
      );
    }

    const { id, imageID } = await context.params;

    if (
      !isValidMedicineId(id) ||
      !isValidObjectId(imageID)
    ) {
      return NextResponse.json(
        { message: "Invalid medicine or image ID." },
        { status: 400 }
      );
    }

    const {
      bucket,
      images,
      fileId,
      image,
    } = await getImageContext(id, imageID);

    if (!image) {
      return NextResponse.json(
        { message: "Medicine image not found." },
        { status: 404 }
      );
    }

    // Find a replacement if the deleted image is primary.
    const replacement = image.isPrimary
      ? await images
          .find({
            medicineId: id,
            fileId: { $ne: fileId },
          })
          .sort({
            displayOrder: 1,
            createdAt: 1,
            _id: 1,
          })
          .limit(1)
          .next()
      : null;

    // Unset the current primary before promoting
    // the replacement, respecting the unique index.
    if (image.isPrimary) {
      await images.updateOne(
        {
          medicineId: id,
          fileId,
        },
        {
          $set: {
            isPrimary: false,
            updatedAt: new Date(),
          },
        }
      );

      if (replacement) {
        await images.updateOne(
          {
            _id: replacement._id,
            medicineId: id,
          },
          {
            $set: {
              isPrimary: true,
              updatedAt: new Date(),
            },
          }
        );
      }
    }

    // Delete metadata first. If GridFS cleanup fails,
    // the image will no longer appear in the gallery.
    const deleteResult = await images.deleteOne({
      medicineId: id,
      fileId,
    });

    if (deleteResult.deletedCount === 0) {
      return NextResponse.json(
        { message: "Medicine image not found." },
        { status: 404 }
      );
    }

    try {
      // Delete the GridFS file and its associated chunks.
      const gridFSFileExists = await bucket
        .find({ _id: fileId })
        .hasNext();

      if (gridFSFileExists) {
        await bucket.delete(fileId);
      }
    } catch (cleanupError) {
      console.error(
        "GridFS file cleanup failed after metadata deletion:",
        cleanupError
      );

      return NextResponse.json(
        {
          message:
            "Image metadata was deleted, but GridFS file cleanup failed. The stored file may require administrator cleanup.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Medicine image deleted successfully.",
      medicineId: id,
      deletedImageId: fileId.toString(),
      promotedPrimaryImageId: replacement
        ? replacement.fileId.toString()
        : null,
    });
  } catch (error) {
    console.error(
      "Medicine image deletion error:",
      error
    );

    return NextResponse.json(
      {
        message: "Unable to delete the medicine image.",
      },
      { status: 500 }
    );
  }
}
