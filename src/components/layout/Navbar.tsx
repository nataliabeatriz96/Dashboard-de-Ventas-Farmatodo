import Link from "next/link";
import { LayoutDashboard, UploadCloud, ClipboardCheck } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="bg-[#1E3A6E] text-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shrink-0">
              <span className="text-[#1E3A6E] font-bold text-xl">F</span>
            </div>
            <h1 className="text-xl font-headline font-bold tracking-tight hidden md:block">
              Dashboard Comercial Farmatodo
            </h1>
          </div>
          <nav className="flex items-center space-x-1 md:space-x-8">
            <Link
              href="/"
              className={cn(
                "flex items-center space-x-2 text-sm font-medium px-3 py-2 rounded-md transition-colors",
                pathname === "/" ? "text-[#26C5DB] bg-white/10" : "hover:text-[#26C5DB] hover:bg-white/5"
              )}
            >
              <LayoutDashboard size={18} />
              <span className="hidden sm:inline">Overview</span>
            </Link>
            <Link
              href="/business-review"
              className={cn(
                "flex items-center space-x-2 text-sm font-medium px-3 py-2 rounded-md transition-colors",
                pathname === "/business-review" ? "text-[#26C5DB] bg-white/10" : "hover:text-[#26C5DB] hover:bg-white/5"
              )}
            >
              <ClipboardCheck size={18} />
              <span className="hidden sm:inline">Revisión de Negocio</span>
            </Link>
            <Link
              href="/upload"
              className={cn(
                "flex items-center space-x-2 text-sm font-medium px-3 py-2 rounded-md transition-colors",
                pathname === "/upload" ? "text-[#26C5DB] bg-white/10" : "hover:text-[#26C5DB] hover:bg-white/5"
              )}
            >
              <UploadCloud size={18} />
              <span className="hidden sm:inline">Cargar Datos</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
