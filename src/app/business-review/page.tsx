
"use client";

import React, { useState, useMemo } from "react";
import { collection } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { SalesRecord, Filters } from "@/types/sales";
import { 
  Loader2, UserSearch, Info, Sparkles, TrendingUp, TrendingDown, 
  Database, ArrowUpRight, ArrowDownRight, CalendarRange, ChevronUp, ChevronDown,
  Calendar, BarChart3, Clock, LayoutDashboard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { generateSupplierInsights, GenerateSupplierInsightsOutput } from "@/ai/flows/generate-supplier-insights";
import { cn } from "@/lib/utils";

const SPANISH_MONTHS: Record<string, string> = {
  "01": "ene", "02": "feb", "03": "mar", "04": "abr", "05": "may", "06": "jun",
  "07": "jul", "08": "ago", "09": "sep", "10": "oct", "11": "nov", "12": "dic"
};

function formatSpanishDate(dateStr: string) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length < 2) return dateStr;
  return `${SPANISH_MONTHS[parts[1]] || parts[1]}-${parts[0].substring(2)}`;
}

function formatValueAbbrev(val: number | null | undefined) {
  if (val === null || val === undefined) return "--";
  const absVal = Math.abs(val);
  if (absVal >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
  if (absVal >= 1000) return `${(val / 1000).toFixed(0)}K`;
  return val.toFixed(0);
}

function formatFullSpanishNumber(val: number, isCurrency: boolean = false) {
  const formatted = new Intl.NumberFormat('es-ES', { 
    maximumFractionDigits: 0,
    minimumFractionDigits: 0 
  }).format(Math.round(val));
  return isCurrency ? `$${formatted}` : formatted;
}

const getDomain = (data: any[], keys: string[]) => {
  if (!data || data.length === 0) return [0, 'auto'];
  let minVal = Infinity;
  let maxVal = -Infinity;
  data.forEach(item => {
    keys.forEach(k => {
      const v = Number(item[k]);
      if (!isNaN(v)) {
        if (v < minVal) minVal = v;
        if (v > maxVal) maxVal = v;
      }
    });
  });
  if (minVal === Infinity) return [0, 'auto'];
  const padding = (maxVal - minVal) * 0.1;
  return [Math.max(0, minVal - padding), maxVal + padding];
};

export default function BusinessReviewPage() {
  const db = useFirestore();
  const salesQuery = useMemoFirebase(() => (db ? collection(db, "ventas_mensuales") : null), [db]);
  const { data: rawData, loading } = useCollection<SalesRecord>(salesQuery as any);

  const [filters, setFilters] = useState<Filters>({
    mode: "USD",
    division: [],
    grupo: [],
    departamento: [],
    clase: [],
    subclase: [],
    proveedor: null,
    startDate: undefined,
    endDate: undefined
  });

  const [aiInsights, setAiInsights] = useState<GenerateSupplierInsightsOutput | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [skuSort, setSkuSort] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'ventaU6M', direction: 'desc' });

  const cleanData = useMemo(() => {
    if (!rawData) return [];
    return rawData.filter(item => {
      const div = item.Division?.toString()?.trim()?.toUpperCase();
      const codProv = String(item.Codigo_Proveedor || "").trim().toUpperCase();
      return div && div !== "NULL" && div !== "IPOCONSUMO" && codProv !== "NULL";
    });
  }, [rawData]);

  const activeCategoryInfo = useMemo(() => {
    if (filters.subclase.length > 0) return { label: "Subclase", values: filters.subclase, key: "Subclase" };
    if (filters.clase.length > 0) return { label: "Clase", values: filters.clase, key: "Clase" };
    if (filters.departamento.length > 0) return { label: "Departamento", values: filters.departamento, key: "Departamento" };
    if (filters.grupo.length > 0) return { label: "Grupo", values: filters.grupo, key: "Grupo" };
    if (filters.division.length > 0) return { label: "División", values: filters.division, key: "Division" };
    return { label: "Total Farmatodo", values: [], key: null };
  }, [filters]);

  const filteredSupplierData = useMemo(() => {
    if (!filters.proveedor || !rawData) return [];
    const targetProv = filters.proveedor.trim().toUpperCase();
    
    return cleanData.filter(d => {
      const provName = String(d.Nombre_Proveedor || "").trim().toUpperCase();
      if (provName !== targetProv) return false;

      if (filters.division.length > 0 && !filters.division.includes(d.Division)) return false;
      if (filters.grupo.length > 0 && !filters.grupo.includes(d.Grupo)) return false;
      if (filters.departamento.length > 0 && !filters.departamento.includes(d.Departamento)) return false;
      if (filters.clase.length > 0 && d.Clase && !filters.clase.includes(d.Clase)) return false;
      if (filters.subclase.length > 0 && d.Subclase && !filters.subclase.includes(d.Subclase)) return false;

      return true;
    });
  }, [cleanData, rawData, filters]);

  const dateFilteredSupplierData = useMemo(() => {
    return filteredSupplierData.filter(d => {
      if (filters.startDate && d.Fecha_Mes.substring(0, 7) < filters.startDate) return false;
      if (filters.endDate && d.Fecha_Mes.substring(0, 7) > filters.endDate) return false;
      return true;
    });
  }, [filteredSupplierData, filters.startDate, filters.endDate]);

  const sortedMonths = useMemo(() => {
    if (cleanData.length === 0) return [];
    return Array.from(new Set(cleanData.map(d => d.Fecha_Mes))).sort().reverse();
  }, [cleanData]);

  const kpis = useMemo(() => {
    if (!filters.proveedor || !rawData || sortedMonths.length === 0) return null;
    const valKey = filters.mode === "USD" ? "Ventas_USD" : "Unidades_Vendidas";

    const marketData = cleanData.filter(d => {
      if (filters.division.length > 0 && !filters.division.includes(d.Division)) return false;
      if (filters.grupo.length > 0 && !filters.grupo.includes(d.Grupo)) return false;
      if (filters.departamento.length > 0 && !filters.departamento.includes(d.Departamento)) return false;
      if (filters.clase.length > 0 && d.Clase && !filters.clase.includes(d.Clase)) return false;
      if (filters.subclase.length > 0 && d.Subclase && !filters.subclase.includes(d.Subclase)) return false;
      return true;
    });

    const sumByMonths = (dataArr: SalesRecord[], monthList: string[]) => 
      dataArr.filter(d => monthList.includes(d.Fecha_Mes)).reduce((acc, c) => acc + (Number(c[valKey]) || 0), 0);
    
    const lastMonth = sortedMonths[0];
    const priorMonth = sortedMonths[1];
    const sameMonthLastYearStr = sortedMonths.find(monthStr => {
      const partsLM = lastMonth.split("-").map(Number);
      const partsM = monthStr.split("-").map(Number);
      return partsM[0] === partsLM[0] - 1 && partsM[1] === partsLM[1];
    });

    const calcStats = (data: SalesRecord[]) => {
      const vLM = sumByMonths(data, [lastMonth]);
      const vPriorMonth = priorMonth ? sumByMonths(data, [priorMonth]) : 0;
      const vSMLY = sameMonthLastYearStr ? sumByMonths(data, [sameMonthLastYearStr]) : 0;
      
      const lmVarMonth = vPriorMonth ? ((vLM - vPriorMonth) / vPriorMonth) * 100 : 0;
      const lmVarYear = vSMLY ? ((vLM - vSMLY) / vSMLY) * 100 : 0;

      const v6m = sumByMonths(data, sortedMonths.slice(0, 6));
      const p6m = sumByMonths(data, sortedMonths.slice(6, 12));
      const var6m = p6m ? ((v6m - p6m) / p6m) * 100 : 0;

      const v12m = sumByMonths(data, sortedMonths.slice(0, 12));
      const p12m = sumByMonths(data, sortedMonths.slice(12, 24));
      const var12m = p12m ? ((v12m - p12m) / p12m) * 100 : 0;

      const avg6m = v6m / (Math.min(6, sortedMonths.length) || 1);
      const avgPrev6m = p6m / (Math.min(6, sortedMonths.length - 6) || 1);
      const varAvg6m = avgPrev6m ? ((avg6m - avgPrev6m) / avgPrev6m) * 100 : 0;

      return { vLM, lmVarMonth, lmVarYear, v6m, var6m, v12m, var12m, avg6m, varAvg6m };
    };

    const selectedPeriodSales = dateFilteredSupplierData.reduce((acc, curr) => acc + (Number(curr[valKey]) || 0), 0);
    const uniqueMonthsInPeriod = Array.from(new Set(dateFilteredSupplierData.map(d => d.Fecha_Mes))).length;
    const avgMonthlyPeriod = selectedPeriodSales / (uniqueMonthsInPeriod || 1);

    return {
      supplier: calcStats(filteredSupplierData),
      market: calcStats(marketData),
      period: {
        total: selectedPeriodSales,
        avg: avgMonthlyPeriod
      },
      lastMonthLabel: lastMonth
    };
  }, [filteredSupplierData, cleanData, sortedMonths, filters, dateFilteredSupplierData]);

  const dateRangeLabel = useMemo(() => {
    if (filters.startDate && filters.endDate) return `${filters.startDate} a ${filters.endDate}`;
    if (filters.startDate) return `Desde ${filters.startDate}`;
    if (filters.endDate) return `Hasta ${filters.endDate}`;
    return "Todo el período";
  }, [filters.startDate, filters.endDate]);

  const evolutionData = useMemo(() => getEvolutionData(dateFilteredSupplierData, filters.mode), [dateFilteredSupplierData, filters.mode]);

  const shareEvolutionData = useMemo(() => {
    if (!filters.proveedor || evolutionData.length === 0) return [];
    const valKey = filters.mode === "USD" ? "Ventas_USD" : "Unidades_Vendidas";
    
    // Filter the market based on the most granular category selected
    const marketFilteredData = cleanData.filter(d => {
      if (activeCategoryInfo.key && activeCategoryInfo.values.length > 0) {
        return activeCategoryInfo.values.includes((d as any)[activeCategoryInfo.key]);
      }
      return true; // No categories selected, compare against entire chain
    });

    const months = evolutionData.map(d => d.month);
    return months.map(m => {
      const supplierValue = evolutionData.find(d => d.month === m)?.value || 0;
      const marketValue = marketFilteredData
        .filter(d => d.Fecha_Mes === m)
        .reduce((acc, curr) => acc + (Number(curr[valKey]) || 0), 0);
      
      return {
        month: m,
        displayMonth: formatSpanishDate(m),
        share: marketValue > 0 ? (supplierValue / marketValue) * 100 : 0
      };
    });
  }, [cleanData, evolutionData, filters, activeCategoryInfo]);

  const skuTableData = useMemo(() => {
    if (!filters.proveedor || filteredSupplierData.length === 0) return [];
    
    const valKey = filters.mode === "USD" ? "Ventas_USD" : "Unidades_Vendidas";
    const lastMonth = sortedMonths[0];
    const last6m = sortedMonths.slice(0, 6);
    const prev6m = sortedMonths.slice(6, 12);
    
    const sameMonthLastYearStr = sortedMonths.find(m => {
      if (!lastMonth) return false;
      const [ly, lm] = lastMonth.split('-').map(Number);
      const [y, mm] = m.split('-').map(Number);
      return y === ly - 1 && mm === lm;
    });

    const skuMap = new Map<string, any>();

    filteredSupplierData.forEach(d => {
      if (!skuMap.has(d.SKU)) {
        skuMap.set(d.SKU, {
          sku: d.SKU,
          description: d.Descripcion_Producto,
          ventaU6M: 0,
          prevVentaU6M: 0,
          ventaLM: 0,
          ventaLY: 0,
          unitsU6M: 0
        });
      }
      const item = skuMap.get(d.SKU);
      const val = Number(d[valKey]) || 0;
      const units = Number(d.Unidades_Vendidas) || 0;

      if (last6m.includes(d.Fecha_Mes)) {
        item.ventaU6M += val;
        item.unitsU6M += units;
      }
      if (prev6m.includes(d.Fecha_Mes)) item.prevVentaU6M += val;
      if (d.Fecha_Mes === lastMonth) item.ventaLM += val;
      if (sameMonthLastYearStr && d.Fecha_Mes === sameMonthLastYearStr) item.ventaLY += val;
    });

    const items = Array.from(skuMap.values()).map(it => ({
      ...it,
      varU6M: it.prevVentaU6M ? ((it.ventaU6M - it.prevVentaU6M) / it.prevVentaU6M) * 100 : 0,
      varLY: it.ventaLY ? ((it.ventaLM - it.ventaLY) / it.ventaLY) * 100 : 0
    }));

    const ranked = items.sort((a, b) => b.ventaU6M - a.ventaU6M);
    ranked.forEach((it, idx) => it.rank = idx + 1);

    return ranked.sort((a, b) => {
      const aVal = (a as any)[skuSort.key];
      const bVal = (b as any)[skuSort.key];
      if (skuSort.direction === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });
  }, [filteredSupplierData, sortedMonths, filters.mode, skuSort]);

  const handleSort = (key: string) => {
    setSkuSort(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const rankings = useMemo(() => {
    if (!filters.proveedor || !rawData || filteredSupplierData.length === 0) return [];
    const valKey = filters.mode === "USD" ? "Ventas_USD" : "Unidades_Vendidas";
    const targetProv = filters.proveedor.trim().toUpperCase();

    const levels = [
      { key: "Grupo" as const, label: "GRUPOS" },
      { key: "Departamento" as const, label: "DEPARTAMENTOS" },
      { key: "Clase" as const, label: "CLASES" },
      { key: "Subclase" as const, label: "SUBCLASES" }
    ];

    const results: any[] = [];
    levels.forEach(level => {
      const supplierCategories = Array.from(new Set(filteredSupplierData.map(d => (d as any)[level.key]))).filter(Boolean);
      supplierCategories.forEach(catName => {
        const catData = cleanData.filter(d => (d as any)[level.key] === catName);
        const totalCatSales = catData.reduce((acc, c) => acc + (Number(c[valKey]) || 0), 0);
        
        const supplierTotals = catData.reduce((acc, c) => {
          const name = String(c.Nombre_Proveedor || "").trim().toUpperCase();
          acc[name] = (acc[name] || 0) + (Number(c[valKey]) || 0);
          return acc;
        }, {} as Record<string, number>);
        
        const sortedSuppliers = Object.entries(supplierTotals).sort((a, b) => b[1] - a[1]);
        const rank = sortedSuppliers.findIndex(([name]) => name === targetProv) + 1;

        if (rank > 0) {
          results.push({
            levelLabel: level.label,
            category: catName,
            share: (supplierTotals[targetProv] / (totalCatSales || 1)) * 100,
            rank,
            totalSuppliers: sortedSuppliers.length
          });
        }
      });
    });
    return results;
  }, [filters.proveedor, rawData, filteredSupplierData, cleanData, filters.mode]);

  const handleGenerateInsights = async () => {
    if (!kpis) return;
    setAiLoading(true);
    try {
      const topProductsMap = filteredSupplierData.reduce((acc, curr) => {
        const key = curr.Descripcion_Producto;
        acc[key] = (acc[key] || 0) + (Number(curr[filters.mode === "USD" ? "Ventas_USD" : "Unidades_Vendidas"]) || 0);
        return acc;
      }, {} as Record<string, number>);
      
      const sortedProds = Object.entries(topProductsMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

      const res = await generateSupplierInsights({
        supplierName: filters.proveedor!,
        performanceKpis: {
          lastMonthSales: kpis.supplier.vLM,
          lastMonthVariation: kpis.supplier.lmVarYear,
          variation3m: kpis.supplier.var6m,
          variation6m: kpis.supplier.var6m,
          avgMonthlySales6m: kpis.supplier.avg6m
        },
        rankings: rankings.map(r => ({ level: r.levelLabel, category: r.category, share: Number(r.share), rank: r.rank, totalSuppliers: r.totalSuppliers })),
        topSkus: sortedProds.map(([name, sales]) => ({
          sku: "",
          description: name,
          sales,
          variation: null
        }))
      });
      setAiInsights(res);
    } catch (err) {
      console.error("Error generating AI insights:", err);
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#1E3A6E]" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <Navbar />
      
      <div className="sticky top-16 z-40 bg-white pb-4 border-b shadow-md">
        <div className="container mx-auto px-4 pt-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-2xl font-bold text-[#1E3A6E]">Revisión de Negocio</h2>
              <p className="text-xs text-muted-foreground">Análisis estratégico · {dateRangeLabel}</p>
            </div>
            {filters.proveedor && (
              <div className="flex items-center gap-3">
                <div className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded border">
                  {filteredSupplierData.length.toLocaleString()} documentos encontrados
                </div>
                <div className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded border uppercase flex items-center gap-1">
                  <Database size={10} />
                  Analizando: {filters.proveedor}
                </div>
              </div>
            )}
          </div>
          <FilterBar filters={filters} setFilters={setFilters} allData={cleanData} />
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 space-y-8">
        {!filters.proveedor ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-6 bg-white rounded-xl border border-dashed border-gray-300">
            <UserSearch size={56} className="text-slate-300" />
            <div className="text-center">
              <h3 className="text-xl font-bold">Selecciona un proveedor</h3>
              <p className="text-muted-foreground">Usa el buscador para iniciar el análisis estratégico.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              <KPIBenchmarkCard 
                title="Venta Total Últ. 6 Meses" 
                icon={<Calendar size={18} />}
                color="blue"
                supplierValue={kpis?.supplier.v6m}
                supplierVar={kpis?.supplier.var6m}
                marketVar={kpis?.market.var6m}
                varLabel="vs prev 6m"
                filters={filters}
              />
              <KPIBenchmarkCard 
                title="Venta Total Año Móvil" 
                icon={<TrendingUp size={18} />}
                color="indigo"
                supplierValue={kpis?.supplier.v12m}
                supplierVar={kpis?.supplier.var12m}
                marketVar={kpis?.market.var12m}
                varLabel="vs año ant."
                filters={filters}
                hideVariation={true}
              />
              <KPIBenchmarkCard 
                title="Promedio Mensual U6M" 
                icon={<BarChart3 size={18} />}
                color="cyan"
                supplierValue={kpis?.supplier.avg6m}
                supplierVar={kpis?.supplier.varAvg6m}
                marketVar={kpis?.market.varAvg6m}
                varLabel="vs prev 6m"
                filters={filters}
              />
              <KPIBenchmarkCard 
                title={`Último Mes (${kpis?.lastMonthLabel?.substring(0, 7) || '--'})`} 
                icon={<Clock size={18} />}
                color="emerald"
                supplierValue={kpis?.supplier.vLM}
                supplierVar={kpis?.supplier.lmVarYear}
                supplierVarSecondary={kpis?.supplier.lmVarMonth}
                varLabel="vs año ant."
                varLabelSecondary="vs mes ant."
                filters={filters}
                hideBenchmark
              />
              <Card className="border-none shadow-md bg-teal-50/80 border-teal-100 min-h-[100px]">
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="p-1.5 bg-teal-600 rounded text-white">
                      <CalendarRange size={14} />
                    </div>
                    <span className="text-[8px] font-black uppercase text-teal-600 bg-teal-100 px-1.5 py-0.5 rounded tracking-tighter">
                      Período
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-teal-800 uppercase tracking-tight flex flex-col">
                      Período Seleccionado
                      <span className="text-[8px] font-medium text-teal-600/70 lowercase normal-case">{dateRangeLabel}</span>
                    </p>
                    <div className="flex flex-col">
                      <h3 className="text-base font-black text-teal-900 leading-tight">
                        {formatFullSpanishNumber(kpis?.period.total || 0, filters.mode === 'USD')}
                      </h3>
                      <p className="text-[8px] font-semibold text-teal-700/80">
                        Prom. {formatFullSpanishNumber(kpis?.period.avg || 0, filters.mode === 'USD')} / mes
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-none shadow-sm">
                <CardHeader className="py-4">
                  <CardTitle className="text-base font-bold">Evolución de Ventas ({filters.mode})</CardTitle>
                  <p className="text-[10px] text-slate-400">Tendencia mensual · {filters.proveedor}</p>
                </CardHeader>
                <CardContent className="h-[300px] px-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={evolutionData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="displayMonth" fontSize={9} axisLine={false} tickLine={false} />
                      <YAxis fontSize={9} axisLine={false} tickLine={false} tickFormatter={formatValueAbbrev} domain={getDomain(evolutionData, ['value']) as any} />
                      <Tooltip 
                        formatter={(val: number) => formatFullSpanishNumber(val, filters.mode === 'USD')}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        labelStyle={{ fontWeight: 'bold', color: '#64748B', fontSize: '10px' }}
                      />
                      <Line type="monotone" dataKey="value" name={filters.mode === 'USD' ? 'Venta USD' : 'Unidades'} stroke="#1E3A6E" strokeWidth={2.5} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader className="py-4">
                  <CardTitle className="text-base font-bold">Evolución del Share · {activeCategoryInfo.label}</CardTitle>
                  <p className="text-[10px] text-slate-400">Participación porcentual mensual · {dateRangeLabel}</p>
                </CardHeader>
                <CardContent className="h-[300px] px-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={shareEvolutionData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="displayMonth" fontSize={9} axisLine={false} tickLine={false} />
                      <YAxis fontSize={9} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 'auto']} />
                      <Tooltip 
                        formatter={(val: number) => [`${val.toFixed(2)}%`, 'Share']}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        labelStyle={{ fontWeight: 'bold', color: '#64748B', fontSize: '10px' }}
                      />
                      <Line type="monotone" dataKey="share" name="Market Share" stroke="#26C5DB" strokeWidth={2.5} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50 border-b py-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Info size={16} className="text-[#1E3A6E]" />
                  Posicionamiento y Participación en el Mercado ({activeCategoryInfo.label})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-500 text-[9px] uppercase font-bold border-b">
                        <th className="px-6 py-3 text-left">Categoría / Nivel</th>
                        <th className="px-6 py-3 text-center">Peso % (Share)</th>
                        <th className="px-6 py-3 text-center">Ranking</th>
                        <th className="px-6 py-3 text-center">Total Proveedores</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {Array.from(new Set(rankings.map(r => r.levelLabel))).map(label => (
                        <React.Fragment key={label}>
                          <tr className="bg-slate-50">
                            <td colSpan={4} className="px-6 py-1.5 text-[9px] font-black text-slate-400 tracking-widest border-y uppercase">{label}</td>
                          </tr>
                          {rankings.filter(r => r.levelLabel === label).map((r, i) => (
                            <tr key={`${label}-${i}`} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-3">
                                <p className="font-semibold text-slate-700 uppercase">{r.category}</p>
                              </td>
                              <td className="px-6 py-3 text-center">
                                <div className="inline-flex items-center gap-2">
                                  <span className="font-bold text-blue-600">{r.share.toFixed(1)}%</span>
                                  <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="bg-blue-600 h-full" style={{ width: `${Math.min(100, r.share)}%` }} />
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-3 text-center">
                                <span className={cn(
                                  "px-2 py-0.5 rounded text-[10px] font-bold",
                                  r.rank <= 3 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"
                                )}>
                                  {r.rank}º Lugar
                                </span>
                              </td>
                              <td className="px-6 py-3 text-center text-slate-500 font-medium">
                                {r.totalSuppliers}
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="py-4 border-b">
                <CardTitle className="text-sm font-bold">Detalle de SKUs</CardTitle>
                <p className="text-[10px] text-slate-400">Comportamiento detallado por producto · Últimos 6 meses</p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto max-h-[500px] scrollbar-thin">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 z-20 bg-slate-50 shadow-sm">
                      <tr className="text-slate-500 text-[9px] uppercase font-bold border-b">
                        <SortHeader label="SKU" sortKey="sku" currentSort={skuSort} onSort={handleSort} />
                        <SortHeader label="Producto" sortKey="description" currentSort={skuSort} onSort={handleSort} />
                        <SortHeader label="Venta U6M" sortKey="ventaU6M" currentSort={skuSort} onSort={handleSort} />
                        <SortHeader label="Var. 6M %" sortKey="varU6M" currentSort={skuSort} onSort={handleSort} />
                        <SortHeader label="Último Mes" sortKey="ventaLM" currentSort={skuSort} onSort={handleSort} />
                        <SortHeader label="Var. LY %" sortKey="varLY" currentSort={skuSort} onSort={handleSort} />
                        <SortHeader label="Ranking" sortKey="rank" currentSort={skuSort} onSort={handleSort} />
                        <SortHeader label="Units U6M" sortKey="unitsU6M" currentSort={skuSort} onSort={handleSort} />
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {skuTableData.map((item) => (
                        <tr key={item.sku} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-mono text-slate-400">{item.sku}</td>
                          <td className="px-4 py-3 font-semibold text-slate-700 truncate max-w-[200px]">{item.description}</td>
                          <td className="px-4 py-3 text-center font-bold">{formatFullSpanishNumber(item.ventaU6M, filters.mode === 'USD')}</td>
                          <td className={cn("px-4 py-3 text-center font-bold", item.varU6M >= 0 ? "text-green-600" : "text-red-600")}>
                            {item.varU6M.toFixed(1)}%
                          </td>
                          <td className="px-4 py-3 text-center font-medium text-slate-600">{formatFullSpanishNumber(item.ventaLM, filters.mode === 'USD')}</td>
                          <td className={cn("px-4 py-3 text-center font-bold", item.varLY >= 0 ? "text-green-600" : "text-red-600")}>
                            {item.varLY.toFixed(1)}%
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                              #{item.rank}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-medium text-slate-500">{formatFullSpanishNumber(item.unitsU6M)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <AIInsightsSection loading={aiLoading} insights={aiInsights} onGenerate={handleGenerateInsights} onClear={() => setAiInsights(null)} />
          </div>
        )}
      </main>
    </div>
  );
}

function SortHeader({ label, sortKey, currentSort, onSort }: any) {
  const active = currentSort.key === sortKey;
  return (
    <th className="px-4 py-3 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => onSort(sortKey)}>
      <div className="flex items-center justify-center gap-1">
        {label}
        <div className="flex flex-col opacity-30">
          <ChevronUp size={10} className={cn(active && currentSort.direction === 'asc' && "opacity-100 text-blue-600")} />
          <ChevronDown size={10} className={cn(active && currentSort.direction === 'desc' && "opacity-100 text-blue-600")} />
        </div>
      </div>
    </th>
  );
}

function KPIBenchmarkCard({ 
  title, icon, color, 
  supplierValue, supplierVar, supplierVarSecondary,
  marketVar, 
  varLabel, varLabelSecondary,
  filters,
  hideBenchmark = false,
  hideVariation = false
}: any) {
  const categoryLabel = filters.subclase.length > 0 ? filters.subclase[0] : 
                        filters.clase.length > 0 ? filters.clase[0] :
                        filters.departamento.length > 0 ? filters.departamento[0] :
                        filters.grupo.length > 0 ? filters.grupo[0] :
                        filters.division.length > 0 ? filters.division[0] : "General";

  const colorClasses: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    indigo: "bg-indigo-50 text-indigo-600",
    cyan: "bg-cyan-50 text-cyan-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };

  return (
    <Card className="border-none shadow-sm min-h-[100px] h-auto">
      <CardContent className="p-4 space-y-2">
        <div className="flex justify-between items-start">
          <div className={cn("p-1.5 rounded-lg", colorClasses[color])}>
            {icon}
          </div>
          <div className="flex flex-col items-end gap-0.5">
            {!hideVariation && (
              <>
                <VariationBadge value={supplierVar} label={varLabel} />
                {supplierVarSecondary !== undefined && (
                  <VariationBadge value={supplierVarSecondary} label={varLabelSecondary} />
                )}
              </>
            )}
          </div>
        </div>
        
        <div>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{title}</p>
          <h3 className="text-base font-black text-[#1E3A6E] tracking-tight">
            {formatFullSpanishNumber(supplierValue || 0, filters.mode === 'USD')}
          </h3>
        </div>

        {!hideBenchmark && (
          <>
            <div className="h-[1px] bg-slate-100" />
            <div className="space-y-1">
              <div className="flex flex-col gap-0.5">
                <p className="text-[8px] text-slate-500 font-bold uppercase leading-tight whitespace-normal break-words">
                  Total Farmatodo ({categoryLabel})
                </p>
                {!hideVariation && (
                  <VariationBadge value={marketVar} label={varLabel} small />
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function VariationBadge({ value, label, small = false }: { value: number, label: string, small?: boolean }) {
  const isPos = (value ?? 0) >= 0;
  return (
    <div className={cn(
      "flex items-center gap-0.5 font-bold shrink-0", 
      isPos ? "text-green-600" : "text-red-600",
      small ? "text-[8px]" : "text-[10px]"
    )}>
      {isPos ? <ArrowUpRight size={small ? 8 : 12} /> : <ArrowDownRight size={small ? 8 : 12} />}
      {Math.abs(value || 0).toFixed(1)}%
      <span className="ml-1 text-slate-400 font-normal tracking-tight">{label}</span>
    </div>
  );
}

function AIInsightsSection({ loading, insights, onGenerate, onClear }: any) {
  return (
    <Card className="border-none shadow-md bg-gradient-to-br from-[#1E3A6E] to-[#2768DB] text-white">
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <Sparkles className="text-[#26C5DB]" />
          <CardTitle className="text-base">Análisis Estratégico IA</CardTitle>
        </div>
        {!insights && !loading && (
          <Button variant="secondary" size="sm" onClick={onGenerate} className="bg-[#26C5DB] border-none text-white hover:bg-[#20a9bc] h-8 text-[10px]">
            Generar Reporte IA
          </Button>
        )}
      </CardHeader>
      <CardContent className="pb-6">
        {loading ? (
          <div className="flex flex-col items-center py-8 gap-4">
            <Loader2 className="animate-spin h-6 w-6 text-[#26C5DB]" />
            <p className="text-xs">Procesando registros detallados...</p>
          </div>
        ) : insights ? (
          <div className="space-y-4">
            <div className="bg-white/10 p-3 rounded-lg">
              <p className="text-xs leading-relaxed">{insights.summary}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <InsightBox title="Fortalezas" items={insights.strengths} color="text-green-400" />
              <InsightBox title="Oportunidades" items={insights.opportunities} color="text-amber-400" />
            </div>
            <div className="bg-white/5 border-l-4 border-[#26C5DB] p-3 rounded-r-lg">
              <h4 className="text-[10px] font-bold uppercase text-[#26C5DB] mb-2">Recomendaciones</h4>
              <ul className="space-y-1.5 text-xs">
                {insights.recommendations.map((r: string, i: number) => (
                  <li key={i} className="flex gap-2"><span className="text-[#26C5DB]">●</span>{r}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="py-2 text-center text-white/40 italic text-xs">
            Inicia la generación para obtener insights de consultoría automatizados.
          </div>
        )}
      </CardContent>
      {insights && (
        <CardFooter className="pt-0 flex justify-end pb-4">
           <Button variant="ghost" size="sm" onClick={onClear} className="text-white/40 hover:text-white hover:bg-white/10 h-7 text-[10px]">Refrescar</Button>
        </CardFooter>
      )}
    </Card>
  );
}

function InsightBox({ title, items, color }: any) {
  return (
    <div className="bg-white/5 p-3 rounded-lg">
      <h4 className={cn("text-[10px] font-bold uppercase mb-2", color)}>{title}</h4>
      <ul className="space-y-1.5 text-[11px]">
        {items.map((it: string, i: number) => (
          <li key={i} className="flex gap-2"><span className="opacity-50">•</span> {it}</li>
        ))}
      </ul>
    </div>
  );
}

function getEvolutionData(data: SalesRecord[], mode: string) {
  const valKey = mode === "USD" ? "Ventas_USD" : "Unidades_Vendidas";
  const months = Array.from(new Set(data.map(d => d.Fecha_Mes))).sort();
  return months.map(m => ({
    month: m,
    displayMonth: formatSpanishDate(m),
    value: data.filter(d => d.Fecha_Mes === m).reduce((acc, c) => acc + (Number(c[valKey]) || 0), 0)
  }));
}
