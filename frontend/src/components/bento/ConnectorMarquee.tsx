import { useRef, useEffect, useState, type ReactNode } from "react";
import { motion, useScroll, useVelocity, useTransform, useSpring, useAnimationFrame, wrap } from "framer-motion";
import StorageIcon from "@mui/icons-material/Storage";
import CloudIcon from "@mui/icons-material/Cloud";
import BarChartIcon from "@mui/icons-material/BarChart";
import SearchIcon from "@mui/icons-material/Search";
import SdStorageIcon from "@mui/icons-material/SdStorage";
import HubIcon from "@mui/icons-material/Hub";
import DataObjectIcon from "@mui/icons-material/DataObject";
import TableChartIcon from "@mui/icons-material/TableChart";
import MemoryIcon from "@mui/icons-material/Memory";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";

interface Connector {
  name: string;
  type: string;
  icon: ReactNode;
  desc: string;
}

const CONNECTORS: Connector[] = [
  {
    name: "postgres.sql",
    type: "SQL",
    icon: <StorageIcon fontSize="small" />,
    desc: "Relational database with advanced SQL support and ACID compliance.",
  },
  {
    name: "snowflake.csv",
    type: "Cloud",
    icon: <CloudIcon fontSize="small" />,
    desc: "Cloud-native data warehouse for elastic scaling.",
  },
  {
    name: "clickhouse.par",
    type: "Analytical",
    icon: <BarChartIcon fontSize="small" />,
    desc: "Column-oriented OLAP database for real-time analytics.",
  },
  {
    name: "mysql.dump",
    type: "SQL",
    icon: <TableChartIcon fontSize="small" />,
    desc: "Open-source relational database for web applications.",
  },
  {
    name: "bigquery.json",
    type: "Cloud",
    icon: <CloudIcon fontSize="small" />,
    desc: "Serverless data warehouse with built-in ML.",
  },
  {
    name: "redshift.avro",
    type: "Cloud",
    icon: <CloudIcon fontSize="small" />,
    desc: "Petabyte-scale cloud data warehouse on AWS.",
  },
  {
    name: "mongodb.bson",
    type: "NoSQL",
    icon: <DataObjectIcon fontSize="small" />,
    desc: "Document-oriented NoSQL for flexible schemas.",
  },
  {
    name: "elasticsearch.ndjson",
    type: "Search",
    icon: <SearchIcon fontSize="small" />,
    desc: "Distributed search and analytics engine.",
  },
  {
    name: "duckdb.db",
    type: "Embedded",
    icon: <MemoryIcon fontSize="small" />,
    desc: "In-process analytical database for fast local queries.",
  },
  {
    name: "hive.orc",
    type: "BigData",
    icon: <HubIcon fontSize="small" />,
    desc: "Data warehouse on Hadoop for large-scale batch processing.",
  },
  {
    name: "sqlite.db",
    type: "Embedded",
    icon: <SdStorageIcon fontSize="small" />,
    desc: "Lightweight embedded database for local storage.",
  },
  {
    name: "kafka.avro",
    type: "Streaming",
    icon: <InsertDriveFileIcon fontSize="small" />,
    desc: "Distributed event streaming platform.",
  },
];

function MarqueeRow({ reverse = false }: { reverse?: boolean }) {
  const baseX = useRef(0);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 400 });
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 3], { clamp: false });
  const [x, setX] = useState(0);
  const dirSign = reverse ? 1 : -1;
  const groupRef = useRef<HTMLDivElement>(null);
  const [groupWidth, setGroupWidth] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!groupRef.current) return;
    const ro = new ResizeObserver(() => {
      setGroupWidth(groupRef.current?.offsetWidth ?? 0);
    });
    ro.observe(groupRef.current);
    return () => ro.disconnect();
  }, []);

  useAnimationFrame((_, delta) => {
    if (!groupWidth || paused) return;
    const dt = delta / 1000;
    const move = dirSign * 35 * dt + dirSign * 35 * velocityFactor.get() * dt;
    baseX.current = wrap(-groupWidth, 0, baseX.current + move);
    setX(baseX.current);
  });

  const cards = CONNECTORS.map((c, i) => (
    <figure className="bento-marquee__card" key={i}>
      <div className="bento-marquee__card-header">
        <span className="bento-marquee__icon">{c.icon}</span>
        <figcaption className="bento-marquee__filename">{c.name}</figcaption>
      </div>
      <span className="bento-marquee__type">{c.type}</span>
      <blockquote className="bento-marquee__body">{c.desc}</blockquote>
    </figure>
  ));

  return (
    <div className="bento-marquee__row" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <motion.div className="bento-marquee__track" style={{ x }}>
        <div ref={groupRef} className="bento-marquee__group">
          {cards}
        </div>
        <div className="bento-marquee__group" aria-hidden="true">
          {cards}
        </div>
        <div className="bento-marquee__group" aria-hidden="true">
          {cards}
        </div>
      </motion.div>
    </div>
  );
}

export function ConnectorMarquee() {
  return (
    <div className="bento-marquee">
      <MarqueeRow />
      <MarqueeRow reverse />
    </div>
  );
}
