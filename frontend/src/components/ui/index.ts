// UI Primitives — import from here, not from individual files
// e.g. import { Button, Badge, Panel } from "../ui";

// shadcn primitives (Tailwind-based)
export { Button, buttonVariants } from "./button";
export type { ButtonProps } from "./button";
export { Badge, badgeVariants } from "./badge";
export { Input } from "./input";
export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
export { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "./card";
export { Separator } from "./separator";

// Custom app primitives (CSS-based, no Tailwind equivalent)
export { Spinner } from "./Spinner";
export { Panel, PanelHeader, PanelBody } from "./Panel";
// FormRow exports its own Input/Select for form fields — import directly from FormRow when needed
export { FormRow } from "./FormRow";
export { EmptyState } from "./EmptyState";
export { Toast, useToast } from "./Toast";
export type { ToastData } from "./Toast";
