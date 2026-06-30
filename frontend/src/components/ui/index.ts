// UI Primitives — import from here, not from individual files
// e.g. import { Button, Badge, Panel } from "../ui";

// shadcn primitives (Tailwind-based)
export { Button, buttonVariants } from "./Button";
export type { ButtonProps } from "./Button";
export { Badge, badgeVariants } from "./Badge";
export { Input } from "./input";
export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
export { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "./card";
export { Separator } from "./separator";

// Toggle Group (Radix-based)
export { ToggleGroup, ToggleGroupItem } from "./toggle-group";
export { Calendar } from "./calendar";
export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor } from "./popover";

// Custom app primitives (CSS-based, no Tailwind equivalent)
export { Spinner } from "./Spinner";
export { Panel, PanelHeader, PanelBody } from "./Panel";
// FormRow exports its own Input/Select for form fields — import directly from FormRow when needed
export { FormRow } from "./FormRow";
export { EmptyState } from "./EmptyState";
export { DownloadButton } from "./DownloadButton";
export { Toast, useToast } from "./Toast";
export type { ToastData } from "./Toast";
