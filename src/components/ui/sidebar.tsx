"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DNAIcon,
  HomeIcon,
  PlusIcon,
  ClockIcon,
  ChartIcon,
  LogoutIcon,
  MenuIcon,
  CloseIcon,
} from "~/components/icons";

interface SidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: <HomeIcon /> },
  { href: "/dashboard/new", label: "Nuevo Analisis", icon: <PlusIcon /> },
  { href: "/dashboard/history", label: "Historial", icon: <ClockIcon /> },
  { href: "/dashboard/stats", label: "Estadisticas", icon: <ChartIcon /> },
];

export function Sidebar({ user }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => setIsOpen(false);

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={toggleSidebar}
        className="fixed left-4 top-4 z-50 rounded-lg bg-surface p-2 text-text shadow-lg transition hover:bg-surface-light focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background md:hidden"
        aria-label={isOpen ? "Cerrar menu" : "Abrir menu"}
        aria-expanded={isOpen}
        aria-controls="sidebar"
      >
        {isOpen ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        id="sidebar"
        className={`fixed left-0 top-0 z-40 h-screen w-64 transform border-r border-border bg-surface shadow-lg transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
        aria-label="Menu principal"
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex items-center gap-2 border-b border-border p-4">
            <DNAIcon className="h-8 w-8 text-primary" aria-hidden="true" />
            <span className="text-xl font-bold text-text">SNP Analyzer</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4" aria-label="Navegacion principal">
            {navItems.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeSidebar}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 font-medium transition focus:outline-none focus:ring-2 focus:ring-primary ${
                    isActive
                      ? "bg-primary text-white"
                      : "text-text-light hover:bg-background-lighter hover:text-text"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span aria-hidden="true">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="border-t border-border p-4">
            <div className="flex items-center gap-3">
              {user.image ? (
                <img
                  src={user.image}
                  alt={`Avatar de ${user.name ?? "usuario"}`}
                  className="h-10 w-10 rounded-full"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white"
                  aria-hidden="true"
                >
                  {user.name?.charAt(0).toUpperCase() ?? "U"}
                </div>
              )}
              <div className="flex-1 truncate">
                <p className="truncate font-medium text-text">{user.name ?? "Usuario"}</p>
                <p className="truncate text-sm text-text-lighter">{user.email}</p>
              </div>
            </div>
            <Link
              href="/api/auth/signout"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-border py-2 text-sm font-medium text-text transition hover:bg-background-lighter focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <LogoutIcon className="h-4 w-4" aria-hidden="true" />
              Cerrar sesion
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
