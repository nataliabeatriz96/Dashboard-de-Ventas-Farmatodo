'use server';
/**
 * @fileOverview AI agent for deep-dive supplier business reviews.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateSupplierInsightsInputSchema = z.object({
  supplierName: z.string(),
  performanceKpis: z.object({
    lastMonthSales: z.number(),
    lastMonthVariation: z.number().nullable(),
    variation3m: z.number().nullable(),
    variation6m: z.number().nullable(),
    avgMonthlySales6m: z.number(),
  }),
  rankings: z.array(z.object({
    level: z.string(),
    category: z.string(),
    share: z.number(),
    rank: z.number(),
    totalSuppliers: z.number(),
  })),
  topSkus: z.array(z.object({
    sku: z.string(),
    description: z.string(),
    sales: z.number(),
    variation: z.number().nullable(),
  })),
});

const GenerateSupplierInsightsOutputSchema = z.object({
  summary: z.string().describe('Análisis del desempeño general del proveedor en español.'),
  strengths: z.array(z.string()).describe('Fortalezas identificadas en español.'),
  opportunities: z.array(z.string()).describe('Oportunidades de mejora detectadas en español.'),
  recommendations: z.array(z.string()).describe('Recomendaciones estratégicas en español.'),
});

export type GenerateSupplierInsightsInput = z.infer<typeof GenerateSupplierInsightsInputSchema>;
export type GenerateSupplierInsightsOutput = z.infer<typeof GenerateSupplierInsightsOutputSchema>;

export async function generateSupplierInsights(input: GenerateSupplierInsightsInput): Promise<GenerateSupplierInsightsOutput> {
  return generateSupplierInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSupplierInsightsPrompt',
  input: { schema: GenerateSupplierInsightsInputSchema },
  output: { schema: GenerateSupplierInsightsOutputSchema },
  prompt: `Eres un consultor comercial experto para Farmatodo. 
Analiza el desempeño del proveedor "{{supplierName}}" basándote en los siguientes datos.

Responde ÚNICAMENTE en ESPAÑOL profesional.

--- DESEMPEÑO COMERCIAL ---
Venta Último Mes: {{performanceKpis.lastMonthSales}} (Var vs año ant: {{performanceKpis.lastMonthVariation}}%)
Var 3m vs 3m ant: {{performanceKpis.variation3m}}%
Var 6m vs 6m ant: {{performanceKpis.variation6m}}%
Promedio Mensual U6M: {{performanceKpis.avgMonthlySales6m}}

--- POSICIONAMIENTO EN CATEGORÍAS ---
{{#each rankings}}
- {{this.level}}: {{this.category}} | Participación: {{this.share}}% | Ranking: {{this.rank}} de {{this.totalSuppliers}}
{{/each}}

--- TOP PRODUCTOS ---
{{#each topSkus}}
- {{this.description}}: {{this.sales}} (Var: {{this.variation}}%)
{{/each}}

Proporciona un informe estructurado que resalte tendencias críticas, compare el desempeño del proveedor contra el mercado (basado en rankings) y sugiera acciones para mejorar su participación en Farmatodo.`,
});

const generateSupplierInsightsFlow = ai.defineFlow(
  {
    name: 'generateSupplierInsightsFlow',
    inputSchema: GenerateSupplierInsightsInputSchema,
    outputSchema: GenerateSupplierInsightsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  },
);
