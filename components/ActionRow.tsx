import Link from "next/link";
import type { LucideIcon } from "lucide-react";

/** A large shortcut row: title and one-line description, with a brass action disc. */
export default function ActionRow({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description?: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-16 items-center gap-3 rounded-2xl bg-surface-muted px-4 py-3 transition-colors duration-150 ease-brand hover:bg-gray-200/70"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold text-gray-900">
          {title}
        </p>
        {description && (
          <p className="truncate text-xs text-gray-600">{description}</p>
        )}
      </div>
      <span
        aria-hidden
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-colors duration-150 ease-brand group-hover:bg-secondary-600"
      >
        <Icon className="h-5 w-5" />
      </span>
    </Link>
  );
}
