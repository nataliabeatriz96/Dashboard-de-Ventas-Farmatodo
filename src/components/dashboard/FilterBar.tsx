
"use client";

import { useMemo, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SalesRecord, Filters } from "@/types/sales";
import { ChevronDown, Search, CalendarDays } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FilterBarProps {
  filters: Filters;
  setFilters: (filters: Filters) => void;
  allData: SalesRecord[];
}

interface MultiSelectProps {
  label: string;
  values: string[];
  options: string[];
  onChange: (values: string[]) => void;
}

function MultiSelect({ label, values, options, onChange }: MultiSelectProps) {
  const isAllSelected = values.length === 0 || (options.length > 0 && values.length === options.length);

  const toggleValue = (val: string) => {
    if (isAllSelected) {
      onChange([val]);
    } else {
      const newValues = values.includes(val)
        ? values.filter((v) => v !== val)
        : [...values, val];
      
      if (newValues.length === options.length || newValues.length === 0) {
        onChange([]);
      } else {
        onChange(newValues);
      }
    }
  };

  const toggleAll = () => {
    if (isAllSelected) {
      onChange([]);
    } else {
      onChange([]); // En nuestra lógica, vacío significa "Todos"
    }
  };

  const getDisplayText = () => {
    if (isAllSelected) return `Todos (${label})`;
    if (values.length === 1) return values[0];
    return "Varios";
  };

  return (
    <div className="flex flex-col space-y-2 flex-1 min-w-[140px]">
      <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-between h-10 text-xs font-normal bg-white border-slate-200 hover:border-slate-300">
            <span className="truncate pr-2">
              {getDisplayText()}
            </span>
            <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-0 shadow-xl border-slate-200" align="start">
          <div className="p-2 border-b bg-slate-50 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase">{label}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 px-2 text-[9px] text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              onClick={() => onChange([])}
            >
              Limpiar
            </Button>
          </div>
          <ScrollArea className="h-[250px]">
            <div className="p-2 space-y-0.5">
              <div 
                className="flex items-center space-x-2 p-1.5 hover:bg-slate-100 rounded cursor-pointer transition-colors border-b mb-1" 
                onClick={toggleAll}
              >
                <Checkbox checked={isAllSelected} onCheckedChange={() => {}} className="h-3.5 w-3.5" />
                <span className="text-[11px] font-bold text-slate-900 leading-none">Todos</span>
              </div>
              {options.length === 0 ? (
                <p className="text-[10px] text-muted-foreground p-4 text-center italic">No hay opciones disponibles</p>
              ) : (
                options.map((opt) => (
                  <div 
                    key={opt} 
                    className="flex items-center space-x-2 p-1.5 hover:bg-slate-100 rounded cursor-pointer transition-colors" 
                    onClick={() => toggleValue(opt)}
                  >
                    <Checkbox checked={values.includes(opt) || isAllSelected} onCheckedChange={() => {}} className="h-3.5 w-3.5" />
                    <span className="text-[11px] truncate text-slate-700 leading-none">{opt}</span>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function SearchableSelect({ label, value, options, onChange }: { label: string, value: string | null, options: string[], onChange: (v: string | null) => void }) {
  const [searchTerm, setSearchTerm] = useState("");
  
  const filteredOptions = useMemo(() => {
    return options.filter(opt => opt.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [options, searchTerm]);

  return (
    <div className="flex flex-col space-y-2 flex-1 min-w-[180px]">
      <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-between h-10 text-xs font-normal bg-white border-slate-200 hover:border-slate-300">
            <span className="truncate pr-2">
              {value || `Seleccionar ${label}`}
            </span>
            <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0 shadow-xl border-slate-200" align="start">
          <div className="p-2 border-b bg-slate-50 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Buscar {label}</span>
            {value && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 px-2 text-[9px] text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => onChange(null)}
              >
                Limpiar
              </Button>
            )}
          </div>
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input 
                placeholder="Escribe para buscar..." 
                className="pl-8 h-9 text-xs" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <ScrollArea className="h-[250px]">
            <div className="p-2 space-y-0.5">
              {filteredOptions.length === 0 ? (
                <p className="text-[10px] text-muted-foreground p-4 text-center italic">No se encontraron resultados</p>
              ) : (
                filteredOptions.map((opt) => (
                  <div 
                    key={opt} 
                    className={`flex items-center space-x-2 p-1.5 hover:bg-slate-100 rounded cursor-pointer transition-colors ${value === opt ? 'bg-blue-50 text-blue-700 font-bold' : ''}`} 
                    onClick={() => { onChange(opt); setSearchTerm(""); }}
                  >
                    <span className="text-[11px] truncate leading-none">{opt}</span>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function FilterBar({ filters, setFilters, allData }: FilterBarProps) {
  const proveedoresOptions = useMemo(() => {
    return Array.from(new Set(allData.map(d => String(d.Nombre_Proveedor || "").trim()))).filter(Boolean).sort();
  }, [allData]);

  const availableMonths = useMemo(() => {
    return Array.from(new Set(allData.map(d => d.Fecha_Mes.substring(0, 7)))).sort();
  }, [allData]);

  const filteredByProveedor = useMemo(() => {
    if (!filters.proveedor) return allData;
    const target = filters.proveedor.trim().toUpperCase();
    return allData.filter(d => String(d.Nombre_Proveedor || "").trim().toUpperCase() === target);
  }, [allData, filters.proveedor]);

  const divisionsOptions = useMemo(() => {
    return Array.from(new Set(filteredByProveedor.map(d => d.Division))).filter(Boolean).sort();
  }, [filteredByProveedor]);

  const filteredByDivision = useMemo(() => {
    if (!filters.division || filters.division.length === 0) return filteredByProveedor;
    return filteredByProveedor.filter(d => filters.division.includes(d.Division));
  }, [filteredByProveedor, filters.division]);

  const gruposOptions = useMemo(() => {
    return Array.from(new Set(filteredByDivision.map(d => d.Grupo))).filter(Boolean).sort();
  }, [filteredByDivision]);

  const filteredByGrupo = useMemo(() => {
    if (!filters.grupo || filters.grupo.length === 0) return filteredByDivision;
    return filteredByDivision.filter(d => filters.grupo.includes(d.Grupo));
  }, [filteredByDivision, filters.grupo]);

  const departamentosOptions = useMemo(() => {
    return Array.from(new Set(filteredByGrupo.map(d => d.Departamento))).filter(Boolean).sort();
  }, [filteredByGrupo]);

  const filteredByDept = useMemo(() => {
    if (!filters.departamento || filters.departamento.length === 0) return filteredByGrupo;
    return filteredByGrupo.filter(d => filters.departamento.includes(d.Departamento));
  }, [filteredByGrupo, filters.departamento]);

  const clasesOptions = useMemo(() => {
    return Array.from(new Set(filteredByDept.map(d => d.Clase))).filter((val): val is string => !!val).sort();
  }, [filteredByDept]);

  const filteredByClase = useMemo(() => {
    if (!filters.clase || filters.clase.length === 0) return filteredByDept;
    return filteredByDept.filter(d => d.Clase && filters.clase.includes(d.Clase));
  }, [filteredByDept, filters.clase]);

  const subclasesOptions = useMemo(() => {
    return Array.from(new Set(filteredByClase.map(d => d.Subclase))).filter((val): val is string => !!val).sort();
  }, [filteredByClase]);

  return (
    <Card className="border-none shadow-sm overflow-visible bg-white">
      <CardContent className="p-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col space-y-2 mr-2">
          <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Métrica</Label>
          <div className="flex items-center space-x-2 h-10 px-3 border border-slate-200 rounded-md bg-slate-50">
            <span className={filters.mode === "USD" ? "text-lg" : "opacity-30"}>💰</span>
            <Switch
              checked={filters.mode === "Units"}
              onCheckedChange={(checked) => setFilters({ ...filters, mode: checked ? "Units" : "USD" })}
            />
            <span className={filters.mode === "Units" ? "text-lg" : "opacity-30"}>📦</span>
          </div>
        </div>

        <SearchableSelect 
          label="Proveedor" 
          value={filters.proveedor} 
          options={proveedoresOptions} 
          onChange={(v) => setFilters({...filters, proveedor: v, division: [], grupo: [], departamento: [], clase: [], subclase: []})} 
        />
        
        <MultiSelect 
          label="División" 
          values={filters.division} 
          options={divisionsOptions} 
          onChange={(v) => setFilters({...filters, division: v, grupo: [], departamento: [], clase: [], subclase: []})} 
        />
        <MultiSelect 
          label="Grupo" 
          values={filters.grupo} 
          options={gruposOptions} 
          onChange={(v) => setFilters({...filters, grupo: v, departamento: [], clase: [], subclase: []})} 
        />
        <MultiSelect 
          label="Departamento" 
          values={filters.departamento} 
          options={departamentosOptions} 
          onChange={(v) => setFilters({...filters, departamento: v, clase: [], subclase: []})} 
        />
        <MultiSelect 
          label="Clase" 
          values={filters.clase} 
          options={clasesOptions} 
          onChange={(v) => setFilters({...filters, clase: v, subclase: []})} 
        />
        <MultiSelect 
          label="Subclase" 
          values={filters.subclase} 
          options={subclasesOptions} 
          onChange={(v) => setFilters({...filters, subclase: v})} 
        />

        <div className="flex flex-col space-y-2 min-w-[120px]">
          <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Desde</Label>
          <Select 
            value={filters.startDate || ""} 
            onValueChange={(v) => setFilters({...filters, startDate: v})}
          >
            <SelectTrigger className="h-10 text-xs">
              <CalendarDays className="h-3.5 w-3.5 mr-2 opacity-50" />
              <SelectValue placeholder="Mes inicial" />
            </SelectTrigger>
            <SelectContent>
              {availableMonths.map(m => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col space-y-2 min-w-[120px]">
          <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Hasta</Label>
          <Select 
            value={filters.endDate || ""} 
            onValueChange={(v) => setFilters({...filters, endDate: v})}
          >
            <SelectTrigger className="h-10 text-xs">
              <CalendarDays className="h-3.5 w-3.5 mr-2 opacity-50" />
              <SelectValue placeholder="Mes final" />
            </SelectTrigger>
            <SelectContent>
              {availableMonths.map(m => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
