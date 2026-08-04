/**
 * JobWindowShape — Custom Recharts Bar shape that renders:
 *   1. A grey SLA window band (start → deadline)
 *   2. The job run window rect (colored blue/amber)
 *   3. Dashed SLA start + deadline lines overlaid per bar
 */

import {
  COLOR_SLA_START_LINE,
  COLOR_SLA_END_LINE,
  SLA_LINE_STROKE_WIDTH,
  SLA_LINE_DASH,
  SLA_LINE_INSET_PX,
} from "./slaChartConstants";

export function JobWindowShape(props: any) {
  const { x, y, width, height, background, payload, fill } = props;
  if (!background || !payload || width <= 0) return null;

  const { expected_start_minutes, expected_sla_minutes, yDomainMin, yDomainMax } = payload;
  const plotTop = background.y;
  const plotHeight = background.height;
  const domainMin = yDomainMin ?? 0;
  const domainMax = yDomainMax ?? 1440;
  const domainRange = domainMax - domainMin;

  const toPixelY = (mins: number) => plotTop + plotHeight * (1 - (mins - domainMin) / domainRange);

  const lx1 = x + SLA_LINE_INSET_PX;
  const lx2 = x + width - SLA_LINE_INSET_PX;

  return (
    <g>
      {/* SLA window band — light grey background from start to deadline */}
      {expected_start_minutes != null &&
        expected_sla_minutes != null &&
        (() => {
          const yTop = toPixelY(expected_sla_minutes) - SLA_LINE_STROKE_WIDTH / 2;
          const yBot = toPixelY(expected_start_minutes) + SLA_LINE_STROKE_WIDTH / 2;
          const bandHeight = yBot - yTop;
          if (bandHeight <= 0) return null;
          return (
            <rect
              x={x}
              y={yTop}
              width={width}
              height={bandHeight}
              fill="rgba(180, 180, 180, 0.15)"
              stroke="rgba(0, 0, 0, 0.35)"
              strokeWidth={0.75}
            />
          );
        })()}
      {/* Job run window rect */}
      {height > 0 && <rect x={x} y={y} width={width} height={height} fill={fill} rx={2} ry={2} />}
      {/* SLA start line */}
      {expected_start_minutes != null &&
        (() => {
          const ly = toPixelY(expected_start_minutes);
          return (
            <line
              x1={lx1}
              x2={lx2}
              y1={ly}
              y2={ly}
              stroke={COLOR_SLA_START_LINE}
              strokeWidth={SLA_LINE_STROKE_WIDTH}
              strokeDasharray={SLA_LINE_DASH}
            />
          );
        })()}
      {/* SLA deadline line */}
      {expected_sla_minutes != null &&
        (() => {
          const ly = toPixelY(expected_sla_minutes);
          return (
            <line
              x1={lx1}
              x2={lx2}
              y1={ly}
              y2={ly}
              stroke={COLOR_SLA_END_LINE}
              strokeWidth={SLA_LINE_STROKE_WIDTH}
              strokeDasharray={SLA_LINE_DASH}
            />
          );
        })()}
    </g>
  );
}
