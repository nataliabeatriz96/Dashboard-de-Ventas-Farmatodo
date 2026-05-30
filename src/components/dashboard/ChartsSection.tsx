
"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SalesRecord, ViewMode } from "@/types/sales";
import { cn } from "@/lib/utils";

interface ChartsSectionProps {
  data: SalesRecord[];
  mode: ViewMode;
}

const DIVISION_COLORS: Record<string, string> = {
  "BELLEZA": "#F472B6",
  "CUIDADO PERSONAL": "#9333EA",
  "BEBE": "#7DD3FC",
  "MEDICAMENTOS": "#15803D",
  "COMPLEMENTO SALUD": "#4ADE80",
  "HOGAR": "#FB923C",
  "COMESTIBLES": "#F59E0B",
  "IMAGEN/TECNOLOGIA": "#FDBA74",
  "MERCANCIA GENERAL": "#EA580C",
};

const CHART_COLORS = [
  "#1E3A6E", // Navy
  "#26C5DB", // Teal
  "#FF7F50", // Coral
  "#8FBC8F", // Sage Green
  "#800020", // Burgundy
  "#F59E0B", // Amber
  "#64748B", // Slate
  "#FB7185", // Rose
  "#6B8E23", // Olive
  "#4F46E5", // Indigo
];

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

function formatValueAbbrev(val: number) {
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

const getDynamicDomain = (chartData: any[], keys: string[]) => {
  if (!chartData || chartData.length === 0) return [0, 'auto'];
  let minV = Infinity;
  let maxV = -Infinity;
  chartData.forEach(item => {
    keys.forEach(k => {
      const v = Number(item[k]);
      if (!isNaN(v)) {
        if (v < minV) minV = v;
        if (v > maxV) maxV = v;
      }
    });
  });
  if (minV === Infinity) return [0, 'auto'];
  const pad = (maxV - minV) * 0.1;
  return [Math.max(0, minV - pad), maxV + pad];
};

const renderCustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, value, fill }: any) => {
  if (percent < 0.04) return null;

  const RADIAN = Math.PI / 180;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" strokeWidth={1.5} />
      <circle cx={ex} cy={ey} r={2.5} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 8} y={ey} textAnchor={textAnchor} fill={fill} dominantBaseline="central" className="text-[12px] font-black uppercase tracking-tight">
        {name}
      </text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 8} y={ey} dy={16} textAnchor={textAnchor} fill="#64748B" dominantBaseline="central" className="text-[10px] font-bold">
        {`${formatValueAbbrev(value)} · ${(percent * 100).toFixed(1)}%`}
      </text>
    </g>
  );
};

