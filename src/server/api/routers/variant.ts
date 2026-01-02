import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const variantRouter = createTRPCRouter({
  /**
   * Buscar variante por rsID en los análisis del usuario
   */
  lookup: protectedProcedure
    .input(
      z.object({
        rsId: z
          .string()
          .regex(/^rs\d+$/, "Formato invalido. Ejemplo: rs1800497"),
      })
    )
    .query(async ({ ctx, input }) => {
      const variants = await ctx.db.variant.findMany({
        where: {
          rsId: input.rsId,
          job: { userId: ctx.session.user.id },
        },
        include: {
          job: {
            select: {
              id: true,
              sequenceName: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      return variants;
    }),

  /**
   * Obtener una variante específica por ID
   */
  getById: protectedProcedure
    .input(z.object({ variantId: z.string() }))
    .query(async ({ ctx, input }) => {
      const variant = await ctx.db.variant.findFirst({
        where: {
          id: input.variantId,
          job: { userId: ctx.session.user.id },
        },
        include: {
          job: {
            select: {
              id: true,
              sequenceName: true,
              createdAt: true,
            },
          },
        },
      });

      return variant;
    }),

  /**
   * Estadísticas de variantes del usuario agrupadas por significancia clínica
   */
  statsBySignificance: protectedProcedure.query(async ({ ctx }) => {
    const stats = await ctx.db.variant.groupBy({
      by: ["clinicalSignificance"],
      where: {
        job: { userId: ctx.session.user.id },
      },
      _count: true,
    });

    // Transformar a formato más usable
    const result: Record<string, number> = {};
    for (const stat of stats) {
      const key = stat.clinicalSignificance ?? "unknown";
      result[key] = stat._count;
    }

    return result;
  }),

  /**
   * Estadísticas de variantes agrupadas por consecuencia
   */
  statsByConsequence: protectedProcedure.query(async ({ ctx }) => {
    const stats = await ctx.db.variant.groupBy({
      by: ["consequence"],
      where: {
        job: { userId: ctx.session.user.id },
      },
      _count: true,
    });

    const result: Record<string, number> = {};
    for (const stat of stats) {
      const key = stat.consequence ?? "unknown";
      result[key] = stat._count;
    }

    return result;
  }),

  /**
   * Estadísticas de variantes agrupadas por tipo
   */
  statsByType: protectedProcedure.query(async ({ ctx }) => {
    const stats = await ctx.db.variant.groupBy({
      by: ["variantType"],
      where: {
        job: { userId: ctx.session.user.id },
      },
      _count: true,
    });

    const result: Record<string, number> = {};
    for (const stat of stats) {
      result[stat.variantType] = stat._count;
    }

    return result;
  }),

  /**
   * Estadísticas de variantes agrupadas por cromosoma
   */
  statsByChromosome: protectedProcedure.query(async ({ ctx }) => {
    const stats = await ctx.db.variant.groupBy({
      by: ["chromosome"],
      where: {
        job: { userId: ctx.session.user.id },
      },
      _count: true,
    });

    const result: Record<string, number> = {};
    for (const stat of stats) {
      result[stat.chromosome] = stat._count;
    }

    return result;
  }),

  /**
   * Buscar variantes con filtros avanzados
   */
  search: protectedProcedure
    .input(
      z.object({
        jobId: z.string().optional(),
        chromosome: z.string().optional(),
        geneSymbol: z.string().optional(),
        clinicalSignificance: z.string().optional(),
        consequence: z.string().optional(),
        minPosition: z.number().optional(),
        maxPosition: z.number().optional(),
        limit: z.number().min(1).max(100).optional().default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const variants = await ctx.db.variant.findMany({
        where: {
          job: {
            userId: ctx.session.user.id,
            ...(input.jobId && { id: input.jobId }),
          },
          ...(input.chromosome && { chromosome: input.chromosome }),
          ...(input.geneSymbol && {
            geneSymbol: { contains: input.geneSymbol, mode: "insensitive" },
          }),
          ...(input.clinicalSignificance && {
            clinicalSignificance: input.clinicalSignificance,
          }),
          ...(input.consequence && { consequence: input.consequence }),
          ...(input.minPosition && { position: { gte: input.minPosition } }),
          ...(input.maxPosition && { position: { lte: input.maxPosition } }),
        },
        include: {
          job: {
            select: {
              id: true,
              sequenceName: true,
            },
          },
        },
        orderBy: [{ chromosome: "asc" }, { position: "asc" }],
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
      });

      let nextCursor: string | undefined = undefined;
      if (variants.length > input.limit) {
        const nextItem = variants.pop();
        nextCursor = nextItem?.id;
      }

      return {
        variants,
        nextCursor,
      };
    }),

  /**
   * Obtener todas las estadísticas combinadas
   */
  allStats: protectedProcedure.query(async ({ ctx }) => {
    const [bySignificance, byConsequence, byType, byChromosome, total] =
      await Promise.all([
        ctx.db.variant.groupBy({
          by: ["clinicalSignificance"],
          where: { job: { userId: ctx.session.user.id } },
          _count: true,
        }),
        ctx.db.variant.groupBy({
          by: ["consequence"],
          where: { job: { userId: ctx.session.user.id } },
          _count: true,
        }),
        ctx.db.variant.groupBy({
          by: ["variantType"],
          where: { job: { userId: ctx.session.user.id } },
          _count: true,
        }),
        ctx.db.variant.groupBy({
          by: ["chromosome"],
          where: { job: { userId: ctx.session.user.id } },
          _count: true,
        }),
        ctx.db.variant.count({
          where: { job: { userId: ctx.session.user.id } },
        }),
      ]);

    return {
      total,
      bySignificance: Object.fromEntries(
        bySignificance.map((s) => [s.clinicalSignificance ?? "unknown", s._count])
      ),
      byConsequence: Object.fromEntries(
        byConsequence.map((s) => [s.consequence ?? "unknown", s._count])
      ),
      byType: Object.fromEntries(
        byType.map((s) => [s.variantType, s._count])
      ),
      byChromosome: Object.fromEntries(
        byChromosome.map((s) => [s.chromosome, s._count])
      ),
    };
  }),
});
