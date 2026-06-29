import Link from "next/link";

type DemoContinueLinkProps = {
  href: string;
  label: string;
  description?: string;
};

export function DemoContinueLink({ href, label, description }: DemoContinueLinkProps) {
  return (
    <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-stone-200 pt-6">
      <Link
        href={href}
        className="inline-flex items-center justify-center rounded-full bg-amber-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700"
      >
        {label}
      </Link>
      {description ? <p className="text-sm text-stone-500">{description}</p> : null}
    </div>
  );
}
