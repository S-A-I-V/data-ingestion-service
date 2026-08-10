import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, ArrowUpRight, ShieldCheck, Globe } from "lucide-react";
import CornerBox from "../components/ui/CornerBox";
import Highlight from "../components/ui/Highlight";
import Chip from "../components/ui/Chip";
import AccordionItem from "../components/ui/AccordionItem";
import AppFooter from "../components/AppFooter";
import InfoSidebar from "../components/InfoSidebar";
import FeaturesSection from "../components/FeaturesSection";
import ProblemsSection from "../components/ProblemsSection";

interface Props {
  isAuthenticated: boolean;
}

const DB_LOGOS = [
  { name: "PostgreSQL", icon: "https://www.vectorlogo.zone/logos/postgresql/postgresql-ar21.svg" },
  { name: "Snowflake", icon: "https://www.vectorlogo.zone/logos/snowflake/snowflake-ar21.svg" },
  { name: "Apache Spark", icon: "https://www.vectorlogo.zone/logos/apache_spark/apache_spark-ar21.svg" },
  { name: "BigQuery", icon: "https://www.vectorlogo.zone/logos/google_bigquery/google_bigquery-ar21.svg" },
  { name: "Oracle", icon: "https://www.vectorlogo.zone/logos/oracle/oracle-ar21.svg" },
  { name: "Databricks", icon: "https://www.vectorlogo.zone/logos/databricks/databricks-ar21.svg" },
  { name: "MySQL", icon: "https://www.vectorlogo.zone/logos/mysql/mysql-ar21.svg" },
  { name: "MongoDB", icon: "https://www.vectorlogo.zone/logos/mongodb/mongodb-ar21.svg" },
  { name: "Redis", icon: "https://www.vectorlogo.zone/logos/redis/redis-ar21.svg" },
  { name: "Elasticsearch", icon: "https://www.vectorlogo.zone/logos/elastic/elastic-ar21.svg" },
  { name: "Apache Kafka", icon: "https://www.vectorlogo.zone/logos/apache_kafka/apache_kafka-ar21.svg" },
  { name: "AWS", icon: "https://www.vectorlogo.zone/logos/amazon_aws/amazon_aws-ar21.svg" },
];

const FAQS = [
  {
    q: "What is NFC Data Hub?",
    a: "NFC Data Hub is an open-source data engineering platform that helps teams connect, transfer, and monitor data across 30+ databases. It covers the full pipeline lifecycle with connections, ingestion, audit trails, and report health dashboards.",
  },
  {
    q: "What databases are supported?",
    a: "We support 30+ connectors including PostgreSQL, MySQL, Snowflake, BigQuery, ClickHouse, Oracle, Databricks, Vertica, Teradata, Elasticsearch, DuckDB, and many more.",
  },
  {
    q: "Can I use just connections without data transfer?",
    a: "Yes, NFC Data Hub is modular. You can start with database connections and add data transfer, audit logging, or report health monitoring whenever you are ready.",
  },
  {
    q: "What deployment options exist?",
    a: "You can use our hosted version or self-host via Docker Compose, Kubernetes (Helm), or Terraform templates for AWS, GCP, and Azure.",
  },
  { q: "Is self-hosting free?", a: "Yes, the platform is open source and free to self-host at any scale." },
];

const TOC_SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "platform-features", label: "Platform features" },
  { id: "connectors", label: "Connectors" },
  { id: "get-started", label: "Get Started" },
  { id: "faq", label: "FAQ" },
];

