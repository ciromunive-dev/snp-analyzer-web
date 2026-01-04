import { redirect } from "next/navigation";

// Demo mode: redirect directly to dashboard
export default async function SignInPage() {
  redirect("/dashboard");
}
