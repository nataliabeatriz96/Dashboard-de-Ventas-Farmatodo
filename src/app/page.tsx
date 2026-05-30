"use client";

import { useState, useMemo } from "react";
import { collection, query, where } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { Navbar } from "@/components/layout/Navbar";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { KPICards } from "@/components/dashboard/KPICards";
import { ChartsSection } from "@/components/dashboard/ChartsSection";
import { AIInsights } from "@/components/dashboard/AIInsights";
import { SalesRecord, Filters } from "@/types/sales";
import { Loader2, DatabaseBackup, UploadCloud, AlertCircle, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function OverviewPage() {
  const db = useFirestore();
  const anioActual = new Date().getFullYear();
  const fechaInicio = `${anioActual}-01-01`;
  const fechaFin = `${anioActual}-12-31`;

  const salesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, "ventas_mensuales"),
      where("Fecha_Mes", ">=", fechaInicio),
      where("Fecha_Mes", "<=", fechaFin)
    );
  }, [db, fechaInicio, fechaFin]);

  const { data: rawData, loading, error } = useCollection<SalesRecord>(salesQuery as any);

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

  const allData = rawData || [];
  const hasData = allData.length > 0;

  const baseFilteredData = useMemo(() => {
    if (!rawData) return [];
    return rawData.filter((item) => {
      if (filters.division.length > 0 && !filters.division.includes(item.Division)) return false;
      if (filters.grupo.length > 0 && !filters.grupo.includes(item.Grupo)) return false;
      if (filters.departamento.length > 0 && !filters.departamento.includes(item.Departamento)) return false;
      if (filters.clase.length > 0 && item.Clase && !filters.clase.includes(item.Clase)) return false;
      if (filters.subclase.length > 0 && item.Subclase && !filters.subclase.includes(item.Subclase)) return false;
      if (filters.proveedor && item.Nombre_Proveedor !== filters.proveedor) return false;
      return true;
    });
  }, [rawData, filters]);

  const dateFilteredData = useMemo(() => {
    return baseFilteredData.filter((item) => {
      if (filters.startDate && item.Fecha_Mes.substring(0, 7) < filters.startDate) return false;
      if (filters.endDate && item.Fecha_Mes.substring(0, 7) > filters.endDate) return false;
      return true;
    });
  }, [baseFilteredData, filters.startDate, filters.endDate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-[#1E3A6E] mx-auto" />
            <p className="text-muted-foreground font-medium">Cargando datos {anioActual}...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
        <Navbar />
        <main className="container mx-auto px-4 py-12">
          <Alert variant="destructive" className="max-w-2xl mx-auto shadow-lg">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle className="font-bold">Error de Conexión</AlertTitle>
            <AlertDescription className="mt-2">
              <p>{error.message}</p>
              <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="mt-4 gap-2">
                <RefreshCcw size={14} /> Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <Navbar />
      <div className="sticky top-16 z-40 bg-white pb-4 border-b shadow-md">
        <div className="container mx-auto px-4 pt-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-[#1E3A6E]">Análisis Comercial Farmatodo</h2>
              <p className="text-xs text-muted-foreground">
                Año {anioActual} — {dateFilteredData.length.toLocaleString()} registros filtrados
              </p>
            </div>
            <div className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded border uppercase">
              Base de Datos en Vivo
            </div>
          </div>
          <FilterBar filters={filters} setFilters={setFilters} allData={allData} />
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 space-y-8">
        {!hasData ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-6 bg-white rounded-xl border border-dashed border-gray-300">
            <DatabaseBackup size={56} className="text-[#1E3A6E]" />
            <div className="text-center">
              <h2 className="text-2xl font-bold">Sin Datos para {anioActual}</h2>
              <p className="text-muted-foreground">No hay registros para este año en la base de datos.</p>
            </div>
            <Link href="/upload">
              <Button size="lg" className="bg-[#1E3A6E] hover:bg-[#152a51]">
                <UploadCloud size={18} className="mr-2" />
                Cargar CSV
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <KPICards
              data={baseFilteredData}
              dateFilteredData={dateFilteredData}
              mode={filters.mode}
              filters={filters}
            />
            <ChartsSection data={dateFilteredData} mode={filters.mode} />
            <AIInsights data={dateFilteredData} mode={filters.mode} />
          </>
        )}
      </main>
    </div>
  );
}