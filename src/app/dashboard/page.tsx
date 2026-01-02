import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "~/server/auth";

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/api/auth/signin");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-white/10 bg-surface">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex items-center gap-2 border-b border-white/10 p-4">
            <DNAIcon className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">SNP Analyzer</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            <NavLink href="/dashboard" icon={<HomeIcon />} active>
              Dashboard
            </NavLink>
            <NavLink href="/dashboard/new" icon={<PlusIcon />}>
              Nuevo Analisis
            </NavLink>
            <NavLink href="/dashboard/history" icon={<ClockIcon />}>
              Historial
            </NavLink>
            <NavLink href="/dashboard/stats" icon={<ChartIcon />}>
              Estadisticas
            </NavLink>
          </nav>

          {/* User */}
          <div className="border-t border-white/10 p-4">
            <div className="flex items-center gap-3">
              {session.user.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name ?? "Usuario"}
                  className="h-10 w-10 rounded-full"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white">
                  {session.user.name?.charAt(0) ?? "U"}
                </div>
              )}
              <div className="flex-1 truncate">
                <p className="truncate font-medium">{session.user.name}</p>
                <p className="truncate text-sm text-gray-400">
                  {session.user.email}
                </p>
              </div>
            </div>
            <Link
              href="/api/auth/signout"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 py-2 text-sm font-medium transition hover:bg-white/10"
            >
              <LogoutIcon className="h-4 w-4" />
              Cerrar sesion
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 min-h-screen p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-400">
            Bienvenido de vuelta, {session.user.name}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Analisis Totales"
            value="0"
            icon={<DNAIcon className="h-6 w-6" />}
          />
          <StatCard
            title="En Progreso"
            value="0"
            icon={<ClockIcon className="h-6 w-6" />}
          />
          <StatCard
            title="Completados"
            value="0"
            icon={<CheckIcon className="h-6 w-6" />}
          />
          <StatCard
            title="Variantes Detectadas"
            value="0"
            icon={<ChartIcon className="h-6 w-6" />}
          />
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold">Acciones rapidas</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ActionCard
              href="/dashboard/new"
              title="Nuevo Analisis"
              description="Sube una secuencia FASTA para analizar variantes geneticas"
              icon={<PlusIcon className="h-8 w-8" />}
            />
            <ActionCard
              href="/dashboard/history"
              title="Ver Historial"
              description="Revisa tus analisis anteriores y descarga reportes"
              icon={<ClockIcon className="h-8 w-8" />}
            />
            <ActionCard
              href="/dashboard/stats"
              title="Estadisticas"
              description="Visualiza estadisticas de todas tus variantes"
              icon={<ChartIcon className="h-8 w-8" />}
            />
          </div>
        </div>

        {/* Recent Analyses */}
        <div>
          <h2 className="mb-4 text-xl font-semibold">Analisis recientes</h2>
          <div className="rounded-xl border border-white/10 bg-surface p-8 text-center">
            <DNAIcon className="mx-auto mb-4 h-12 w-12 text-gray-500" />
            <p className="mb-2 text-lg font-medium">No hay analisis aun</p>
            <p className="mb-4 text-gray-400">
              Comienza subiendo tu primera secuencia FASTA
            </p>
            <Link
              href="/dashboard/new"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold transition hover:bg-primary-light"
            >
              <PlusIcon className="h-5 w-5" />
              Nuevo Analisis
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

// Components
function NavLink({
  href,
  icon,
  children,
  active = false,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 font-medium transition ${
        active
          ? "bg-primary text-white"
          : "text-gray-400 hover:bg-white/10 hover:text-white"
      }`}
    >
      {icon}
      {children}
    </Link>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-surface p-6">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-gray-400">{title}</span>
        <span className="text-primary">{icon}</span>
      </div>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}

function ActionCard({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-white/10 bg-surface p-6 transition hover:border-primary/50"
    >
      <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3 text-primary transition group-hover:bg-primary group-hover:text-white">
        {icon}
      </div>
      <h3 className="mb-1 text-lg font-semibold">{title}</h3>
      <p className="text-sm text-gray-400">{description}</p>
    </Link>
  );
}

// Icons
function DNAIcon({ className }: { className?: string }) {
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
        d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
      />
    </svg>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "h-5 w-5"}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "h-5 w-5"}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4v16m8-8H4"
      />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "h-5 w-5"}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "h-5 w-5"}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "h-5 w-5"}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "h-5 w-5"}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
      />
    </svg>
  );
}
