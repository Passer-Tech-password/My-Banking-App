"use client";

import { useEffect, useRef, useState } from "react";
import { CameraIcon } from "@heroicons/react/24/outline";
import { updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useToast } from "@/components/ToastProvider";

interface ImageUploadProps {
  value: string;
  onChange: (src: string) => void;
  disabled?: boolean;
  onFileSelected?: (file: File | null) => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  disabled,
  onFileSelected,
}) => {
  const toast = useToast();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  const handlePick = () => {
    if (disabled || uploading) return;
    inputRef.current?.click();
  };

  const handleFile = async (file: File | null) => {
    onFileSelected?.(file);
    if (!file) return;

    const user = auth.currentUser;
    if (!user) return;

    try {
      setUploading(true);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      const previewUrl = URL.createObjectURL(file);
      objectUrlRef.current = previewUrl;
      onChange(previewUrl);

      const idToken = await user.getIdToken();
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/upload/profile-image", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
        body: form,
      });
      const raw = await res.text();
      const data = (() => {
        try {
          return raw ? JSON.parse(raw) : null;
        } catch {
          return null;
        }
      })() as any;
      if (!res.ok) {
        const msg = String(data?.message || raw || "Upload failed");
        toast.error(msg);
        return;
      }
      const url = String(data?.url || "").trim();
      if (!url) {
        toast.error("Upload failed");
        return;
      }
      const photoVersion = Number(data?.photoVersion || Date.now());
      const versionedUrl = `${url}${url.includes("?") ? "&" : "?"}v=${encodeURIComponent(String(photoVersion))}`;
      onChange(versionedUrl);

      try {
        if (user.photoURL !== url) {
          await updateProfile(user, { photoURL: url });
        }
      } catch (e) {
        console.error("Failed to persist photoURL to Firebase Auth profile:", e);
      }

      toast.success("Profile image updated");
    } catch (e) {
      console.error("Image upload failed:", e);
      const msg = e instanceof Error ? e.message : "Upload failed";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const Avatar = ({ onClick }: { onClick?: () => void }) => (
    <div
      onClick={disabled ? undefined : onClick}
      className={`relative transition group ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:opacity-70"}`}
    >
      <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
        {value ? (
          <img style={{ objectFit: "cover" }} className="w-full h-full" alt="Upload" src={value} />
        ) : (
          <CameraIcon className="w-8 h-8 text-gray-400" />
        )}
      </div>
      {!disabled && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-white text-xs font-medium">{uploading ? "Uploading..." : "Change"}</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col items-start gap-2">
      <Avatar onClick={handlePick} />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFile(e.target.files?.[0] || null)}
        disabled={disabled || uploading}
        className="hidden"
      />
    </div>
  );
};

export default ImageUpload;
