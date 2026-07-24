import { Link } from "react-router-dom";

/**
 * Decorative corner marks — SVG mask pattern for bracketed card effect.
 */
const DecorativeCorners = () => {
  const cornerMask = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8' fill='none'%3E%3Cpath d='M8 0V1H3C1.89543 1 1 1.89543 1 3V8H0V0H8Z' fill='black'/%3E%3C/svg%3E"), url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8' fill='none'%3E%3Cpath d='M8 8V7H3C1.89543 7 1 6.10457 1 5V0H0V8H8Z' fill='black'/%3E%3C/svg%3E"), url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8' fill='none'%3E%3Cpath d='M0 8V7H5C6.10457 7 7 6.10457 7 5V0H8V8H0Z' fill='black'/%3E%3C/svg%3E"), url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8' fill='none'%3E%3Cpath d='M0 0V1H5C6.10457 1 7 1.89543 7 3V8H8V0H0Z' fill='black'/%3E%3C/svg%3E")`;

  return (
    <span
      className="pointer-events-none absolute -inset-px z-10"
      style={{
        backgroundColor: "rgb(64, 64, 57)",
        maskImage: cornerMask,
        WebkitMaskImage: cornerMask,
        maskPosition: "0px 0px, 0px 100%, 100% 100%, 100% 0px",
        WebkitMaskPosition: "0px 0px, 0px 100%, 100% 100%, 100% 0px",
        maskSize: "8px 8px",
        WebkitMaskSize: "8px 8px",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
      }}
    />
  );
};

const SOCIAL_LINKS = [
  {
    name: "GitHub",
    href: "https://github.com/S-A-I-V/data-ingestion-service",
    icon: (
      <svg width="17" height="17" viewBox="0 0 17 17" fill="currentColor">
        <path d="M6.88863 11.9076C4.78863 11.6448 3.30909 10.0845 3.30909 8.06433C3.30909 7.24312 3.59545 6.35621 4.07273 5.76493C3.8659 5.22292 3.89772 4.07322 4.13636 3.59693C4.77273 3.5148 5.63182 3.85972 6.14091 4.33601C6.74545 4.13892 7.38182 4.04037 8.16136 4.04037C8.94091 4.04037 9.57727 4.13892 10.15 4.3196C10.6432 3.85972 11.5182 3.5148 12.1545 3.59693C12.3773 4.04037 12.4091 5.19007 12.2023 5.7485C12.7114 6.37262 12.9818 7.21027 12.9818 8.06433C12.9818 10.0845 11.5023 11.612 9.37045 11.8912C9.91136 12.2525 10.2773 13.0409 10.2773 13.9442V15.6524C10.2773 16.145 10.675 16.4243 11.1523 16.2272C14.0318 15.0939 16.2909 12.1211 16.2909 8.44208C16.2909 3.79402 12.6318 0 8.12954 0C3.62727 0 0 3.794 0 8.44208C0 12.0883 2.24317 15.1103 5.2659 16.2437C5.69545 16.4078 6.10909 16.1123 6.10909 15.6689V14.3548C5.88636 14.4534 5.6 14.5191 5.34545 14.5191C4.29545 14.5191 3.67499 13.9278 3.22954 12.8274C3.05455 12.3839 2.86364 12.1211 2.49772 12.0719C2.30681 12.0554 2.24317 11.9733 2.24317 11.8748C2.24317 11.6777 2.56136 11.5298 2.87954 11.5298C3.34091 11.5298 3.73863 11.8255 4.15226 12.4332C4.47045 12.9095 4.80455 13.123 5.20226 13.123C5.6 13.123 5.85455 12.9752 6.22045 12.5974C6.49091 12.3182 6.69772 12.0719 6.88863 11.9076Z" />
      </svg>
    ),
  },
  {
    name: "X",
    href: "#",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
        <path d="M13.4372 0.798828H16.0544L10.3379 7.34928L17.0633 16.2631H11.798L7.67381 10.8559L2.95454 16.2631H0.336282L6.45053 9.25618L-0.000732422 0.798828H5.39896L9.12638 5.73993L13.4372 0.798828ZM12.52 14.6932H13.9704L4.60975 2.2866H3.05479L12.52 14.6932Z" />
      </svg>
    ),
  },
  {
    name: "LinkedIn",
    href: "#",
    icon: (
      <svg viewBox="0 0 448 512" fill="currentColor" height="1em" width="1em">
        <path d="M100.28 448H7.4V148.9h92.88zM53.79 108.1C24.09 108.1 0 83.5 0 53.8a53.79 53.79 0 01107.58 0c0 29.7-24.1 54.3-53.79 54.3zM447.9 448h-92.68V302.4c0-34.7-.7-79.2-48.29-79.2-48.29 0-55.69 37.7-55.69 76.7V448h-92.78V148.9h89.08v40.8h1.3c12.4-23.5 42.69-48.3 87.83-48.3 93.97 0 111.28 61.9 111.28 142.3V448z" />
      </svg>
    ),
  },
];

