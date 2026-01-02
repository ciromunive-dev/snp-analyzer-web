import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signIn } from "~/server/auth";
import { DNAIcon, GoogleIcon, ArrowLeftIcon } from "~/components/icons";

export default async function SignInPage() {
  const session = await auth();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-white/10 bg-surface p-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <div
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10"
              aria-hidden="true"
            >
              <DNAIcon className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Bienvenido a SNP Analyzer</h1>
            <p className="mt-2 text-gray-300">
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
                className="flex w-full items-center justify-center gap-3 rounded-lg border border-white/20 bg-white/5 py-3 font-medium transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface"
              >
                <GoogleIcon className="h-5 w-5" aria-hidden="true" />
                Continuar con Google
              </button>
            </form>
          </div>

          {/* Terms */}
          <p className="mt-8 text-center text-sm text-gray-400">
            Al continuar, aceptas nuestros{" "}
            <Link href="/terms" className="underline hover:text-white focus:outline-none focus:ring-2 focus:ring-primary rounded">
              terminos de servicio
            </Link>{" "}
            y{" "}
            <Link href="/privacy" className="underline hover:text-white focus:outline-none focus:ring-2 focus:ring-primary rounded">
              politica de privacidad
            </Link>
            .
          </p>
        </div>

        {/* Back link */}
        <p className="mt-4 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-400 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-primary rounded-lg px-2 py-1"
          >
            <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
            Volver al inicio
          </Link>
        </p>
      </div>
    </main>
  );
}
