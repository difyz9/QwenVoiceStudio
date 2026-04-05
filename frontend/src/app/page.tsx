import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";

export default async function HomePage() {
  const currentUser = await getCurrentUser();

  redirect(currentUser ? "/dashboard" : "/login");
}
