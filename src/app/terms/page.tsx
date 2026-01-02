import Link from "next/link";
import { DNAIcon, ArrowLeftIcon } from "~/components/icons";

export default function TermsPage() {
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
          Terminos de Servicio
        </h1>

        <div className="prose prose-slate max-w-none space-y-6 text-text-light">
          <section>
            <h2 className="text-2xl font-semibold text-text">
              1. Aceptacion de los terminos
            </h2>
            <p>
              Al acceder y utilizar SNP Analyzer, aceptas estos terminos de
              servicio. Si no estas de acuerdo con alguna parte, no debes usar
              el servicio.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text">
              2. Descripcion del servicio
            </h2>
            <p>
              SNP Analyzer es una herramienta de bioinformatica que permite:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Subir secuencias de ADN en formato FASTA.</li>
              <li>Detectar variantes geneticas (SNPs) mediante BLAST.</li>
              <li>
                Obtener anotaciones clinicas de bases de datos publicas (ClinVar,
                gnomAD).
              </li>
              <li>Exportar resultados en multiples formatos.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text">
              3. Uso apropiado
            </h2>
            <p>Te comprometes a:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Usar el servicio solo para fines legales y eticos.</li>
              <li>
                No subir secuencias que no te pertenezcan o para las que no
                tengas autorizacion.
              </li>
              <li>No intentar vulnerar la seguridad del sistema.</li>
              <li>No abusar de los recursos del servicio.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text">
              4. Limitaciones importantes
            </h2>
            <p className="font-semibold text-text">
              SNP Analyzer NO es un servicio de diagnostico medico.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Los resultados son solo informativos y para fines de
                investigacion.
              </li>
              <li>
                No deben usarse para tomar decisiones medicas sin consultar a un
                profesional de la salud.
              </li>
              <li>
                Las anotaciones clinicas provienen de bases de datos publicas y
                pueden no estar actualizadas.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text">
              5. Propiedad intelectual
            </h2>
            <p>
              Tus secuencias de ADN y resultados te pertenecen. SNP Analyzer no
              reclama propiedad sobre los datos que subas o los resultados
              generados.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text">
              6. Disponibilidad del servicio
            </h2>
            <p>
              SNP Analyzer se proporciona &quot;tal cual&quot;. No garantizamos
              disponibilidad ininterrumpida ni que este libre de errores. Nos
              reservamos el derecho de modificar o discontinuar el servicio.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text">
              7. Limitacion de responsabilidad
            </h2>
            <p>
              SNP Analyzer y sus desarrolladores no seran responsables por danos
              directos, indirectos o consecuentes derivados del uso del
              servicio.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text">
              8. Modificaciones
            </h2>
            <p>
              Nos reservamos el derecho de modificar estos terminos. Los cambios
              seran efectivos al publicarse en esta pagina.
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
