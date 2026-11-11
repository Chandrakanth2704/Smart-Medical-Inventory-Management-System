import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export const instant = false;

export default async function CheckoutLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login?next=%2Fcheckout");
  }

  if (session.role !== "CUSTOMER") {
    redirect("/inventory");
  }

  return <>{children}</>;
}
