
"use client";

import { useState } from "react";
import Link from "next/link";
import { Pill } from "lucide-react";

interface MedicineImageGalleryProps {
  imageUrls: string[];
  medicineName: string;
  categoryName: string;
  detailsHref: string;
  variant?: "store" | "details";
}

export default function MedicineImageGallery({
  imageUrls,
  medicineName,
  categoryName,
  detailsHref,
  variant = "store",
}: MedicineImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState(0);
  const currentImage = imageUrls[selectedImage];
  const isDetails = variant === "details";

  return (
    <div className={isDetails ? "flex h-full min-h-[500px] flex-col" : ""}>
      <Link
        href={detailsHref}
        aria-label={`View details for ${medicineName}`}
        className={`group/image relative grid place-items-center overflow-hidden bg-gradient-to-br from-[#E9F7F5] via-[#F4FAFA] to-[#EDF2F8] ${
          isDetails ? "min-h-[400px] flex-1" : "h-44"
        }`}
      >
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/60 transition duration-500 group-hover/image:scale-125" />

        {currentImage ? (
          <img
            src={currentImage}
            alt={medicineName}
            className={`relative z-10 h-full w-full object-contain transition duration-300 group-hover/image:scale-[1.02] ${
              isDetails ? "p-5" : "p-3"
            }`}
          />
        ) : (
          <div className="relative z-10 grid h-20 w-20 place-items-center rounded-2xl border border-white bg-white/90 text-[#0D9488] shadow-sm">
            <Pill size={39} strokeWidth={1.5} />
          </div>
        )}

        <span className="absolute bottom-3 left-3 z-20 rounded-full border border-white/80 bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-[#0D9488]">
          {categoryName}
        </span>

        {imageUrls.length > 1 && (
          <span className="absolute right-3 top-3 z-20 rounded-full bg-[#0B1F3A]/80 px-2.5 py-1 text-[10px] font-bold text-white">
            {selectedImage + 1}/{imageUrls.length}
          </span>
        )}
      </Link>

      {imageUrls.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-100 bg-white px-3 py-2.5">
          {imageUrls.map((url, index) => (
            <button
              key={url}
              type="button"
              onClick={() => setSelectedImage(index)}
              aria-label={`View image ${index + 1} of ${medicineName}`}
              aria-pressed={selectedImage === index}
              className={`h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 bg-slate-50 transition ${
                selectedImage === index
                  ? "border-[#0D9488] ring-2 ring-teal-100"
                  : "border-slate-200 hover:border-teal-300"
              }`}
            >
              <img
                src={url}
                alt={`${medicineName} image ${index + 1}`}
                className="h-full w-full object-contain p-1"
              />
            </button>
          ))}

          <span className="ml-auto shrink-0 text-[10px] font-medium text-slate-400">
            {imageUrls.length} images
          </span>
        </div>
      )}
    </div>
  );
}
