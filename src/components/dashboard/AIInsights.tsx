
"use client";

import { useState } from "react";
import { generateSalesInsights, GenerateSalesInsightsOutput } from "@/ai/flows/generate-sales-insights";
import { SalesRecord, ViewMode } from "@/types/sales";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Sparkles, Loader2, Info } from "lucide-react";

interface AIInsightsProps {
  data: SalesRecord[];
  mode: ViewMode;
}

export function AIInsights({ data, mode }: AIInsightsProps) {
  const [insights, setInsights] = useState<GenerateSalesInsightsOutput | null>(null);
  const [loading, setLoading] = useState(false);

  const triggerInsights = async () => {
    if (data.length === 0) return;
    setLoading(true);
    
    const valKey = mode === "USD" ? "Ventas_USD" : "Unidades_Vendidas";
    const sortedMonths = Array.from(new Set(data.map(d => d.Fecha_Mes))).sort().reverse();
    const sumByMonth = (monthArr: string[]) => data.filter(d => monthArr.includes(d.Fecha_Mes)).reduce((acc, curr) => acc + (curr[valKey] || 0), 0);

    const m6 = sortedMonths.slice(0, 6);
    const p6 = sortedMonths.slice(6, 12);
    const m12 = sortedMonths.slice(0, 12);
    const p12 = sortedMonths.slice(12, 24);

    const lastMonth = sortedMonths[0];
    const prevMonth = sortedMonths[1];
    
    const sameMonthLastYear = sortedMonths.find(m => {
       if (!lastMonth) return false;
       const [y, mm] = m.split('-').map(Number);
       const [ly, lm] = lastMonth.split('-').map(Number);
       return y === ly - 1 && mm === lm;
    });

    const v6 = sumByMonth(m6);
    const vp6 = sumByMonth(p6);
    const v12 = sumByMonth(m12);
    const vp12 = sumByMonth(p12);
    const vlm = sumByMonth(lastMonth ? [lastMonth] : []);
    const vpm = sumByMonth(prevMonth ? [prevMonth] : []);
    const vsmly = sumByMonth(sameMonthLastYear ? [sameMonthLastYear] : []);

    const input = {
      currentKpis: {
        totalSalesLast6Months: {
          value: v6,
          variationVsPrevious6Months: vp6 ? ((v6 - vp6) / vp6) * 100 : null,
        },
        totalSalesLast12Months: {
          value: v12,
          variationVsPrior12Months: vp12 ? ((v12 - vp12) / vp12) * 100 : null,
        },
        avgMonthlySalesLast6Months: {
          value: v6 / (m6.length || 1),
          variationVsPrevious6Months: vp6 ? ((v6 / (m6.length || 1) - vp6 / (p6.length || 1)) / (vp6 / (p6.length || 1))) * 100 : null,
        },
        lastMonthSales: {
          value: vlm,
          variationVsPriorMonth: vpm ? ((vlm - vpm) / vpm) * 100 : null,
          variationVsSameMonthLastYear: vsmly ? ((vlm - vsmly) / vsmly) * 100 : null,
        },
      },
      monthlySalesData: Array.from(new Set(data.map(d => d.Fecha_Mes.substring(0, 7))))
        .sort()
        .slice(-24)
        .map(m => ({
          month: m,
          sales: data.filter(d => d.Fecha_Mes.startsWith(m)).reduce((acc, curr) => acc + (curr[valKey] || 0), 0)
        }))
    };

    try {
      const res = await generateSalesInsights(input);
      setInsights(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-none shadow-sm bg-gradient-to-br from-[#1E3A6E] to-[#2768DB] text-white">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-[#26C5DB]" />
          <CardTitle className="text-xl">Análisis Inteligente (AI)</CardTitle>
        </div>
        {!insights && !loading && (
          <Button 
            onClick={triggerInsights} 
            variant="secondary" 
            size="sm"
            className="bg-[#26C5DB] hover:bg-[#20a9bc] text-white border-none"
          >
            Generar Insights
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-[#26C5DB]" />
            <p className="text-sm font-medium">Analizando datos comerciales...</p>
          </div>
        ) : insights ? (
          <div className="space-y-6">
            <div className="bg-white/10 rounded-lg p-4">
              <h4 className="text-sm font-bold uppercase tracking-wider text-[#26C5DB] mb-2">Resumen Ejecutivo</h4>
              <p className="text-sm leading-relaxed">{insights.summary}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.keyDrivers && insights.keyDrivers.length > 0 && (
                <div className="bg-white/5 rounded-lg p-4">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-[#26C5DB] mb-3">Factores Clave</h4>
                  <ul className="space-y-2">
                    {insights.keyDrivers.map((d, i) => (
                      <li key={i} className="text-sm flex items-start space-x-2">
                        <span className="mt-1.5 h-1 w-1 rounded-full bg-white shrink-0" />
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {insights.anomalies && insights.anomalies.length > 0 && (
                <div className="bg-white/5 rounded-lg p-4">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-orange-400 mb-3">Anomalías Detectadas</h4>
                  <ul className="space-y-2">
                    {insights.anomalies.map((a, i) => (
                      <li key={i} className="text-sm flex items-start space-x-2">
                        <span className="mt-1.5 h-1 w-1 rounded-full bg-orange-400 shrink-0" />
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {insights.recommendations && insights.recommendations.length > 0 && (
              <div className="bg-white/5 rounded-lg p-4 border-l-4 border-[#26C5DB]">
                <h4 className="text-sm font-bold uppercase tracking-wider text-[#26C5DB] mb-3">Recomendaciones Estratégicas</h4>
                <ul className="space-y-3">
                  {insights.recommendations.map((r, i) => (
                    <li key={i} className="text-sm flex items-start space-x-3">
                      <div className="bg-[#26C5DB]/20 p-1 rounded">
                        <Info size={14} className="text-[#26C5DB]" />
                      </div>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="py-4 text-center text-white/60 italic text-sm">
            Presiona el botón para generar un reporte automatizado basado en los filtros seleccionados.
          </div>
        )}
      </CardContent>
      {insights && (
        <CardFooter className="pt-0 flex justify-end">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setInsights(null)}
            className="text-white/40 hover:text-white hover:bg-white/10"
          >
            Refrescar análisis
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
