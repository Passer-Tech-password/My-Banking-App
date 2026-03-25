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

export async function uploadProfileImage(params: { uid: string; buffer: Buffer; contentType?: string }) {
  const cld = getCloudinary();
  const publicId = `user_${params.uid}`;

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
        const url = String((result as any)?.secure_url || "").trim();
        if (!url) return reject(new Error("Upload failed"));
        const version = Number((result as any)?.version || 0);
        resolve({ secure_url: url, version: Number.isFinite(version) && version > 0 ? version : Date.now() });
      },
    );
    stream.end(params.buffer);
  });
}
