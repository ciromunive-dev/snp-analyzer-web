import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signIn } from "~/server/auth";
import { DNAIcon, GoogleIcon } from "~/components/icons";

export default async function SignInPage() {
  const session = await auth();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <nav className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface"
          >
            <DNAIcon className="h-8 w-8 text-primary" aria-hidden="true" />
            <span className="text-xl font-bold text-text">SNP Analyzer</span>
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex min-h-[calc(100vh-73px)] items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
            {/* Header */}
            <div className="mb-8 text-center">
              <div
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10"
                aria-hidden="true"
              >
                <DNAIcon className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-text">
                Bienvenido a SNP Analyzer
              </h1>
              <p className="mt-2 text-text-light">
                Inicia sesion para analizar variantes geneticas
              </p>
            </div>

            {/* Sign In Buttons */}
            <div className="space-y-4">
              <form
                action={async () => {
                  "use server";
                  await signIn("google", { redirectTo: "/dashboard" });
                }}
              >
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-surface py-3 font-medium text-text transition hover:bg-background-lighter focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface"
                >
                  <GoogleIcon className="h-5 w-5" aria-hidden="true" />
                  Continuar con Google
                </button>
              </form>
            </div>

            {/* Terms */}
            <p className="mt-8 text-center text-sm text-text-lighter">
              Al continuar, aceptas nuestros{" "}
              <Link
                href="/terms"
                className="text-primary underline hover:text-primary-light focus:outline-none focus:ring-2 focus:ring-primary rounded"
              >
                terminos de servicio
              </Link>{" "}
              y{" "}
              <Link
                href="/privacy"
                className="text-primary underline hover:text-primary-light focus:outline-none focus:ring-2 focus:ring-primary rounded"
              >
                politica de privacidad
              </Link>
              .
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
