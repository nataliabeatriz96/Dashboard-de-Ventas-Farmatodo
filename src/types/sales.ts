
export interface SalesRecord {
  SKU: string;
  Descripcion_Producto: string;
  Nombre_Proveedor: string;
  Codigo_Proveedor: string;
  Division: string;
  ID_Division?: string;
  Grupo: string;
  ID_Grupo?: string;
  Departamento: string;
  ID_Departamento?: string;
  Clase?: string;
  ID_Clase: string;
  Subclase?: string;
  ID_Subclase?: string;
  Estatus_Producto?: string;
  Fecha_Mes: string; // YYYY-MM-DD
  Unidades_Vendidas: number;
  Ventas_USD: number;
}

export type ViewMode = 'USD' | 'Units';

export interface Filters {
  mode: ViewMode;
  division: string[];
  grupo: string[];
  departamento: string[];
  clase: string[];
  subclase: string[];
  proveedor: string[];
  startDate?: string; // YYYY-MM
  endDate?: string;   // YYYY-MM
}
