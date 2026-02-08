import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export default async function Home() {
  try {
    const session = await getServerSession(authOptions);
    if (session) {
      redirect("/chat");
    }
  } catch {
    // Database not connected - send to login
  }
  redirect("/login");
}
