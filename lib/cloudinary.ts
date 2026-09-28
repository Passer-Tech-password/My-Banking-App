import "server-only";
import { v2 as cloudinary } from "cloudinary";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export function getCloudinary() {
  cloudinary.config({
    cloud_name: requireEnv("CLOUDINARY_CLOUD_NAME"),
    api_key: requireEnv("CLOUDINARY_API_KEY"),
    api_secret: requireEnv("CLOUDINARY_API_SECRET"),
    secure: true,
  });
  return cloudinary;
}

export type SignedUploadParams = {
  folder: string;
  public_id?: string;
  resource_type?: "auto" | "image" | "raw" | "video";
  type?: "upload" | "authenticated" | "private";
  expires_at?: number;
  allowed_formats?: string[];
};

export function signUploadParams(params: SignedUploadParams) {
  const cld = getCloudinary();
  const timestamp = Math.round(Date.now() / 1000);
  const expires_at = params.expires_at ?? timestamp + 60 * 30;
  const base: Record<string, unknown> = {
    timestamp,
    expires_at,
    folder: params.folder,
    resource_type: params.resource_type ?? "auto",
    type: params.type ?? "authenticated",
  };
  if (params.public_id) base.public_id = params.public_id;
  if (params.allowed_formats && params.allowed_formats.length > 0) {
    base.allowed_formats = params.allowed_formats.join(",");
  }
  const signature = cld.utils.api_sign_request(base, requireEnv("CLOUDINARY_API_SECRET"));
  return {
    api_key: requireEnv("CLOUDINARY_API_KEY"),
    cloud_name: requireEnv("CLOUDINARY_CLOUD_NAME"),
    signature,
    timestamp,
    expires_at,
    folder: params.folder,
    public_id: params.public_id,
    resource_type: params.resource_type ?? "auto",
    type: params.type ?? "authenticated",
    allowed_formats: params.allowed_formats,
  };
}

export async function uploadProfileImage(params: { uid: string; buffer: Buffer; contentType?: string }) {
  const cld = getCloudinary();
  const publicId = `user_${params.uid}`;

  type CloudinaryResult = {
    secure_url?: unknown;
    version?: unknown;
  };

  return new Promise<{ secure_url: string; version: number }>((resolve, reject) => {
    const stream = cld.uploader.upload_stream(
      {
        folder: "user_profiles",
        public_id: publicId,
        overwrite: true,
        invalidate: true,
        resource_type: "image",
      },
      (err, result) => {
        if (err) return reject(err);
        const r = (result || null) as CloudinaryResult | null;
        const url = typeof r?.secure_url === "string" ? r.secure_url.trim() : "";
        if (!url) return reject(new Error("Upload failed"));
        const version = typeof r?.version === "number" ? r.version : Number(r?.version);
        resolve({ secure_url: url, version: Number.isFinite(version) && version > 0 ? version : Date.now() });
      },
    );
    stream.end(params.buffer);
  });
}

export async function uploadKycDocument(params: {
  uid: string;
  buffer: Buffer;
  fileName: string;
  contentType?: string;
  documentType: "id_front" | "id_back" | "passport" | "proof_of_address" | "other";
}) {
  const cld = getCloudinary();
  const publicId = `${params.uid}_${params.documentType}`;
  const resourceType =
    params.contentType && params.contentType.startsWith("image/")
      ? "image"
      : params.contentType === "application/pdf"
        ? "raw"
        : "auto";

  type CloudinaryResult = {
    secure_url?: unknown;
    version?: unknown;
    format?: unknown;
    bytes?: unknown;
  };

  return new Promise<{ secure_url: string; version: number; format: string; bytes: number }>(
    (resolve, reject) => {
      const stream = cld.uploader.upload_stream(
        {
          folder: "user_kyc",
          public_id: publicId,
          overwrite: true,
          invalidate: true,
          resource_type: resourceType,
          type: "authenticated",
        },
        (err, result) => {
          if (err) return reject(err);
          const r = (result || null) as CloudinaryResult | null;
          const url = typeof r?.secure_url === "string" ? r.secure_url.trim() : "";
          if (!url) return reject(new Error("Upload failed"));
          const version = typeof r?.version === "number" ? r.version : Number(r?.version);
          const format = typeof r?.format === "string" ? r.format : "";
          const bytes = typeof r?.bytes === "number" ? r.bytes : 0;
          resolve({
            secure_url: url,
            version: Number.isFinite(version) && version > 0 ? version : Date.now(),
            format,
            bytes,
          });
        },
      );
      stream.end(params.buffer);
    },
  );
}