export function ChartsSection({ data, mode }: ChartsSectionProps) {
  const valKey = mode === "USD" ? "Ventas_USD" : "Unidades_Vendidas";

  const sortedMonths = useMemo(() => {
    return Array.from(new Set(data.map(d => d.Fecha_Mes))).sort();
  }, [data]);

  const dateRangeStr = useMemo(() => {
    if (sortedMonths.length === 0) return "";
    return `${formatSpanishDate(sortedMonths[0])} a ${formatSpanishDate(sortedMonths[sortedMonths.length - 1])}`;
  }, [sortedMonths]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded shadow-lg border-slate-100 min-w-[150px] z-50">
          <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-tighter">{label}</p>
          <div className="space-y-1">
            {payload.map((item: any, i: number) => (
              <div key={i} className="flex justify-between items-center gap-6">
                <span className="text-[11px] font-bold text-slate-600 truncate max-w-[180px]">{item.name}:</span>
                <span className="text-[11px] font-black tabular-nums" style={{ color: item.color }}>
                  {formatFullSpanishNumber(item.value, mode === 'USD')}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  // 1. Evolución General
  const evolutionData = useMemo(() => {
    return sortedMonths.map(m => ({ 
      month: m, 
      displayMonth: formatSpanishDate(m),
      value: data.filter(d => d.Fecha_Mes === m).reduce((acc, curr) => acc + (Number(curr[valKey]) || 0), 0)
    }));
  }, [data, sortedMonths, valKey]);

  // 2. Top 10 Proveedores Evolution
  const top10SuppliersData = useMemo(() => {
    const supplierTotals = data.reduce((acc, curr) => {
      acc[curr.Nombre_Proveedor] = (acc[curr.Nombre_Proveedor] || 0) + (Number(curr[valKey]) || 0);
      return acc;
    }, {} as Record<string, number>);

    const top10Names = Object.entries(supplierTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name]) => name);

    return sortedMonths.map(m => {
      const monthData: any = { month: m, displayMonth: formatSpanishDate(m) };
      top10Names.forEach(name => {
        monthData[name] = data
          .filter(d => d.Fecha_Mes === m && d.Nombre_Proveedor === name)
          .reduce((acc, curr) => acc + (Number(curr[valKey]) || 0), 0);
      });
      return monthData;
    });
  }, [data, sortedMonths, valKey]);

  const top10SuppliersNames = useMemo(() => {
    const totals = data.reduce((acc, curr) => {
      acc[curr.Nombre_Proveedor] = (acc[curr.Nombre_Proveedor] || 0) + (Number(curr[valKey]) || 0);
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([n]) => n);
  }, [data, valKey]);

  // 3. Top 10 Productos
  const top10Products = useMemo(() => {
    const totals = data.reduce((acc, curr) => {
      acc[curr.Descripcion_Producto] = (acc[curr.Descripcion_Producto] || 0) + (Number(curr[valKey]) || 0);
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  }, [data, valKey]);

  // 4. Ventas por División
  const divisionData = useMemo(() => {
    const totals = data.reduce((acc, curr) => {
      const div = curr.Division?.toUpperCase();
      if (!div || div === "NULL" || div === "IPOCONSUMO") return acc;
      acc[div] = (acc[div] || 0) + (Number(curr[valKey]) || 0);
      return acc;
    }, {} as Record<string, number>);
    const totalV = Object.values(totals).reduce((a, b) => a + b, 0);
    return Object.entries(totals)
      .map(([name, value]) => ({ 
        name, 
        value, 
        percent: value / (totalV || 1),
        color: DIVISION_COLORS[name] || "#CBD5E1"
      }))
      .sort((a, b) => b.value - a.value);
  }, [data, valKey]);

  // 5. Ventas por Grupo Top 10
  const top10Groups = useMemo(() => {
    const totals = data.reduce((acc, curr) => {
      acc[curr.Grupo] = (acc[curr.Grupo] || 0) + (Number(curr[valKey]) || 0);
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, value }));
  }, [data, valKey]);

  // 6. Evolución por División
  const evolutionByDivisionData = useMemo(() => {
    const divisions = Array.from(new Set(data.map(d => d.Division))).filter(d => d && d !== "NULL" && d !== "IPOCONSUMO");
    return sortedMonths.map(m => {
      const monthData: any = { month: m, displayMonth: formatSpanishDate(m) };
      divisions.forEach(div => {
        monthData[div] = data
          .filter(d => d.Fecha_Mes === m && d.Division === div)
          .reduce((acc, curr) => acc + (Number(curr[valKey]) || 0), 0);
      });
      return monthData;
    });
  }, [data, sortedMonths, valKey]);

  const activeDivisions = useMemo(() => {
    return Array.from(new Set(data.map(d => d.Division))).filter(d => d && d !== "NULL" && d !== "IPOCONSUMO");
  }, [data]);

  // 7. Evolución por Grupo Top 10
  const evolutionByGroupData = useMemo(() => {
    const topGroups = top10Groups.map(g => g.name);
    return sortedMonths.map(m => {
      const monthData: any = { month: m, displayMonth: formatSpanishDate(m) };
      topGroups.forEach(grp => {
        monthData[grp] = data
          .filter(d => d.Fecha_Mes === m && d.Grupo === grp)
          .reduce((acc, curr) => acc + (Number(curr[valKey]) || 0), 0);
      });
      return monthData;
    });
  }, [data, sortedMonths, top10Groups, valKey]);

  return (
    <div className="space-y-8">
      {/* ROW 1 — Full width */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold">Evolución de Ventas ({mode})</CardTitle>
          <p className="text-[11px] text-slate-400">Ventas totales mensuales · {dateRangeStr}</p>
        </CardHeader>
        <CardContent className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={evolutionData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="displayMonth" fontSize={10} axisLine={false} tickLine={false} />
              <YAxis fontSize={10} axisLine={false} tickLine={false} tickFormatter={formatValueAbbrev} domain={getDynamicDomain(evolutionData, ['value']) as any} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="value" name="Venta Total" stroke="#1E3A6E" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ROW 2 LEFT — Top 10 Proveedores Evolution */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold">Top 10 Proveedores (Evolución)</CardTitle>
            <p className="text-[11px] text-slate-400">Proveedores con mayor venta acumulada · {dateRangeStr}</p>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={top10SuppliersData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="displayMonth" fontSize={9} axisLine={false} tickLine={false} />
                <YAxis fontSize={9} axisLine={false} tickLine={false} tickFormatter={formatValueAbbrev} />
                <Tooltip content={<CustomTooltip />} />
                {top10SuppliersNames.map((name, i) => (
                  <Line key={name} type="monotone" dataKey={name} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={{ r: 2 }} />
                ))}
                <Legend wrapperStyle={{ fontSize: '9px', paddingTop: '20px' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* ROW 2 RIGHT — Top 10 Productos */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold">Top 10 Productos</CardTitle>
            <p className="text-[11px] text-slate-400">Productos con mayor volumen de venta · {dateRangeStr}</p>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top10Products} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                <XAxis type="number" fontSize={9} axisLine={false} tickLine={false} tickFormatter={formatValueAbbrev} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  fontSize={8} 
                  axisLine={false} 
                  tickLine={false} 
                  width={150}
                  tick={(props) => {
                    const { x, y, payload } = props;
                    const text = payload.value.length > 25 ? payload.value.substring(0, 25) + '...' : payload.value;
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text x={-5} y={0} dy={4} textAnchor="end" fill="#64748B" fontSize={8} fontWeight={500}>
                          {text}
                        </text>
                      </g>
                    );
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Venta" fill="#1E3A6E" radius={[0, 4, 4, 0]} barSize={15} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* ROW 3 LEFT — Ventas por División */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold">Ventas por División</CardTitle>
            <p className="text-[11px] text-slate-400">Distribución porcentual · {dateRangeStr}</p>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={divisionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={2}
                  dataKey="value"
                  label={renderCustomPieLabel}
                  labelLine={false}
                  stroke="none"
                >
                  {divisionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatFullSpanishNumber(value, mode === 'USD')} />
                <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* ROW 3 RIGHT — Ventas por Grupo (Top 10) */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold">Ventas por Grupo (Top 10)</CardTitle>
            <p className="text-[11px] text-slate-400">Grupos líderes en volumen · {dateRangeStr}</p>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top10Groups} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                <XAxis type="number" fontSize={9} axisLine={false} tickLine={false} tickFormatter={formatValueAbbrev} />
                <YAxis dataKey="name" type="category" fontSize={9} axisLine={false} tickLine={false} width={120} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Venta" fill="#26C5DB" radius={[0, 4, 4, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* ROW 4 LEFT — Evolución por División */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold">Evolución por División</CardTitle>
            <p className="text-[11px] text-slate-400">Tendencia mensual por división · {dateRangeStr}</p>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolutionByDivisionData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="displayMonth" fontSize={9} axisLine={false} tickLine={false} />
                <YAxis fontSize={9} axisLine={false} tickLine={false} tickFormatter={formatValueAbbrev} />
                <Tooltip content={<CustomTooltip />} />
                {activeDivisions.map((name) => (
                  <Line key={name} type="monotone" dataKey={name} stroke={DIVISION_COLORS[name] || "#CBD5E1"} strokeWidth={2} dot={{ r: 2 }} />
                ))}
                <Legend wrapperStyle={{ fontSize: '9px', paddingTop: '20px' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* ROW 4 RIGHT — Evolución por Grupo (Top 10) */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold">Evolución por Grupo (Top 10)</CardTitle>
            <p className="text-[11px] text-slate-400">Tendencia de grupos líderes · {dateRangeStr}</p>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolutionByGroupData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="displayMonth" fontSize={9} axisLine={false} tickLine={false} />
                <YAxis fontSize={9} axisLine={false} tickLine={false} tickFormatter={formatValueAbbrev} />
                <Tooltip content={<CustomTooltip />} />
                {top10Groups.map((g, i) => (
                  <Line key={g.name} type="monotone" dataKey={g.name} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={{ r: 2 }} />
                ))}
                <Legend wrapperStyle={{ fontSize: '9px', paddingTop: '20px' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