const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      { name: "Database Connections", href: "/connections" },
      { name: "Data Transfer", href: "/ingest" },
      { name: "Audit Log", href: "/audit" },
      { name: "Report Health", href: "/admin/report-health" },
      { name: "Report Mapping", href: "/admin/report-mapping" },
      { name: "Client Onboarding", href: "/admin/client-onboarding" },
    ],
  },
  {
    title: "Developers",
    links: [
      { name: "Documentation", href: "/home" },
      { name: "Self-Hosting", href: "/home" },
      { name: "Connectors", href: "/home" },
      { name: "API Reference", href: "/home" },
      { name: "Status", href: "/home" },
      { name: "Talk to Us", href: "/home" },
    ],
  },
  {
    title: "Resources",
    links: [
      { name: "Changelog", href: "/home" },
      { name: "Roadmap", href: "/home" },
      { name: "Email Discrepancy", href: "/admin/email-discrepancy" },
      { name: "Associate Lookup", href: "/admin/associate-lookup" },
      { name: "Guides", href: "/home" },
    ],
  },
  {
    title: "Company",
    links: [
      { name: "About Us", href: "/home" },
      { name: "Privacy", href: "/privacy" },
      { name: "Terms", href: "/terms" },
      { name: "Security", href: "/home" },
      { name: "Support", href: "/home" },
    ],
  },
];

const LEGAL_LINKS = [
  { name: "Terms", href: "/terms" },
  { name: "Privacy", href: "/privacy" },
];

export default function AppFooter() {
  return (
    <footer className="mx-auto mt-16 w-full pb-8 bg-[#F6F6F3]">
      {/* Social Section */}
      <div className="relative mb-[-1px] flex items-center gap-5 border border-[#E5E5E0] p-4 bg-transparent">
        <DecorativeCorners />
        {SOCIAL_LINKS.map((social) => (
          <a
            key={social.name}
            href={social.href}
            target={social.href.startsWith("http") ? "_blank" : undefined}
            rel={social.href.startsWith("http") ? "noopener noreferrer" : undefined}
            aria-label={social.name}
            className="text-neutral-500 transition-colors hover:text-neutral-900"
          >
            <span className="block w-5 h-5">{social.icon}</span>
          </a>
        ))}
      </div>

      {/* Main Links Section */}
      <div className="relative flex flex-col border border-[#E5E5E0] bg-transparent">
        <DecorativeCorners />
        <div className="grid grid-cols-2 items-stretch justify-between gap-8 p-4 md:flex md:flex-row">
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title} className="flex flex-col gap-4">
              <p className="font-mono text-[13px] font-medium text-neutral-400">{column.title}</p>
              <ul className="flex flex-col gap-3">
                {column.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className="text-neutral-600 transition-colors hover:text-neutral-900 no-underline"
                    >
                      <p className="font-sans text-[13px] font-normal leading-[150%] tracking-[-0.26px]">{link.name}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Legal Links Bar */}
      <div className="relative mt-[-1px] flex flex-col border border-[#E5E5E0] bg-transparent">
        <DecorativeCorners />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {LEGAL_LINKS.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className="text-neutral-500 transition-colors hover:text-neutral-900 no-underline"
              >
                <p className="font-mono text-[13px] font-normal leading-[150%] tracking-[-0.26px]">{link.name}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Copyright */}
      <div className="relative mt-[-1px] flex flex-col justify-between gap-y-4 border border-[#E5E5E0] p-4 py-2.5 bg-transparent sm:flex-row sm:items-center">
        <DecorativeCorners />
        <p className="font-mono text-[13px] font-normal text-neutral-400">
          &copy; 2024–{new Date().getFullYear()} NFC Team
        </p>
        <p className="font-mono text-[13px] font-normal text-neutral-400">
          Design by{" "}
          <span className="text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer">
            NFC Engineering
          </span>
        </p>
      </div>
    </footer>
  );
}
