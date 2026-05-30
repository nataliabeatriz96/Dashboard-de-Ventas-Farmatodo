
"use client";

import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { SalesRecord, ViewMode, Filters } from "@/types/sales";
import { ArrowUpRight, ArrowDownRight, TrendingUp, Calendar, BarChart3, Clock, CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardsProps {
  data: SalesRecord[]; // Datos filtrados por categorías pero NO por fecha (para los 4 principales)
  dateFilteredData: SalesRecord[]; // Datos filtrados por categorías Y por fecha (para el 5to)
  mode: ViewMode;
  filters: Filters;
}

export function KPICards({ data, dateFilteredData, mode, filters }: KPICardsProps) {
  const valKey = mode === "USD" ? "Ventas_USD" : "Unidades_Vendidas";
  
  // Obtenemos meses únicos ordenados del set BASE
  const sortedMonths = Array.from(new Set(data.map(d => d.Fecha_Mes).filter(Boolean))).sort().reverse();
  const lastMonth = sortedMonths[0];
  const priorMonth = sortedMonths[1];

  const sameMonthLastYear = sortedMonths.find(m => {
    if (!lastMonth || !m) return false;
    const partsM = m.split('-');
    const partsL = lastMonth.split('-');
    if (partsM.length < 2 || partsL.length < 2) return false;
    
    const year = Number(partsM[0]);
    const month = Number(partsM[1]);
    const lastYear = Number(partsL[0]);
    const lastMonthNum = Number(partsL[1]);
    
    return year === lastYear - 1 && month === lastMonthNum;
  });

  const sumByMonth = (dataArr: SalesRecord[], monthArr: string[]) => {
    if (!monthArr.length) return 0;
    const monthSet = new Set(monthArr);
    return dataArr
      .filter(d => d.Fecha_Mes && monthSet.has(d.Fecha_Mes))
      .reduce((acc, curr) => acc + (Number(curr[valKey]) || 0), 0);
  };

  // KPIs FIJOS (Independientes del date picker)
  const last6Months = sortedMonths.slice(0, 6);
  const prev6Months = sortedMonths.slice(6, 12);
  const last12Months = sortedMonths.slice(0, 12);
  const prior12Months = sortedMonths.slice(12, 24);

  const v6mValue = sumByMonth(data, last6Months);
  const prev6mValue = sumByMonth(data, prev6Months);
  const var6m = prev6mValue ? ((v6mValue - prev6mValue) / prev6mValue) * 100 : 0;

  const v12mValue = sumByMonth(data, last12Months);
  const prior12mValue = sumByMonth(data, prior12Months);
  const var12m = prior12mValue ? ((v12mValue - prior12mValue) / prior12mValue) * 100 : 0;

  const avg6mValue = v6mValue / (last6Months.length || 1);
  const avgPrev6mValue = prev6mValue / (prev6Months.length || 1);
  const varAvg6m = avgPrev6mValue ? ((avg6mValue - avgPrev6mValue) / avgPrev6mValue) * 100 : 0;

  const lastMonthValue = sumByMonth(data, lastMonth ? [lastMonth] : []);
  const priorMonthValue = sumByMonth(data, priorMonth ? [priorMonth] : []);
  const sameMonthLastYearValue = sumByMonth(data, sameMonthLastYear ? [sameMonthLastYear] : []);
  
  const varMonthPrior = priorMonthValue ? ((lastMonthValue - priorMonthValue) / priorMonthValue) * 100 : 0;
  const varMonthYear = sameMonthLastYearValue ? ((lastMonthValue - sameMonthLastYearValue) / sameMonthLastYearValue) * 100 : 0;

  // KPI DINÁMICO (Responde al date picker)
  const selectedPeriodSales = dateFilteredData.reduce((acc, curr) => acc + (Number(curr[valKey]) || 0), 0);
  const uniqueMonthsInPeriod = Array.from(new Set(dateFilteredData.map(d => d.Fecha_Mes))).length;
  const avgMonthlyPeriod = selectedPeriodSales / (uniqueMonthsInPeriod || 1);

  const dateRangeLabel = useMemo(() => {
    if (filters.startDate && filters.endDate) return `${filters.startDate} a ${filters.endDate}`;
    if (filters.startDate) return `Desde ${filters.startDate}`;
    if (filters.endDate) return `Hasta ${filters.endDate}`;
    return "Todo el período";
  }, [filters.startDate, filters.endDate]);

  const formatVal = (val: number) => 
    mode === "USD" 
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val)
      : new Intl.NumberFormat('en-US').format(val);

  const VariationLabel = ({ value, label }: { value: number, label?: string }) => (
    <div className={`flex items-center text-xs font-bold ${value >= 0 ? "text-green-600" : "text-red-600"}`}>
      {value >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
      <span>{Math.abs(value).toFixed(1)}%</span>
      {label && <span className="ml-1 text-[10px] text-muted-foreground font-normal tracking-tight">{label}</span>}
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <Card className="border-none shadow-sm bg-white">
        <CardContent className="p-5 space-y-2">
          <div className="flex justify-between items-start">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Calendar size={18} />
            </div>
            <VariationLabel value={var6m} label="vs prev 6m" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">Venta Total Últ. 6 Meses</p>
            <h3 className="text-xl font-bold tracking-tight">{formatVal(v6mValue)}</h3>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm bg-white">
        <CardContent className="p-5 space-y-2">
          <div className="flex justify-between items-start">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <TrendingUp size={18} />
            </div>
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">Venta Total Año Móvil</p>
            <h3 className="text-xl font-bold tracking-tight">{formatVal(v12mValue)}</h3>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm bg-white">
        <CardContent className="p-5 space-y-2">
          <div className="flex justify-between items-start">
            <div className="p-2 bg-cyan-50 rounded-lg text-cyan-600">
              <BarChart3 size={18} />
            </div>
            <VariationLabel value={varAvg6m} label="vs prev 6m" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">Promedio Mensual U6M</p>
            <h3 className="text-xl font-bold tracking-tight">{formatVal(avg6mValue)}</h3>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm bg-white">
        <CardContent className="p-5 space-y-2">
          <div className="flex justify-between items-start">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <Clock size={18} />
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <VariationLabel value={varMonthPrior} label="vs mes ant." />
              <VariationLabel value={varMonthYear} label="vs año ant." />
            </div>
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">Último Mes ({lastMonth?.substring(0, 7) || 'N/A'})</p>
            <h3 className="text-xl font-bold tracking-tight">{formatVal(lastMonthValue)}</h3>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-md bg-teal-50/80 border-teal-100">
        <CardContent className="p-5 space-y-2">
          <div className="flex justify-between items-start">
            <div className="p-2 bg-teal-600 rounded-lg text-white">
              <CalendarRange size={18} />
            </div>
            <span className="text-[9px] font-black uppercase text-teal-600/60 bg-teal-100/50 px-1.5 py-0.5 rounded tracking-tighter">
              Filtrado por Rango
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-teal-800 uppercase tracking-tight flex flex-col">
              Período Seleccionado
              <span className="text-[9px] font-medium text-teal-600/70 lowercase normal-case">{dateRangeLabel}</span>
            </p>
            <div className="flex flex-col">
              <h3 className="text-lg font-black text-teal-900 leading-tight">{formatVal(selectedPeriodSales)}</h3>
              <p className="text-[10px] font-semibold text-teal-700/80">Prom. {formatVal(avgMonthlyPeriod)} / mes</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
