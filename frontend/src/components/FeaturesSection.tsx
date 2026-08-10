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

import Highlight from "./ui/Highlight";

/** Database icons for the 3D cloud — use CDN URLs since MAF doesn't serve static assets */
const DB_CLOUD_ICONS = [
  "https://www.vectorlogo.zone/logos/postgresql/postgresql-icon.svg",
  "https://www.vectorlogo.zone/logos/mysql/mysql-icon.svg",
  "https://www.vectorlogo.zone/logos/snowflake/snowflake-icon.svg",
  "https://www.vectorlogo.zone/logos/google_bigquery/google_bigquery-icon.svg",
  "https://www.vectorlogo.zone/logos/oracle/oracle-icon.svg",
  "https://www.vectorlogo.zone/logos/microsoft/microsoft-icon.svg",
  "https://www.vectorlogo.zone/logos/mariadb/mariadb-icon.svg",
  "https://www.vectorlogo.zone/logos/elastic/elastic-icon.svg",
  "https://www.vectorlogo.zone/logos/apache_hive/apache_hive-icon.svg",
  "https://www.vectorlogo.zone/logos/apache_spark/apache_spark-icon.svg",
  "https://www.vectorlogo.zone/logos/mongodb/mongodb-icon.svg",
  "https://www.vectorlogo.zone/logos/redis/redis-icon.svg",
  "https://www.vectorlogo.zone/logos/apache_kafka/apache_kafka-icon.svg",
  "https://www.vectorlogo.zone/logos/amazon_aws/amazon_aws-icon.svg",
  "https://www.vectorlogo.zone/logos/databricks/databricks-icon.svg",
  "https://www.vectorlogo.zone/logos/sqlite/sqlite-icon.svg",
  "https://www.vectorlogo.zone/logos/apache_cassandra/apache_cassandra-icon.svg",
  "https://www.vectorlogo.zone/logos/google_cloud/google_cloud-icon.svg",
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
          y: 24,
          opacity: 0,
          duration: 0.6,
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
      <h2 className="text-[32px] font-medium text-[#20201D] mb-10">
        Works with <Highlight>any data stack.</Highlight>
      </h2>
      <BentoGrid>
        {FEATURES.map((f, i) => (
          <BentoCard key={i} {...f} />
        ))}
      </BentoGrid>
    </section>
  );
}
