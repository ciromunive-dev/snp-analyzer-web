import Link from "next/link";

export default async function AuthErrorPage(props: {
  searchParams: Promise<{ error?: string }>;
}) {
  const searchParams = await props.searchParams;
  const error = searchParams.error;

  const errorMessages: Record<string, string> = {
    Configuration: "Hay un problema con la configuracion del servidor.",
    AccessDenied: "No tienes permiso para acceder a esta aplicacion.",
    Verification: "El enlace de verificacion ha expirado o ya fue usado.",
    Default: "Ocurrio un error durante la autenticacion.",
  };

  const errorMessage = errorMessages[error ?? "Default"] ?? errorMessages.Default;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center">
        <div className="rounded-2xl border border-red-500/20 bg-surface p-8">
          {/* Error Icon */}
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
            <ErrorIcon className="h-8 w-8 text-red-500" />
          </div>

          <h1 className="mb-2 text-2xl font-bold">Error de autenticacion</h1>
          <p className="mb-6 text-gray-400">{errorMessage}</p>

          {error && (
            <p className="mb-6 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">
              Codigo: {error}
            </p>
          )}

          <div className="space-y-3">
            <Link
              href="/auth/signin"
              className="block w-full rounded-lg bg-primary py-3 font-semibold transition hover:bg-primary-light"
            >
              Intentar de nuevo
            </Link>
            <Link
              href="/"
              className="block w-full rounded-lg border border-white/20 py-3 font-semibold transition hover:bg-white/10"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}
