import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { homeFor } from "@/lib/auth/roles";

export default async function Home() {
  const user = await requireUser();
  redirect(homeFor(user.role));
}
