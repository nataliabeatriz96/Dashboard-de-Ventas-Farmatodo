'use server';
/**
 * @fileOverview An AI agent that analyzes sales data and generates insights.
 *
 * - generateSalesInsights - A function that handles the sales insights generation process.
 * - GenerateSalesInsightsInput - The input type for the generateSalesInsights function.
 * - GenerateSalesInsightsOutput - The return type for the generateSalesInsights function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateSalesInsightsInputSchema = z.object({
  currentKpis: z.object({
    totalSalesLast6Months: z.object({
      value: z.number().describe('Total sales for the last 6 months.'),
      variationVsPrevious6Months: z.number().describe('Percentage variation vs previous 6 months.').nullable(),
    }),
    totalSalesLast12Months: z.object({
      value: z.number().describe('Total sales for the last 12 months (rolling year).'),
      variationVsPrior12Months: z.number().describe('Percentage variation vs prior 12 months.').nullable(),
    }),
    avgMonthlySalesLast6Months: z.object({
      value: z.number().describe('Average monthly sales for the last 6 months.'),
      variationVsPrevious6Months: z.number().describe('Percentage variation vs previous 6 months.').nullable(),
    }),
    lastMonthSales: z.object({
      value: z.number().describe('Total sales for the last closed month.'),
      variationVsPriorMonth: z.number().describe('Percentage variation vs prior month.').nullable(),
      variationVsSameMonthLastYear: z.number().describe('Percentage variation vs same month last year.').nullable(),
    }),
  }).describe('Current Key Performance Indicators.'),
  monthlySalesData: z.array(z.object({
    month: z.string().describe('Month in YYYY-MM format.'),
    sales: z.number().describe('Total sales for the month.'),
  })).describe('Historical monthly sales data for the last 24 months, ordered chronologically.'),
});
export type GenerateSalesInsightsInput = z.infer<typeof GenerateSalesInsightsInputSchema>;

const GenerateSalesInsightsOutputSchema = z.object({
  summary: z.string().describe('A concise overview of the sales performance in Spanish.'),
  keyDrivers: z.array(z.string()).describe('Identified factors in Spanish.').optional(),
  anomalies: z.array(z.string()).describe('Anomalies in Spanish.').optional(),
  recommendations: z.array(z.string()).describe('Actionable recommendations in Spanish.').optional(),
});
export type GenerateSalesInsightsOutput = z.infer<typeof GenerateSalesInsightsOutputSchema>;

export async function generateSalesInsights(input: GenerateSalesInsightsInput): Promise<GenerateSalesInsightsOutput> {
  return generateSalesInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSalesInsightsPrompt',
  input: { schema: GenerateSalesInsightsInputSchema },
  output: { schema: GenerateSalesInsightsOutputSchema },
  prompt: `Eres un experto analista comercial para una cadena de farmacias retail (Farmatodo).
Tu tarea es analizar los datos de ventas proporcionados y generar un informe de insights detallado, enfocado en los factores clave del rendimiento, anomalías y recomendaciones estratégicas.

IMPORTANTE: Toda tu respuesta DEBE estar escrita exclusivamente en ESPAÑOL profesional. Utiliza terminología de negocios y retail comercial adecuada.

--- Indicadores Clave de Desempeño (KPIs) Actuales ---
Venta Total Últimos 6 Meses: {{currentKpis.totalSalesLast6Months.value}} ({{#if currentKpis.totalSalesLast6Months.variationVsPrevious6Months}}{{currentKpis.totalSalesLast6Months.variationVsPrevious6Months}}% vs 6 meses anteriores{{else}}N/A{{/if}})
Venta Total Año Móvil: {{currentKpis.totalSalesLast12Months.value}} ({{#if currentKpis.totalSalesLast12Months.variationVsPrior12Months}}{{currentKpis.totalSalesLast12Months.variationVsPrior12Months}}% vs año previo{{else}}N/A{{/if}})
Promedio Mensual Últimos 6 Meses: {{currentKpis.avgMonthlySalesLast6Months.value}} ({{#if currentKpis.avgMonthlySalesLast6Months.variationVsPrevious6Months}}{{currentKpis.avgMonthlySalesLast6Months.variationVsPrevious6Months}}% vs 6 meses anteriores{{else}}N/A{{/if}})
Venta Último Mes: {{currentKpis.lastMonthSales.value}} ({{#if currentKpis.lastMonthSales.variationVsPriorMonth}}{{currentKpis.lastMonthSales.variationVsPriorMonth}}% vs mes anterior{{else}}N/A{{/if}}, {{#if currentKpis.lastMonthSales.variationVsSameMonthLastYear}}{{currentKpis.lastMonthSales.variationVsSameMonthLastYear}}% vs mismo mes año anterior{{else}}N/A{{/if}})

--- Datos Históricos Mensuales (Últimos 24 Meses) ---
{{#each monthlySalesData}}
- {{this.month}}: {{this.sales}}
{{/each}}

Basado en estos datos, proporciona un informe estructurado. Enfócate en tendencias significativas, posibles causas del desempeño y consejos prácticos. Asegúrate de que el resumen sea conciso y resalte los hallazgos más importantes.
`,
});

const generateSalesInsightsFlow = ai.defineFlow(
  {
    name: 'generateSalesInsightsFlow',
    inputSchema: GenerateSalesInsightsInputSchema,
    outputSchema: GenerateSalesInsightsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  },
);
