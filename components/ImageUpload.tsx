"use client";

import { CldUploadWidget } from "next-cloudinary";
import { CameraIcon } from "@heroicons/react/24/outline";

interface ImageUploadProps {
  value: string;
  onChange: (src: string) => void;
  disabled?: boolean;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  disabled
}) => {
  const onUpload = (result: any) => {
    const url = String(result?.info?.secure_url || result?.info?.url || "").trim();
    if (url) onChange(url);
  };

  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const configured = !!uploadPreset && !!cloudName;

  const Avatar = ({ onClick }: { onClick?: () => void }) => (
    <div
      onClick={disabled ? undefined : onClick}
      className={`relative transition group ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:opacity-70"}`}
    >
      <div className={`w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-2 border-dashed flex items-center justify-center ${configured ? "border-gray-300" : "border-red-300"}`}>
        {value ? (
          <img style={{ objectFit: "cover" }} className="w-full h-full" alt="Upload" src={value} />
        ) : (
          <CameraIcon className={`w-8 h-8 ${configured ? "text-gray-400" : "text-red-400"}`} />
        )}
      </div>
      {!disabled && configured && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-white text-xs font-medium">Change</span>
        </div>
      )}
    </div>
  );

  if (!configured) {
    return (
      <div className="flex flex-col items-start gap-2">
        <Avatar />
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Paste image URL"
          className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
    );
  }

  return (
    <CldUploadWidget
      onUpload={onUpload}
      uploadPreset={uploadPreset}
      options={{
        maxFiles: 1,
      }}
    >
      {({ open }) => <Avatar onClick={() => open()} />}
    </CldUploadWidget>
  );
};

export default ImageUpload;