export default function Home({ isAuthenticated }: Props) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [activeSection, setActiveSection] = useState("overview");

  useEffect(() => {
    const handleScroll = () => {
      const sections = TOC_SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
      let current = "overview";
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= 120) current = section.id;
      }
      setActiveSection(current);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="home-page">
      <div className="lf-layout">
        {/* LEFT SIDEBAR */}
        <aside className="lf-sidebar-left">
          <InfoSidebar />
        </aside>

        {/* CENTER CONTENT */}
        <main className="lf-main">
          {/* Stats Banner */}
          <CornerBox className="mb-[-1px] w-full" id="overview">
            <div className="flex gap-4 md:gap-8 items-center justify-center py-2.5 px-4 whitespace-nowrap overflow-x-auto">
              <p className="text-center text-[13px] text-[#6B6B66]">
                Used by <b className="text-[#20201D]">50+</b> internal teams
              </p>
              <span className="w-[2px] h-[2px] bg-[#6B6B66] rounded-full" />
              <p className="text-center text-[13px] text-[#6B6B66]">
                <b className="text-[#20201D]">10M+</b> rows ingested/month
              </p>
              <span className="w-[2px] h-[2px] bg-[#6B6B66] rounded-full" />
              <p className="text-center text-[13px] text-[#6B6B66]">
                <b className="text-[#20201D]">30+</b> connectors supported
              </p>
            </div>
          </CornerBox>

          {/* Hero */}
          <CornerBox className="flex flex-col items-center px-4 py-12 md:py-16 gap-8 md:gap-10 w-full">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center text-[44px] md:text-[54px] lg:text-[64px] leading-[1.05] font-medium tracking-tight text-[#20201D]"
            >
              <Highlight>Open NFC</Highlight> Data
              <br />
              <Highlight>Engineering</Highlight> <Highlight>Platform</Highlight>
            </motion.h1>
            <div className="flex flex-col gap-6 items-center">
              <p className="max-w-xl text-center text-[15px] leading-relaxed text-[#6B6B66]">
                Connect to any database and transfer data seamlessly. Collaborate with your team to continuously improve
                quality, cost and latency of your application.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link
                  to={isAuthenticated ? "/ingest" : "/login"}
                  className="btn btn-primary h-9 px-4 text-[13px] font-medium shadow-lg no-underline"
                >
                  Start free
                  <kbd className="hidden md:inline-flex items-center justify-center w-5 h-5 rounded-[2px] border border-[#E5E5E0]/20 bg-[#E5E5E0]/10 text-[10px]">
                    S
                  </kbd>
                </Link>
                <Link
                  to={isAuthenticated ? "/connections" : "/home"}
                  className="btn h-9 px-4 text-[13px] font-medium no-underline"
                >
                  Documentation
                  <kbd className="hidden md:inline-flex items-center justify-center w-5 h-5 rounded-[2px] border border-[#E5E5E0] bg-[#404039]/5 text-[10px]">
                    D
                  </kbd>
                </Link>
              </div>
            </div>
          </CornerBox>

          {/* Logo Cloud */}
          <CornerBox className="-mt-[1px] p-0 py-2 px-2 w-full">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-0 items-stretch w-full">
              {DB_LOGOS.map((db) => (
                <div
                  key={db.name}
                  className="group relative flex items-center justify-center p-2 border border-transparent hover:border-[#E5E5E0] transition-all cursor-pointer overflow-visible"
                  style={{ backgroundImage: "none" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundImage =
                      "repeating-linear-gradient(315deg, rgb(246, 246, 243), rgb(246, 246, 243) 2px, rgba(108, 103, 96, 0.08) 2px, rgba(108, 103, 96, 0.08) 4px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundImage = "none";
                  }}
                >
                  {/* Corner brackets on hover */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -inset-[1px] z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                    style={{
                      backgroundColor: "rgb(64, 64, 57)",
                      maskImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8' fill='none'%3E%3Cpath d='M8 0V1H3C1.89543 1 1 1.89543 1 3V8H0V0H8Z' fill='black'/%3E%3C/svg%3E"),url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8' fill='none'%3E%3Cpath d='M8 8V7H3C1.89543 7 1 6.10457 1 5V0H0V8H8Z' fill='black'/%3E%3C/svg%3E"),url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8' fill='none'%3E%3Cpath d='M0 8V7H5C6.10457 7 7 6.10457 7 5V0H8V8H0Z' fill='black'/%3E%3C/svg%3E"),url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8' fill='none'%3E%3Cpath d='M0 0V1H5C6.10457 1 7 1.89543 7 3V8H8V0H0Z' fill='black'/%3E%3C/svg%3E")`,
                      WebkitMaskImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8' fill='none'%3E%3Cpath d='M8 0V1H3C1.89543 1 1 1.89543 1 3V8H0V0H8Z' fill='black'/%3E%3C/svg%3E"),url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8' fill='none'%3E%3Cpath d='M8 8V7H3C1.89543 7 1 6.10457 1 5V0H0V8H8Z' fill='black'/%3E%3C/svg%3E"),url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8' fill='none'%3E%3Cpath d='M0 8V7H5C6.10457 7 7 6.10457 7 5V0H8V8H0Z' fill='black'/%3E%3C/svg%3E"),url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8' fill='none'%3E%3Cpath d='M0 0V1H5C6.10457 1 7 1.89543 7 3V8H8V0H0Z' fill='black'/%3E%3C/svg%3E")`,
                      maskPosition: "0px 0px, 0px 100%, 100% 100%, 100% 0px",
                      WebkitMaskPosition: "0px 0px, 0px 100%, 100% 100%, 100% 0px",
                      maskSize: "8px 8px",
                      WebkitMaskSize: "8px 8px",
                      maskRepeat: "no-repeat",
                      WebkitMaskRepeat: "no-repeat",
                    }}
                  />
                  <img
                    src={db.icon}
                    alt={db.name}
                    className="w-full h-full max-h-[40px] object-contain grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all"
                  />
                </div>
              ))}
            </div>
          </CornerBox>

          {/* Platform Features */}
          <section id="platform-features" className="pt-10 w-full">
            <div className="flex flex-col gap-4 mb-10">
              <h2 className="text-[32px] font-medium text-[#20201D]">
                All the tools, <Highlight>one</Highlight> <Highlight>integrated platform.</Highlight>
              </h2>
              <p className="text-[15px] text-[#6B6B66]">
                One platform to connect, transfer, audit, and monitor from prototype to production scale.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <CornerBox hover className="p-6 flex flex-col gap-2">
                <h4 className="text-[15px] font-semibold text-[#20201D]">Database Connections</h4>
                <p className="text-[14px] text-[#6B6B66]">
                  Connect to 30+ databases — SQL, NoSQL, cloud warehouses, and file formats. Test connections instantly.
                </p>
              </CornerBox>
              <CornerBox hover className="p-6 flex flex-col gap-2">
                <h4 className="text-[15px] font-semibold text-[#20201D]">Data Transfer</h4>
                <p className="text-[14px] text-[#6B6B66]">
                  Move data between any sources with row-level status tracking, error handling, and auto-retry.
                </p>
              </CornerBox>
              <CornerBox hover className="p-6 flex flex-col gap-2">
                <h4 className="text-[15px] font-semibold text-[#20201D]">Audit Log</h4>
                <p className="text-[14px] text-[#6B6B66]">
                  Full visibility into every operation. Track who did what, when, with tamper-proof audit trails.
                </p>
              </CornerBox>
              <CornerBox hover className="p-6 flex flex-col gap-2">
                <h4 className="text-[15px] font-semibold text-[#20201D]">Report Health</h4>
                <p className="text-[14px] text-[#6B6B66]">
                  Monitor report delivery status, SLA compliance, and pipeline health in real-time dashboards.
                </p>
              </CornerBox>
            </div>
          </section>

          {/* Connectors & Features Bento Grid */}
          <div id="connectors" className="pt-10 w-full">
            <FeaturesSection />
          </div>

          {/* Problems/Use Cases */}
          <div className="pt-10 w-full">
            <ProblemsSection />
          </div>

          {/* Get Started CTA */}
          <section id="get-started" className="pt-10 w-full">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-10">
              <div className="flex flex-col gap-6">
                <h2 className="text-[40px] md:text-[48px] font-medium text-[#20201D] leading-[1]">
                  <Highlight>Start improving</Highlight>
                  <br />
                  <Highlight>your pipelines</Highlight>
                  <br />
                  in under 5 minutes.
                </h2>
              </div>
              <div className="flex flex-col gap-4 shrink-0">
                <Link
                  to={isAuthenticated ? "/ingest" : "/login"}
                  className="h-10 px-6 bg-[#20201D] text-white rounded-[2px] inline-flex items-center justify-center font-medium shadow-xl hover:shadow-2xl transition-all no-underline"
                >
                  Start free
                </Link>
                <Link
                  to="/home"
                  className="h-10 px-6 border border-[#E5E5E0] bg-[#F6F6F3] rounded-[2px] inline-flex items-center justify-center font-medium hover:bg-[#F0F0EB] transition-all no-underline text-[#404039]"
                >
                  Documentation
                </Link>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section id="faq" className="pt-10 pb-10 w-full">
            <div className="grid lg:grid-cols-[1fr_2fr] gap-16">
              <h2 className="text-[32px] font-medium text-[#20201D]">Questions &amp; Answers</h2>
              <div className="flex flex-col">
                {FAQS.map((faq, idx) => (
                  <AccordionItem
                    key={idx}
                    title={faq.q}
                    content={faq.a}
                    isOpen={openFaq === idx}
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* Footer */}
          <AppFooter />
        </main>

        {/* RIGHT SIDEBAR */}
        <aside className="lf-sidebar-right">
          <div className="lf-sidebar-section" style={{ padding: "12px 16px" }}>
            <h4 className="lf-sidebar-heading">On this page</h4>
            {TOC_SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`lf-toc-link ${activeSection === s.id ? "lf-toc-link--active" : ""}`}
              >
                {s.label}
              </a>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
