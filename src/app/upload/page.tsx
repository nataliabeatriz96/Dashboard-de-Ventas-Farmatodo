
"use client";

import { useState } from "react";
import { useFirestore } from "@/firebase";
import { doc, writeBatch, collection, getDocs, deleteDoc } from "firebase/firestore";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, UploadCloud, CheckCircle2, AlertCircle, FileSpreadsheet, RefreshCw, Trash2, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

const COLUMN_MAPPING: Record<string, string> = {
  "Mes": "Fecha_Mes",
  "(PROD) ID División": "ID_Division",
  "(PROD) División": "Division",
  "(PROD) ID Grupo": "ID_Grupo",
  "(PROD) Grupo": "Grupo",
  "(PROD) ID Departamento": "ID_Departamento",
  "(PROD) Departamento": "Departamento",
  "(PROD) ID Clase": "ID_Clase",
  "(PROD) Clase": "Clase",
  "(PROD) ID Subclass": "ID_Subclase",
  "(PROD) Subclase": "Subclase",
  "(PROD) Item": "SKU",
  "(PROD) Descripción del item": "Descripcion_Producto",
  "(SUPP) Código de proveedor": "Codigo_Proveedor",
  "(SUPP) Nombre del proveedor": "Nombre_Proveedor",
  "Ventas Totales": "Ventas_USD",
  "Unidades Vendidas": "Unidades_Vendidas"
};

const MASTER_FIELDS = [
  "Descripcion_Producto", "Nombre_Proveedor", "Codigo_Proveedor", "Division", 
  "ID_Division", "Grupo", "ID_Grupo", "Departamento", "ID_Departamento", 
  "ID_Clase", "Clase", "ID_Subclase", "Subclase", "Estatus_Producto"
];

function cleanEncoding(str: string): string {
  if (!str) return "";
  return str
    .replace(/Ã³/g, "ó")
    .replace(/Ã¡/g, "á")
    .replace(/Ã©/g, "é")
    .replace(/Ã­/g, "í")
    .replace(/Ãº/g, "ú")
    .replace(/Ã±/g, "ñ")
    .replace(/Ã“/g, "Ó")
    .replace(/Ã /g, "Á")
    .replace(/Ã‰/g, "É")
    .replace(/Ã /g, "Í")
    .replace(/Ãš/g, "Ú")
    .replace(/Ã‘/g, "Ñ")
    .trim();
}

function parseCSVLine(line: string): string[] {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result.map(v => v.replace(/^"|"$/g, ''));
}

