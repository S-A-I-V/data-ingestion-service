import { cn } from "../lib/utils";

/**
 * Langfuse Left Sidebar — exact replica with corner hover effects.
 * Fixed position, shows Community Stats, Changelog, Self Hosting Guides.
 */

const COMMUNITY_STATS = [
  { label: "Internal Teams", value: "50+", href: "#" },
  { label: "Connectors", value: "30+", href: "#" },
  { label: "Pipelines Active", value: "200+", href: "#" },
  { label: "Rows/month", value: "10M+", href: "#" },
  { label: "Latest release", value: "today", href: "#" },
];

const CHANGELOG_ITEMS = [
  { label: "Report Health Dashboard", date: "2 days ago", href: "#" },
  { label: "Client Onboarding Workflow", date: "6 days ago", href: "#" },
  { label: "AI Query Assistant", date: "6 days ago", href: "#" },
];

const HOSTING_GUIDES = [
  { label: "Docker Compose", href: "#" },
  { label: "Kubernetes (Helm)", href: "#" },
  { label: "AWS (Terraform)", href: "#" },
  { label: "GCP (Terraform)", href: "#" },
  { label: "Azure (Terraform)", href: "#" },
];

const CORNER_MASK = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8' fill='none'%3E%3Cpath d='M8 0V1H3C1.89543 1 1 1.89543 1 3V8H0V0H8Z' fill='black'/%3E%3C/svg%3E"),url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8' fill='none'%3E%3Cpath d='M8 8V7H3C1.89543 7 1 6.10457 1 5V0H0V8H8Z' fill='black'/%3E%3C/svg%3E"),url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8' fill='none'%3E%3Cpath d='M0 8V7H5C6.10457 7 7 6.10457 7 5V0H8V8H0Z' fill='black'/%3E%3C/svg%3E"),url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8' fill='none'%3E%3Cpath d='M0 0V1H5C6.10457 1 7 1.89543 7 3V8H8V0H0Z' fill='black'/%3E%3C/svg%3E")`;

function CornerHoverEffect() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-10">
      <span
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-100 ease-in-out bg-[#404039]"
        style={{
          maskImage: CORNER_MASK,
          WebkitMaskImage: CORNER_MASK,
          maskPosition: "0px 0px, 0px 100%, 100% 100%, 100% 0px",
          WebkitMaskPosition: "0px 0px, 0px 100%, 100% 100%, 100% 0px",
          maskSize: "8px 8px",
          WebkitMaskSize: "8px 8px",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
        }}
      />
    </span>
  );
}

function SidebarItem({
  label,
  value,
  date,
  href,
  className,
}: {
  label: string;
  value?: string;
  date?: string;
  href: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={cn(
        "group relative block w-full px-2 py-1.5 transition-colors hover:bg-neutral-100/50 no-underline",
        className,
      )}
    >
      <CornerHoverEffect />
      <div className={cn("flex w-full items-center justify-between gap-2", date && "flex-col items-start gap-1.5")}>
        <span className="font-sans text-[13px] font-normal leading-[1.2] tracking-[-0.02em] text-neutral-500 group-hover:text-neutral-900">
          {label}
        </span>
        {value && (
          <span className="shrink-0 font-sans text-[13px] font-normal leading-[1.2] tracking-[-0.02em] text-neutral-400 group-hover:text-neutral-900 tabular-nums">
            {value}
          </span>
        )}
        {date && (
          <span className="font-mono text-[10px] font-normal leading-none tracking-[-0.02em] text-neutral-400 group-hover:text-neutral-900">
            {date}
          </span>
        )}
      </div>
    </a>
  );
}

function SectionHeader({
  title,
  showViewAll,
  viewAllHref = "#",
}: {
  title: string;
  showViewAll?: boolean;
  viewAllHref?: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between px-2">
      <h2 className="font-sans text-[13px] font-medium leading-[1.2] tracking-[-0.02em] text-neutral-900">{title}</h2>
      {showViewAll && (
        <a
          href={viewAllHref}
          className="font-mono text-[10px] font-normal tracking-[-0.02em] text-neutral-400 underline underline-offset-2 transition-colors hover:text-neutral-900 no-underline"
        >
          View All
        </a>
      )}
    </div>
  );
}

export default function LangfuseSidebar() {
  return (
    <nav
      className="flex h-full w-full flex-col overflow-y-auto overflow-x-hidden"
      style={{
        display: "grid",
        gridTemplateRows: "repeat(4, 1fr)",
        gap: "var(--sidebar-card-margin)",
        padding: "var(--sidebar-card-margin)",
      }}
    >
      {/* Community Stats */}
      <div className="sidebar-card">
        <div className="px-2 py-4">
          <SectionHeader title="Community Stats" />
          <div className="flex flex-col gap-[2px]">
            {COMMUNITY_STATS.map((item) => (
              <SidebarItem key={item.label} label={item.label} value={item.value} href={item.href} />
            ))}
          </div>
        </div>
      </div>

      {/* Changelog */}
      <div className="sidebar-card">
        <div className="px-2 py-4">
          <SectionHeader title="Changelog" showViewAll />
          <div className="flex flex-col gap-2">
            {CHANGELOG_ITEMS.map((item) => (
              <SidebarItem key={item.label} label={item.label} date={item.date} href={item.href} />
            ))}
          </div>
        </div>
      </div>

      {/* Self Hosting Guides */}
      <div className="sidebar-card">
        <div className="px-2 py-4">
          <SectionHeader title="Self Hosting Guides" />
          <div className="flex flex-col gap-[2px]">
            {HOSTING_GUIDES.map((item) => (
              <SidebarItem key={item.label} label={item.label} href={item.href} />
            ))}
          </div>
        </div>
      </div>

      {/* Empty placeholder card */}
      <div className="sidebar-card">
        <div className="px-2 py-4"></div>
      </div>

      {/* Bottom spacing */}
    </nav>
  );
}
