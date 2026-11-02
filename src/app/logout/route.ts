import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/auth/session";

/** Sign-out is exempt from the session audit: it must work while signed in. */
export async function POST(): Promise<Response> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}
