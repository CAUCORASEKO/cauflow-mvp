import { getAssetImageUrl } from "@/services/api";
import { cn } from "@/lib/utils";

export const getUserInitials = (value: string) =>
  value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "CF";

export function UserAvatar({
  avatarUrl,
  displayName,
  className,
  imageClassName,
  fallbackClassName
}: {
  avatarUrl: string | null;
  displayName: string;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
}) {
  const resolvedAvatarUrl = getAssetImageUrl(avatarUrl);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] shadow-[0_18px_40px_rgba(2,8,23,0.22)]",
        className
      )}
    >
      {resolvedAvatarUrl ? (
        <img
          src={resolvedAvatarUrl}
          alt={displayName || "User avatar"}
          className={cn("h-full w-full object-cover", imageClassName)}
        />
      ) : (
        <div
          className={cn(
            "flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-xl font-semibold text-sky-100",
            fallbackClassName
          )}
        >
          {getUserInitials(displayName)}
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-slate-950/80 to-transparent" />
    </div>
  );
}
