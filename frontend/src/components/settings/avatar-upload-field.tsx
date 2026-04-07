import { useEffect, useMemo, useRef } from "react";
import { Camera, ImagePlus, RefreshCcw } from "lucide-react";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

export function AvatarUploadField({
  currentAvatarUrl,
  displayName,
  selectedFile,
  onFileSelect,
  error,
  disabled
}: {
  currentAvatarUrl: string | null;
  displayName: string;
  selectedFile: File | null;
  onFileSelect: (file: File | null, error?: string | null) => void;
  error?: string | null;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const previewUrl = useMemo(() => {
    if (selectedFile) {
      return URL.createObjectURL(selectedFile);
    }

    return currentAvatarUrl;
  }, [currentAvatarUrl, selectedFile]);

  useEffect(() => {
    return () => {
      if (selectedFile && previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl, selectedFile]);

  useEffect(() => {
    if (!selectedFile && inputRef.current) {
      inputRef.current.value = "";
    }
  }, [selectedFile]);

  const handleSelect = (file: File | null) => {
    if (!file) {
      onFileSelect(null, null);
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      onFileSelect(null, "Select a PNG, JPG, or WebP image.");
      return;
    }

    onFileSelect(file, null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <UserAvatar
          avatarUrl={previewUrl}
          displayName={displayName || "Creator avatar"}
          className="h-24 w-24 shrink-0"
        />

        <div className="min-w-0 space-y-2">
          <div>
            <p className="text-sm font-medium text-slate-100">Profile image</p>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              Upload a square or portrait image to represent your public creator identity.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="sr-only"
              onChange={(event) => handleSelect(event.target.files?.[0] || null)}
              disabled={disabled}
            />
            <Button
              type="button"
              variant="secondary"
              className="gap-2"
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
            >
              {previewUrl ? <RefreshCcw className="h-4 w-4" /> : <ImagePlus className="h-4 w-4" />}
              {previewUrl ? "Replace image" : "Upload avatar"}
            </Button>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-slate-400">
              <Camera className="h-3.5 w-3.5 text-sky-200" />
              {selectedFile ? selectedFile.name : previewUrl ? "Current image ready" : "No image uploaded"}
            </span>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "rounded-[22px] border p-4 text-sm leading-6",
          error
            ? "border-rose-300/18 bg-rose-300/[0.07] text-rose-100"
            : "border-white/10 bg-black/20 text-slate-400"
        )}
      >
        {error
          ? error
          : "PNG, JPG, or WebP up to 5MB. The stored avatar still resolves to an internal URL behind the scenes."}
      </div>
    </div>
  );
}
