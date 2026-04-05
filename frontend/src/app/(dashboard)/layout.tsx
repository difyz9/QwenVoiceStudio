import type { ReactNode } from "react";

import { DashboardFrame } from "@/components/dashboard-frame";
import { getCurrentUser } from "@/lib/session";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const currentUser = await getCurrentUser();

  return (
    <DashboardFrame currentUser={currentUser?.username ?? null}>{children}</DashboardFrame>
  );
}