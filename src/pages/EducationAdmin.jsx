import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getPreinscriptions, 
  updatePreinscriptionStatus 
} from '@/api/educationApi';
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { 
  Users, Search, Download, CheckCircle2, 
  Clock, Phone, Mail, GraduationCap, 
  Filter, MoreVertical, MapPin, Calendar,
  ArrowUpDown, UserCheck, AlertCircle, FileText,
  ChevronRight, RefreshCcw, LayoutGrid, List,
  Eye, MessageSquare, Trash2, FilterX
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

/**
 * COMPONENTE: EducationAdmin
 * NIVEL: Referente Tecnológico Regional (NASA + FERRARI)
 * FUNCIONALIDAD: Gestión integral de preinscripciones educativas con
 * inteligencia de datos y control de flujo ministerial.
 */

const EducationAdmin = () => {
  // --- ESTADOS DE DATOS ---
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("table"); // "table" | "grid"
  const [activeFilter, setActiveFilter] = useState("all"); // "all" | "pending" | "contacted" | "enrolled"
  const [selectedLocation, setSelectedLocation] = useState("todas");
  const { toast } = useToast();

  // --- EFECTOS ---
  useEffect(() => {
    fetchList();
  }, []);

  const fetchList = async () => {
    setLoading(true);
    try {
      const data = await getPreinscriptions();
      setList(data);
    } catch (e) {
      toast({ 
        title: "Error de Sincronización", 
        description: "No se pudo conectar con el servidor de datos.",
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  // --- LÓGICA DE GESTIÓN DE ESTADOS ---
  const handleStatusChange = async (id, status) => {
    try {
      await updatePreinscriptionStatus(id, status);
      toast({ 
        title: "Registro Actualizado", 
        description: `El aspirante ahora está marcado como ${status.toUpperCase()}.` 
      });
      fetchList();
    } catch (e) {
      toast({ title: "Error en actualización", variant: "destructive" });
    }
  };

  // --- EXPORTACIÓN A CSV (Nivel Profesional) ---
  const exportToCSV = () => {
    if (list.length === 0) return;
    
    const headers = [
      "Fecha", "Nombre Completo", "DNI", "Edad", "Email", 
      "Teléfono", "Localidad", "Nivel", "Estado", "Mensaje"
    ];
    
    const rows = list.map(item => [
      new Date(item.created_at).toLocaleDateString(),
      item.full_name,
      item.dni,
      item.age,
      item.email,
      item.phone,
      item.location,
      item.level_to_start,
      item.status,
      `"${item.message || ''}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `preinscripciones_antoniana_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: "Exportación Exitosa", description: "El archivo CSV ha sido generado." });
  };

  // --- FILTRADO INTELIGENTE (MEMOIZED) ---
  const filteredList = useMemo(() => {
    return list.filter(item => {
      const matchesSearch = 
        item.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.dni.includes(searchTerm) ||
        item.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = activeFilter === "all" || item.status === activeFilter;
      const matchesLocation = selectedLocation === "todas" || item.location === selectedLocation;

      return matchesSearch && matchesStatus && matchesLocation;
    });
  }, [list, searchTerm, activeFilter, selectedLocation]);

  // --- ESTADÍSTICAS RÁPIDAS ---
  const stats = {
    total: list.length,
    pending: list.filter(i => i.status === 'pending').length,
    contacted: list.filter(i => i.status === 'contacted').length,
    locations: [...new Set(list.map(i => i.location))].length
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pt-32 pb-24 px-4 md:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* --- CABECERA ESTRATÉGICA --- */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }} 
            animate={{ opacity: 1, x: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-3 text-brand-primary">
              <div className="p-2 bg-brand-primary/10 rounded-xl">
                <GraduationCap size={24} />
              </div>
              <span className="text-xs font-black uppercase tracking-[0.4em]">Gestión Ministerio de Educación</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black font-poppins text-brand-dark tracking-tighter leading-none">
              ADMIN<span className="text-brand-primary">EDU</span>
            </h1>
            <p className="text-gray-400 font-medium max-w-md italic">
              Panel avanzado para la administración de la nueva sede educativa Juventud Antoniana.
            </p>
          </motion.div>

          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={exportToCSV}
              className="bg-white text-brand-dark border-gray-200 hover:bg-gray-50 rounded-2xl h-14 px-6 shadow-sm font-bold flex gap-2"
            >
              <Download size={18} className="text-green-600" /> EXPORTAR DATOS
            </Button>
            <Button 
              onClick={fetchList}
              variant="outline"
              className="rounded-2xl h-14 w-14 p-0 border-gray-200 bg-white shadow-sm"
            >
              <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
            </Button>
          </div>
        </div>

        {/* --- DASHBOARD DE MÉTRICAS --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Total Aspirantes" value={stats.total} icon={Users} color="blue" />
          <MetricCard title="Pendientes" value={stats.pending} icon={Clock} color="amber" />
          <MetricCard title="Contactados" value={stats.contacted} icon={UserCheck} color="green" />
          <MetricCard title="Zonas Cubiertas" value={stats.locations} icon={MapPin} color="purple" />
        </div>

        {/* --- BARRA DE CONTROL Y FILTROS --- */}
        <Card className="border-none shadow-xl shadow-brand-dark/5 rounded-[2.5rem] overflow-hidden bg-white">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row gap-6 justify-between items-center">
              
              {/* Buscador Inteligente */}
              <div className="relative w-full md:w-96 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-primary transition-colors" size={20} />
                <Input 
                  placeholder="Buscar por Nombre, DNI o Email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-14 rounded-2xl border-gray-100 bg-gray-50 focus:bg-white focus:ring-brand-primary/20 transition-all text-sm font-medium"
                />
              </div>

              {/* Pestañas de Estado */}
              <Tabs defaultValue="all" className="w-full md:w-auto" onValueChange={setActiveFilter}>
                <TabsList className="bg-gray-50 p-1.5 rounded-2xl h-14">
                  <TabsTrigger value="all" className="rounded-xl px-6 font-bold text-xs uppercase tracking-widest data-[state=active]:bg-brand-dark data-[state=active]:text-white">TODOS</TabsTrigger>
                  <TabsTrigger value="pending" className="rounded-xl px-6 font-bold text-xs uppercase tracking-widest data-[state=active]:bg-amber-500 data-[state=active]:text-white">PENDIENTES</TabsTrigger>
                  <TabsTrigger value="contacted" className="rounded-xl px-6 font-bold text-xs uppercase tracking-widest data-[state=active]:bg-green-600 data-[state=active]:text-white">CONTACTADOS</TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Switcher de Vista */}
              <div className="flex bg-gray-50 p-1.5 rounded-2xl">
                <button 
                  onClick={() => setViewMode("table")}
                  className={`p-2.5 rounded-xl transition-all ${viewMode === "table" ? "bg-white shadow-sm text-brand-primary" : "text-gray-400"}`}
                >
                  <List size={20} />
                </button>
                <button 
                  onClick={() => setViewMode("grid")}
                  className={`p-2.5 rounded-xl transition-all ${viewMode === "grid" ? "bg-white shadow-sm text-brand-primary" : "text-gray-400"}`}
                >
                  <LayoutGrid size={20} />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* --- CONTENEDOR PRINCIPAL DE DATOS --- */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loader"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-40 space-y-4"
            >
              <div className="w-16 h-16 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
              <p className="text-brand-dark font-black uppercase tracking-widest text-xs">Sincronizando Base de Datos...</p>
            </motion.div>
          ) : filteredList.length > 0 ? (
            <motion.div
              key={viewMode}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {viewMode === "table" ? (
                <div className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                          <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Aspirante</th>
                          <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Contacto Técnico</th>
                          <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Perfil Académico</th>
                          <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Estado Flujo</th>
                          <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Gestión</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filteredList.map((item) => (
                          <TableRow 
                            key={item.id} 
                            item={item} 
                            onStatusChange={handleStatusChange} 
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredList.map((item) => (
                    <GridCard 
                      key={item.id} 
                      item={item} 
                      onStatusChange={handleStatusChange} 
                    />
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="bg-white rounded-[3rem] p-20 text-center border-2 border-dashed border-gray-100"
            >
              <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300">
                <FilterX size={40} />
              </div>
              <h3 className="text-2xl font-black text-brand-dark mb-2 uppercase">Sin Resultados</h3>
              <p className="text-gray-400 max-w-xs mx-auto font-medium">No encontramos preinscripciones que coincidan con los filtros actuales.</p>
              <Button 
                variant="link" 
                onClick={() => {setSearchTerm(""); setActiveFilter("all");}}
                className="mt-4 text-brand-primary font-bold"
              >
                Limpiar todos los filtros
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

// --- SUB-COMPONENTES DE ALTA CALIDAD ---

const MetricCard = ({ title, value, icon: Icon, color }) => {
  const colors = {
    blue: "text-blue-600 bg-blue-50 border-blue-100",
    amber: "text-amber-600 bg-amber-50 border-amber-100",
    green: "text-green-600 bg-green-50 border-green-100",
    purple: "text-purple-600 bg-purple-50 border-purple-100",
  };
  
  return (
    <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden group hover:shadow-lg transition-all">
      <CardContent className="p-6 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{title}</p>
          <p className="text-4xl font-black font-poppins text-brand-dark">{value}</p>
        </div>
        <div className={`p-4 rounded-2xl ${colors[color]} border transition-transform group-hover:scale-110`}>
          <Icon size={24} />
        </div>
      </CardContent>
    </Card>
  );
};

const TableRow = ({ item, onStatusChange }) => {
  return (
    <tr className="group hover:bg-brand-sand/5 transition-all">
      <td className="px-8 py-8">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-brand-dark text-white flex items-center justify-center font-black text-lg shadow-lg shadow-brand-dark/20">
            {item.full_name.charAt(0)}
          </div>
          <div>
            <p className="font-black text-brand-dark uppercase tracking-tight leading-tight">{item.full_name}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-[9px] font-bold border-gray-100 px-2 py-0">DNI {item.dni}</Badge>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{item.age} años</span>
            </div>
          </div>
        </div>
      </td>
      <td className="px-8 py-8">
        <div className="space-y-1.5">
          <a href={`https://wa.me/${item.phone.replace(/\D/g,'')}`} target="_blank" className="flex items-center gap-2 text-xs text-brand-primary font-black hover:underline">
            <Phone size={14} className="text-green-500" /> {item.phone}
          </a>
          <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium lowercase italic">
            <Mail size={14} className="text-gray-300" /> {item.email}
          </div>
        </div>
      </td>
      <td className="px-8 py-8">
        <div className="space-y-2">
          <Badge className="bg-blue-50 text-blue-600 border-none uppercase text-[9px] font-black tracking-widest px-3 py-1">
            {item.level_to_start}
          </Badge>
          <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
            <MapPin size={12} className="text-brand-gold" /> {item.location}
          </div>
        </div>
      </td>
      <td className="px-8 py-8">
        <StatusBadge status={item.status} />
      </td>
      <td className="px-8 py-8 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl hover:bg-gray-100">
              <MoreVertical size={20} className="text-gray-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 border-gray-100 shadow-2xl">
            <DropdownMenuLabel className="text-[10px] uppercase text-gray-400 font-black px-3 py-2">Acciones de Flujo</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onStatusChange(item.id, 'contactado')} className="rounded-xl py-3 cursor-pointer">
              <Phone className="mr-3 h-4 w-4 text-green-500" /> 
              <span className="font-bold text-xs uppercase tracking-wider">Marcar Contactado</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatusChange(item.id, 'inscrito')} className="rounded-xl py-3 cursor-pointer">
              <UserCheck className="mr-3 h-4 w-4 text-blue-500" /> 
              <span className="font-bold text-xs uppercase tracking-wider">Confirmar Inscripción</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-gray-50" />
            <DropdownMenuItem className="rounded-xl py-3 cursor-pointer text-red-600">
              <Trash2 className="mr-3 h-4 w-4" /> 
              <span className="font-bold text-xs uppercase tracking-wider">Archivar Registro</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
};

const GridCard = ({ item, onStatusChange }) => {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col p-6 space-y-6"
    >
      <div className="flex justify-between items-start">
        <div className="h-14 w-14 rounded-2xl bg-brand-dark text-white flex items-center justify-center font-black text-xl">
          {item.full_name.charAt(0)}
        </div>
        <StatusBadge status={item.status} />
      </div>

      <div className="space-y-1">
        <h3 className="text-xl font-black text-brand-dark uppercase tracking-tight">{item.full_name}</h3>
        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">DNI {item.dni} • {item.age} Años</p>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
          <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Nivel</p>
          <p className="text-[10px] font-bold text-brand-dark uppercase truncate">{item.level_to_start}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
          <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Localidad</p>
          <p className="text-[10px] font-bold text-brand-dark uppercase truncate">{item.location}</p>
        </div>
      </div>

      <div className="pt-4 flex gap-2">
        <Button 
          className="flex-1 rounded-xl bg-brand-primary font-bold text-[10px] uppercase h-10 tracking-widest"
          onClick={() => onStatusChange(item.id, 'contactado')}
        >
          CONTACTAR
        </Button>
        <Button variant="outline" className="rounded-xl border-gray-200 h-10 w-10 p-0">
          <MessageSquare size={16} />
        </Button>
      </div>
    </motion.div>
  );
};

const StatusBadge = ({ status }) => {
  const configs = {
    pending: { label: "PENDIENTE", class: "bg-amber-50 text-amber-600", icon: Clock },
    contacted: { label: "CONTACTADO", class: "bg-blue-50 text-blue-600", icon: Phone },
    inscrito: { label: "INSCRITO", class: "bg-green-50 text-green-600", icon: CheckCircle2 },
  };
  const config = configs[status] || configs.pending;
  const Icon = config.icon;

  return (
    <Badge className={`${config.class} border-none text-[9px] font-black tracking-[0.15em] px-3 py-1 flex items-center gap-1.5 w-fit`}>
      <Icon size={12} />
      {config.label}
    </Badge>
  );
};

export default EducationAdmin;