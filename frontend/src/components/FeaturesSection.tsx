import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { BentoGrid, BentoCard } from "./ui/BentoGrid";
import { ConnectorMarquee } from "./bento/ConnectorMarquee";
import { IngestionPulse } from "./bento/IngestionPulse";
import IconCloud from "./bento/IconCloud";
import { SqlPreview } from "./bento/SqlPreview";

gsap.registerPlugin(ScrollTrigger);

/** Database icons for the 3D cloud — uses local icons from /images/db-icons/ */
const DB_CLOUD_ICONS = [
  "/images/db-icons/postgresql.png",
  "/images/db-icons/mysql.png",
  "/images/db-icons/clickhouse.png",
  "/images/db-icons/snowflake.png",
  "/images/db-icons/bigquery.png",
  "/images/db-icons/oracle.png",
  "/images/db-icons/mssql.png",
  "/images/db-icons/mariadb.png",
  "/images/db-icons/elasticsearch.png",
  "/images/db-icons/hive.png",
  "/images/db-icons/spark.png",
  "/images/db-icons/db2.png",
  "/images/db-icons/sybase.png",
  "/images/db-icons/vertica.png",
  "/images/db-icons/duckdb.png",
  "/images/db-icons/cockroachdb.png",
  "/images/db-icons/trino.png",
  "/images/db-icons/athena.png",
  "/images/db-icons/csv.png",
  "/images/db-icons/firebird.png",
  "/images/db-icons/greenplum.png",
  "/images/db-icons/presto.png",
  "/images/db-icons/teradata.png",
  "/images/db-icons/tidb.png",
];

function DatabaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v4c0 1.657 4.03 3 9 3s9-1.343 9-3V5" />
      <path d="M3 9v4c0 1.657 4.03 3 9 3s9-1.343 9-3V9" />
      <path d="M3 13v4c0 1.657 4.03 3 9 3s9-1.343 9-3v-4" />
    </svg>
  );
}

function BoltIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
    </svg>
  );
}

function CodeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

const FEATURES = [
  {
    Icon: DatabaseIcon,
    name: "30+ Connectors",
    description: "Connect to any database — SQL, NoSQL, cloud warehouses, and file formats out of the box.",
    className: "bento-card--tall",
    background: <ConnectorMarquee />,
  },
  {
    Icon: BoltIcon,
    name: "Real-time Ingestion",
    description: "Monitor live data pipelines with row-level status, error tracking, and auto-retry.",
    className: "bento-card--short",
    background: <IngestionPulse />,
  },
  {
    Icon: CodeIcon,
    name: "SQL-first Interface",
    description: "Write raw SQL or let the engine generate it. Full control, no black boxes.",
    className: "bento-card--short",
    background: <SqlPreview />,
  },
  {
    Icon: ShareIcon,
    name: "Data Ecosystem",
    description: "Seamlessly integrate with your entire data stack — from legacy Sybase to modern cloud warehouses.",
    className: "bento-card--tall",
    background: <IconCloud images={DB_CLOUD_ICONS} radius={100} iconSize={32} />,
  },
];

export default function FeaturesSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const heading = sectionRef.current?.querySelector(".features-heading");
      if (heading) {
        gsap.from(heading, {
          y: 48,
          opacity: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: heading,
            start: "top 88%",
            toggleActions: "play none none none",
          },
        });
      }
    },
    { scope: sectionRef },
  );

  return (
    <section className="features-section" ref={sectionRef}>
      <h2 className="features-heading">BUILT FOR SCALE</h2>
      <BentoGrid>
        {FEATURES.map((f, i) => (
          <BentoCard key={i} {...f} />
        ))}
      </BentoGrid>
    </section>
  );
}
