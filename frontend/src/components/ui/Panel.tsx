interface PanelProps {
  children: React.ReactNode;
  className?: string;
}

interface PanelHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface PanelBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function Panel({ children, className = "" }: PanelProps) {
  return <div className={`panel ${className}`.trim()}>{children}</div>;
}

export function PanelHeader({ children, className = "" }: PanelHeaderProps) {
  return <div className={`panel-header ${className}`.trim()}>{children}</div>;
}

export function PanelBody({ children, className = "" }: PanelBodyProps) {
  return <div className={`panel-body ${className}`.trim()}>{children}</div>;
}
