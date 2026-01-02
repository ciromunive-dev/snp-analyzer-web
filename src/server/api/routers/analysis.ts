import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { enqueueJob, getQueueLength, getJobPosition } from "~/lib/redis";

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
   */
  results: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ ctx, input }) => {
      const job = await ctx.db.analysisJob.findFirst({
        where: {
          id: input.jobId,
          userId: ctx.session.user.id,
        },
        include: {
          variants: {
            orderBy: [{ chromosome: "asc" }, { position: "asc" }],
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
        jobs: jobs.map((j) => ({
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
      const job = await ctx.db.analysisJob.findFirst({
        where: {
          id: input.jobId,
          userId: ctx.session.user.id,
        },
      });

      if (!job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Analisis no encontrado",
        });
      }

      // Las variantes se eliminan automáticamente por onDelete: Cascade
      await ctx.db.analysisJob.delete({
        where: { id: input.jobId },
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
    const [total, pending, processing, completed, failed] = await Promise.all([
      ctx.db.analysisJob.count({
        where: { userId: ctx.session.user.id },
      }),
      ctx.db.analysisJob.count({
        where: { userId: ctx.session.user.id, status: "PENDING" },
      }),
      ctx.db.analysisJob.count({
        where: { userId: ctx.session.user.id, status: "PROCESSING" },
      }),
      ctx.db.analysisJob.count({
        where: { userId: ctx.session.user.id, status: "COMPLETED" },
      }),
      ctx.db.analysisJob.count({
        where: { userId: ctx.session.user.id, status: "FAILED" },
      }),
    ]);

    const totalVariants = await ctx.db.variant.count({
      where: {
        job: { userId: ctx.session.user.id },
      },
    });

    return {
      total,
      pending,
      processing,
      completed,
      failed,
      totalVariants,
    };
  }),
});
