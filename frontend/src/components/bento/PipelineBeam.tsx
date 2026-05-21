import { forwardRef, useRef } from "react";
import { AnimatedBeam } from "./AnimatedBeam";

const I = "/images/db-icons";

const Circle = forwardRef<HTMLDivElement, { className?: string; children?: React.ReactNode }>(
  ({ className = "", children }, ref) => (
    <div ref={ref} className={`pipeline-circle ${className}`}>
      {children}
    </div>
  ),
);
Circle.displayName = "Circle";

export function PipelineBeam() {
  const containerRef = useRef<HTMLDivElement>(null);
  const src1 = useRef<HTMLDivElement>(null);
  const src2 = useRef<HTMLDivElement>(null);
  const src3 = useRef<HTMLDivElement>(null);
  const hub = useRef<HTMLDivElement>(null);
  const tgt1 = useRef<HTMLDivElement>(null);
  const tgt2 = useRef<HTMLDivElement>(null);
  const tgt3 = useRef<HTMLDivElement>(null);

  return (
    <div className="pipeline-beam" ref={containerRef}>
      <div className="pipeline-beam__layout">
        <div className="pipeline-beam__row">
          <Circle ref={src1}>
            <img src={`${I}/csv.png`} alt="CSV" width={24} height={24} />
          </Circle>
          <Circle ref={tgt1}>
            <img src={`${I}/postgresql.png`} alt="PostgreSQL" width={24} height={24} />
          </Circle>
        </div>
        <div className="pipeline-beam__row">
          <Circle ref={src2}>
            <img src={`${I}/bigquery.png`} alt="BigQuery" width={24} height={24} />
          </Circle>
          <Circle ref={hub} className="pipeline-circle--hub">
            <img src="/images/logo.jpeg" alt="Data Ingest Hub" width={28} height={28} />
          </Circle>
          <Circle ref={tgt2}>
            <img src={`${I}/snowflake.png`} alt="Snowflake" width={24} height={24} />
          </Circle>
        </div>
        <div className="pipeline-beam__row">
          <Circle ref={src3}>
            <img src={`${I}/hive.png`} alt="Hive" width={24} height={24} />
          </Circle>
          <Circle ref={tgt3}>
            <img src={`${I}/clickhouse.png`} alt="ClickHouse" width={24} height={24} />
          </Circle>
        </div>
      </div>

      <AnimatedBeam containerRef={containerRef} fromRef={src1} toRef={hub} curvature={-40} duration={2.5} />
      <AnimatedBeam containerRef={containerRef} fromRef={src2} toRef={hub} curvature={0} duration={2} />
      <AnimatedBeam containerRef={containerRef} fromRef={src3} toRef={hub} curvature={40} duration={2.5} />
      <AnimatedBeam containerRef={containerRef} fromRef={hub} toRef={tgt1} curvature={-40} reverse duration={2.5} />
      <AnimatedBeam containerRef={containerRef} fromRef={hub} toRef={tgt2} curvature={0} reverse duration={2} />
      <AnimatedBeam containerRef={containerRef} fromRef={hub} toRef={tgt3} curvature={40} reverse duration={2.5} />
    </div>
  );
}
