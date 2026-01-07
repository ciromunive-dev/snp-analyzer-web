import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "~/server/auth";
import { DNAIcon } from "~/components/icons";

export default async function SignInPage() {
  const session = await auth();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-background-light">
      {/* Navigation - mismo que pagina principal */}
      <nav
        className="fixed top-0 z-50 w-full border-b border-border bg-surface/80 backdrop-blur-sm"
        aria-label="Navegacion principal"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface rounded-lg">
            <DNAIcon className="h-8 w-8 text-primary" aria-hidden="true" />
            <span className="text-xl font-bold text-text">SNP Analyzer</span>
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-border px-4 py-2 font-semibold text-text transition hover:bg-background-lighter focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface"
          >
            Volver al inicio
          </Link>
        </div>
      </nav>

      {/* Login Card */}
      <div className="flex min-h-screen items-center justify-center px-4 pt-20">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-lg">
          <div className="mb-8 text-center">
            <DNAIcon className="mx-auto h-12 w-12 text-primary mb-4" />
            <h1 className="text-3xl font-bold text-text">Iniciar Sesion</h1>
            <p className="mt-2 text-text-light">
              Accede al analisis de variantes geneticas
            </p>
          </div>

          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/dashboard" });
            }}
          >
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-text font-medium shadow-sm transition-all hover:bg-background-lighter hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continuar con Google
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-text-lighter">
            Al iniciar sesion, aceptas nuestros{" "}
            <a href="/terms" className="text-primary hover:underline">
              Terminos de Servicio
            </a>{" "}
            y{" "}
            <a href="/privacy" className="text-primary hover:underline">
              Politica de Privacidad
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
