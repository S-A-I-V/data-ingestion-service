/**
 * ProtectedRoute — Wrapper component that enforces permission checks for routes.
 *
 * Usage:
 *   <ProtectedRoute permissions={["admin:connections"]} user={user}>
 *     <Dashboard />
 *   </ProtectedRoute>
 *
 * If user lacks required permissions, shows AccessDenied component.
 * If `any` is true, user needs any ONE of the permissions. Default requires ALL.
 */

import { ReactNode } from "react";
import AccessDenied from "./AccessDenied";

interface ProtectedRouteProps {
  /** The component/page to render if authorized */
  children: ReactNode;
  /** User object with permissions array */
  user: { permissions?: string[] } | null;
  /** Required permission codes */
  permissions: string[];
  /** If true, user needs ANY of the permissions. If false (default), needs ALL */
  any?: boolean;
  /** Feature name for the AccessDenied message */
  feature?: string;
}

export default function ProtectedRoute({ children, user, permissions, any = true, feature }: ProtectedRouteProps) {
  const userPerms = user?.permissions || [];

  // Check authorization
  const hasAccess = any
    ? permissions.some((p) => userPerms.includes(p))
    : permissions.every((p) => userPerms.includes(p));

  if (!hasAccess) {
    return <AccessDenied feature={feature} />;
  }

  return <>{children}</>;
}
