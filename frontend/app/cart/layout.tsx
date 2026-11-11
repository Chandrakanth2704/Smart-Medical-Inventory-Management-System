import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export const instant = false;

export default async function CartLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login?next=%2Fcart");
  }

  if (session.role !== "CUSTOMER") {
    redirect("/inventory");
  }

  return <>{children}</>;
}
