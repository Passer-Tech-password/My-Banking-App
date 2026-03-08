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
    onChange(result.info.secure_url);
  };

  return (
    <CldUploadWidget 
      onUpload={onUpload} 
      uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET}
      options={{
        maxFiles: 1
      }}
    >
      {({ open }) => {
        const onClick = () => {
          open();
        };

        return (
          <div onClick={onClick} className="relative cursor-pointer hover:opacity-70 transition group">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
              {value ? (
                <img
                  style={{ objectFit: "cover" }}
                  className="w-full h-full"
                  alt="Upload"
                  src={value}
                />
              ) : (
                <CameraIcon className="w-8 h-8 text-gray-400" />
              )}
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-white text-xs font-medium">Change</span>
            </div>
          </div>
        );
      }}
    </CldUploadWidget>
  );
};

export default ImageUpload;
