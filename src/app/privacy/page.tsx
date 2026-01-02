import Link from "next/link";
import { DNAIcon, ArrowLeftIcon } from "~/components/icons";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <DNAIcon className="h-8 w-8 text-primary" aria-hidden="true" />
            <span className="text-xl font-bold text-text">SNP Analyzer</span>
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-4 py-12">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-text-light transition hover:text-text"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Volver al inicio
        </Link>

        <h1 className="mb-8 text-4xl font-bold text-text">
          Politica de Privacidad
        </h1>

        <div className="prose prose-slate max-w-none space-y-6 text-text-light">
          <section>
            <h2 className="text-2xl font-semibold text-text">
              1. Informacion que recopilamos
            </h2>
            <p>
              SNP Analyzer recopila la siguiente informacion cuando utilizas
              nuestro servicio:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Informacion de cuenta:</strong> Nombre, correo
                electronico e imagen de perfil proporcionados por Google al
                iniciar sesion.
              </li>
              <li>
                <strong>Secuencias de ADN:</strong> Las secuencias FASTA que
                subas para analisis.
              </li>
              <li>
                <strong>Resultados de analisis:</strong> Variantes detectadas y
                anotaciones clinicas generadas.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text">
              2. Uso de la informacion
            </h2>
            <p>Utilizamos tu informacion exclusivamente para:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Procesar y analizar las secuencias de ADN que subas.</li>
              <li>Generar reportes de variantes geneticas.</li>
              <li>Mantener un historial de tus analisis.</li>
              <li>Mejorar la calidad del servicio.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text">
              3. Almacenamiento y seguridad
            </h2>
            <p>
              Tus datos se almacenan de forma segura en servidores protegidos.
              Las secuencias de ADN y resultados se asocian unicamente a tu
              cuenta y no son accesibles por otros usuarios.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text">
              4. Compartir informacion
            </h2>
            <p>
              No vendemos, alquilamos ni compartimos tu informacion personal o
              datos geneticos con terceros, excepto:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Cuando sea requerido por ley.</li>
              <li>
                Con servicios externos necesarios para el analisis (NCBI BLAST,
                ClinVar, gnomAD) que solo reciben las secuencias sin
                informacion identificable.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text">
              5. Tus derechos
            </h2>
            <p>Tienes derecho a:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Acceder a tus datos almacenados.</li>
              <li>Solicitar la eliminacion de tu cuenta y datos.</li>
              <li>Exportar tus resultados de analisis.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text">6. Contacto</h2>
            <p>
              Para preguntas sobre esta politica de privacidad, contactanos a
              traves del repositorio del proyecto.
            </p>
          </section>

          <p className="text-sm text-text-lighter">
            Ultima actualizacion: {new Date().toLocaleDateString("es-ES")}
          </p>
        </div>
      </div>
    </main>
  );
}