export default function UploadPage() {
  const db = useFirestore();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<string>("");
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);

  const handleGlobalMaintenance = async () => {
    if (!db) return;
    setLoading(true);
    setProgress(0);
    setStatus({ type: 'info', message: "Iniciando mantenimiento global de la base de datos..." });
    
    try {
      setPhase("Descargando base de datos completa...");
      const querySnapshot = await getDocs(collection(db, "ventas_mensuales"));
      const allDocs = querySnapshot.docs;
      const totalDocs = allDocs.length;
      
      const skuMasterMap = new Map<string, { data: any, latestDate: string }>();
      const docsToDelete: string[] = [];

      setPhase("Identificando registros inválidos y maestros de SKU...");
      allDocs.forEach((docSnap) => {
        const data = docSnap.data();
        const sku = data.SKU;
        const division = data.Division?.toUpperCase();
        const codigoProv = String(data.Codigo_Proveedor || "").trim();
        const date = data.Fecha_Mes;

        // Regla 1: Identificar para borrado
        if (division === "IPOCONSUMO" || !codigoProv || codigoProv === "null" || codigoProv === "NULL") {
          docsToDelete.push(docSnap.id);
          return;
        }

        // Regla 2: Encontrar los atributos más recientes por SKU
        if (sku) {
          const currentMaster = skuMasterMap.get(sku);
          if (!currentMaster || date > currentMaster.latestDate) {
            const masterAttributes: any = {};
            MASTER_FIELDS.forEach(f => masterAttributes[f] = data[f]);
            skuMasterMap.set(sku, { data: masterAttributes, latestDate: date });
          }
        }
      });

      // Ejecutar Borrados
      if (docsToDelete.length > 0) {
        setPhase(`Eliminando ${docsToDelete.length} registros inválidos...`);
        const batchSize = 400;
        for (let i = 0; i < docsToDelete.length; i += batchSize) {
          const batch = writeBatch(db);
          const chunk = docsToDelete.slice(i, i + batchSize);
          chunk.forEach(id => batch.delete(doc(db, "ventas_mensuales", id)));
          await batch.commit();
          setProgress(Math.round((i / docsToDelete.length) * 30));
        }
      }

      // Sincronizar Atributos
      setPhase("Sincronizando atributos retroactivamente...");
      let updateCount = 0;
      let currentBatch = writeBatch(db);
      let batchCounter = 0;

      allDocs.forEach((docSnap, index) => {
        if (docsToDelete.includes(docSnap.id)) return;

        const data = docSnap.data();
        const sku = data.SKU;
        const master = skuMasterMap.get(sku);

        if (master) {
          let needsUpdate = false;
          const updatePayload: any = {};
          
          MASTER_FIELDS.forEach(field => {
            if (master.data[field] !== undefined && master.data[field] !== data[field]) {
              updatePayload[field] = master.data[field];
              needsUpdate = true;
            }
          });

          if (needsUpdate) {
            currentBatch.update(docSnap.ref, updatePayload);
            updateCount++;
            batchCounter++;
            if (batchCounter >= 400) {
              currentBatch.commit();
              currentBatch = writeBatch(db);
              batchCounter = 0;
            }
          }
        }
        if (index % 500 === 0) setProgress(30 + Math.round((index / totalDocs) * 70));
      });

      if (batchCounter > 0) await currentBatch.commit();

      setStatus({ 
        type: 'success', 
        message: `¡Mantenimiento completado! Se eliminaron ${docsToDelete.length} registros y se actualizaron ${updateCount} atributos históricos para consistencia.` 
      });
      setPhase("");
      setProgress(100);
    } catch (err: any) {
      console.error(err);
      setStatus({ type: 'error', message: `Error en mantenimiento: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!file || !db) return;
    setLoading(true);
    setProgress(0);
    setStatus(null);
    setPhase("Leyendo archivo...");

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
      
      const rawHeaders = parseCSVLine(lines[0]);
      const mappedHeaders = rawHeaders.map(h => cleanEncoding(h));
      const finalHeaders = mappedHeaders.map(h => COLUMN_MAPPING[h] || h);

      const rows = lines.slice(1);
      const skuMasterData = new Map<string, any>();
      const recordsToUpload: any[] = [];

      rows.forEach((row) => {
        const values = parseCSVLine(row);
        const data: any = {};
        finalHeaders.forEach((header, idx) => {
          let val: any = values[idx];
          if (val === undefined) return;
          val = cleanEncoding(val);
          if (header === "Unidades_Vendidas" || header === "Ventas_USD") {
            val = parseFloat(val.replace(/[^0-9.-]/g, "")) || 0;
          }
          data[header] = val;
        });

        const isIpoConsumo = data.Division?.toUpperCase() === "IPOCONSUMO";
        const isNullProvider = !data.Codigo_Proveedor || 
                              data.Codigo_Proveedor === "null" || 
                              data.Codigo_Proveedor === "NULL" || 
                              String(data.Codigo_Proveedor).trim() === "";

        if (data.SKU && data.Fecha_Mes && !isIpoConsumo && !isNullProvider) {
          recordsToUpload.push(data);
          const masterAttributes: any = {};
          MASTER_FIELDS.forEach(f => masterAttributes[f] = data[f]);
          skuMasterData.set(data.SKU, masterAttributes);
        }
      });

      try {
        setPhase("Cargando registros nuevos...");
        const total = recordsToUpload.length;
        for (let i = 0; i < total; i += 400) {
          const batch = writeBatch(db);
          recordsToUpload.slice(i, i + 400).forEach(d => {
            batch.set(doc(db, "ventas_mensuales", `${d.SKU}_${d.Fecha_Mes}`), d, { merge: true });
          });
          await batch.commit();
          setProgress(Math.round((i / total) * 100));
        }
        setStatus({ type: 'success', message: `Carga exitosa de ${total} registros.` });
      } catch (err: any) {
        setStatus({ type: 'error', message: err.message });
      } finally {
        setLoading(false);
        setPhase("");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UploadCloud className="text-[#1E3A6E]" />
                Cargar Nuevos Meses
              </CardTitle>
              <CardDescription>Sube tu reporte mensual. El sistema integrará automáticamente los datos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-6 border-2 border-dashed rounded-lg bg-slate-50 text-center">
                <Input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" id="csv-upload" />
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <FileSpreadsheet size={32} className="mx-auto text-slate-400 mb-2" />
                  <p className="text-sm font-medium">{file ? file.name : "Seleccionar archivo CSV"}</p>
                </label>
                {file && !loading && (
                  <Button onClick={handleUpload} className="mt-4 w-full bg-[#1E3A6E]">Cargar Reporte</Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-[#1E3A6E] text-white">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap size={20} className="text-[#26C5DB]" />
                Mantenimiento
              </CardTitle>
              <CardDescription className="text-white/60">Limpia y sincroniza los datos que ya están en Firestore.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleGlobalMaintenance} 
                disabled={loading}
                variant="secondary" 
                className="w-full bg-[#26C5DB] hover:bg-[#20a9bc] text-white border-none"
              >
                {loading ? <Loader2 className="animate-spin mr-2" /> : <RefreshCw className="mr-2" />}
                Sincronizar Todo
              </Button>
            </CardContent>
          </Card>
        </div>

        {(loading || status) && (
          <Card className="border-none shadow-md">
            <CardContent className="pt-6 space-y-4">
              {loading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500">
                    <span>{phase}</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}
              {status && (
                <div className={`p-4 rounded-md flex gap-3 text-sm ${status.type === 'success' ? 'bg-green-50 text-green-700' : status.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                  {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  {status.message}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
