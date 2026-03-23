"use client";

import { useEffect, useRef, useState } from "react";
import { CameraIcon } from "@heroicons/react/24/outline";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { auth, db, uploadUserProfileImage } from "@/lib/firebase";
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
    if (!user) {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;
      onChange(url);
      return;
    }

    try {
      setUploading(true);
      const url = await uploadUserProfileImage({ uid: user.uid, file });
      onChange(url);

      try {
        await setDoc(
          doc(db, "users", user.uid),
          { photoURL: url, updatedAt: serverTimestamp() },
          { merge: true },
        );
      } catch (e) {
        console.error("Failed to persist photoURL to Firestore:", e);
      }

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
      {!auth.currentUser && (
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Paste image URL"
          className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      )}
    </div>
  );
};

export default ImageUpload;
