import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { enqueueJob, getQueueLength, getJobPosition, checkRateLimit, analysisRatelimit } from "~/lib/redis";

// Límite diario de análisis por usuario
const DAILY_ANALYSIS_LIMIT = 10;

// Schema para validar secuencias de ADN en formato FASTA
const dnaSequenceSchema = z
  .string()
  .min(10, "La secuencia debe tener al menos 10 caracteres")
  .max(100000, "La secuencia no puede exceder 100,000 caracteres")
  .regex(
    /^[ATGCNatgcn\s>;\-\_\.a-zA-Z0-9\n\r]+$/,
    "Formato FASTA invalido"
  )
  .transform((seq) => {
    // Extraer solo la secuencia, ignorando headers FASTA
    const lines = seq.split("\n");
    const sequenceLines = lines.filter((line) => !line.startsWith(">"));
    return sequenceLines.join("").replace(/\s/g, "").toUpperCase();
  });

export const analysisRouter = createTRPCRouter({
  /**
   * Enviar nueva secuencia para análisis
   */
  submit: protectedProcedure
    .input(
      z.object({
        sequence: dnaSequenceSchema,
        name: z.string().max(255).optional().default("Sin nombre"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Rate limiting: máximo 10 requests por minuto
      const rateLimitResult = await checkRateLimit(
        ctx.session.user.id,
        analysisRatelimit
      );
      if (!rateLimitResult.success) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Demasiadas solicitudes. Por favor espera un momento antes de intentar de nuevo.",
        });
      }

      // Límite diario: máximo 10 análisis por día
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayAnalysisCount = await ctx.db.analysisJob.count({
        where: {
          userId: ctx.session.user.id,
          createdAt: {
            gte: today,
          },
        },
      });

      if (todayAnalysisCount >= DAILY_ANALYSIS_LIMIT) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Has alcanzado el limite diario de ${DAILY_ANALYSIS_LIMIT} analisis. Intenta de nuevo manana.`,
        });
      }

      // Validar que la secuencia limpia solo contenga bases válidas
      if (!/^[ATGCN]+$/.test(input.sequence)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "La secuencia contiene caracteres invalidos. Solo se permiten A, T, G, C, N.",
        });
      }

      // Crear job en base de datos
      const job = await ctx.db.analysisJob.create({
        data: {
          userId: ctx.session.user.id,
          sequence: input.sequence,
          sequenceName: input.name,
          status: "PENDING",
        },
      });

      // Encolar para procesamiento por el worker Python
      await enqueueJob(job.id);

      return {
        jobId: job.id,
        message: "Analisis enviado correctamente",
      };
    }),

  /**
   * Obtener estado de un job
   */
  status: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ ctx, input }) => {
      const job = await ctx.db.analysisJob.findFirst({
        where: {
          id: input.jobId,
          userId: ctx.session.user.id,
        },
        select: {
          id: true,
          status: true,
          errorMessage: true,
          createdAt: true,
          completedAt: true,
          sequenceName: true,
          chromosome: true,
          blastIdentity: true,
          _count: {
            select: { variants: true },
          },
        },
      });

      if (!job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Analisis no encontrado",
        });
      }

      // Si está pendiente, obtener posición en cola
      let queuePosition: number | null = null;
      if (job.status === "PENDING") {
        queuePosition = await getJobPosition(job.id);
      }

      return {
        ...job,
        variantCount: job._count.variants,
        queuePosition,
      };
    }),

  /**
   * Obtener resultados completos de un análisis
   * NOTA: No incluye 'sequence' por privacidad (dato biométrico, hasta 100KB)
   */
  results: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ ctx, input }) => {
      const job = await ctx.db.analysisJob.findFirst({
        where: {
          id: input.jobId,
          userId: ctx.session.user.id,
        },
        select: {
          id: true,
          userId: true,
          sequenceName: true,
          status: true,
          errorMessage: true,
          blastEvalue: true,
          blastIdentity: true,
          chromosome: true,
          createdAt: true,
          updatedAt: true,
          completedAt: true,
          // sequence: EXCLUIDO - dato biométrico sensible, no necesario en UI
          variants: {
            orderBy: [{ chromosome: "asc" }, { position: "asc" }],
            select: {
              id: true,
              chromosome: true,
              position: true,
              referenceAllele: true,
              alternateAllele: true,
              rsId: true,
              hgvsNotation: true,
              geneSymbol: true,
              variantType: true,
              consequence: true,
              clinicalSignificance: true,
              populationFrequency: true,
              revelScore: true,
              caddScore: true,
              siftPrediction: true,
              polyphenPrediction: true,
              createdAt: true,
            },
          },
        },
      });

      if (!job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Analisis no encontrado",
        });
      }

      return job;
    }),

  /**
   * Historial de análisis del usuario con paginación cursor-based
   */
  history: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).optional().default(10),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const jobs = await ctx.db.analysisJob.findMany({
        where: { userId: ctx.session.user.id },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        select: {
          id: true,
          sequenceName: true,
          status: true,
          createdAt: true,
          completedAt: true,
          chromosome: true,
          blastIdentity: true,
          _count: {
            select: { variants: true },
          },
        },
      });

      let nextCursor: string | undefined = undefined;
      if (jobs.length > input.limit) {
        const nextItem = jobs.pop();
        nextCursor = nextItem?.id;
      }

      return {
        jobs: jobs.map((j: typeof jobs[number]) => ({
          ...j,
          variantCount: j._count.variants,
        })),
        nextCursor,
      };
    }),

  /**
   * Eliminar un análisis y todas sus variantes
   */
  delete: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Solo verificar existencia y propiedad sin cargar sequence
      const job = await ctx.db.analysisJob.findFirst({
        where: {
          id: input.jobId,
          userId: ctx.session.user.id,
        },
        select: { id: true },
      });

      if (!job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Analisis no encontrado",
        });
      }

      // Las variantes se eliminan automáticamente por onDelete: Cascade
      await ctx.db.analysisJob.delete({
        where: { id: job.id },
      });

      return { success: true };
    }),

  /**
   * Obtener estadísticas de la cola de procesamiento
   */
  queueStatus: protectedProcedure.query(async () => {
    const length = await getQueueLength();
    return { queueLength: length };
  }),

  /**
   * Obtener estadísticas generales del usuario
   */
  stats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Conteos de análisis por estado
    const [totalAnalyses, pendingAnalyses, processingAnalyses, completedAnalyses, failedAnalyses] = await Promise.all([
      ctx.db.analysisJob.count({
        where: { userId },
      }),
      ctx.db.analysisJob.count({
        where: { userId, status: "PENDING" },
      }),
      ctx.db.analysisJob.count({
        where: { userId, status: "PROCESSING" },
      }),
      ctx.db.analysisJob.count({
        where: { userId, status: "COMPLETED" },
      }),
      ctx.db.analysisJob.count({
        where: { userId, status: "FAILED" },
      }),
    ]);

    // Total de variantes
    const totalVariants = await ctx.db.variant.count({
      where: {
        job: { userId },
      },
    });

    // Distribución por significancia clínica
    const significanceRaw = await ctx.db.variant.groupBy({
      by: ["clinicalSignificance"],
      where: {
        job: { userId },
      },
      _count: true,
    });

    const significanceDistribution = significanceRaw.map((item: { clinicalSignificance: string | null; _count: number }) => ({
      significance: item.clinicalSignificance,
      _count: item._count,
    }));

    // Distribución por consecuencia
    const consequenceRaw = await ctx.db.variant.groupBy({
      by: ["consequence"],
      where: {
        job: { userId },
      },
      _count: true,
    });

    const consequenceDistribution = consequenceRaw.map((item: { consequence: string | null; _count: number }) => ({
      consequence: item.consequence,
      _count: item._count,
    }));

    return {
      totalAnalyses,
      pendingAnalyses,
      processingAnalyses,
      completedAnalyses,
      failedAnalyses,
      totalVariants,
      significanceDistribution,
      consequenceDistribution,
    };
  }),
});
