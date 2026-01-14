import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getPreinscriptions, 
  updatePreinscriptionStatus 
} from '@/api/educationApi';
import { Card, CardContent } from '@/components/ui/card';
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
  MoreVertical, MapPin, UserCheck, RefreshCcw, 
  LayoutGrid, List, FilterX, XCircle, Trash2
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const EducationAdmin = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("table");
  const [activeFilter, setActiveFilter] = useState("all");
  const { toast } = useToast();

  const fetchList = async () => {
    setLoading(true);
    try {
      const data = await getPreinscriptions();
      setList(data || []);
    } catch (e) {
      toast({ title: "Error de carga", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(); }, []);

  // --- GESTIÓN DE ESTADOS (Corregida para actualización inmediata) ---
  const handleStatusChange = async (id, status) => {
    try {
      // 1. Actualización en DB
      await updatePreinscriptionStatus(id, status);
      
      // 2. Actualización en Estado Local (Para que el filtro reaccione al instante)
      setList(prev => prev.map(item => 
        item.id === id ? { ...item, status: status } : item
      ));

      toast({ 
        title: "Estado Actualizado", 
        description: `Registro movido a ${status.toUpperCase()}`,
        className: "bg-brand-dark text-white"
      });
    } catch (e) {
      toast({ title: "Error", description: "No se pudo cambiar el estado", variant: "destructive" });
    }
  };

  // --- EXPORTACIÓN FORMATO TABLA EXCEL (Standard Región) ---
  const exportToExcelFriendly = () => {
    if (list.length === 0) return;
    
    // Encabezados claros
    const headers = ["Fecha", "Aspirante", "DNI", "Edad", "Email", "Telefono", "Localidad", "Nivel", "Vínculo", "Modalidad", "Estado", "Consulta"];
    
    // Mapeo de datos con limpieza de comas para no romper celdas
    const rows = filteredList.map(item => [
      new Date(item.created_at).toLocaleDateString(),
      item.full_name.replace(/,/g, ''),
      item.dni,
      item.age,
      item.email,
      item.phone,
      item.location,
      item.level_to_start,
      item.relationship_club,
      item.preferred_modality,
      item.status.toUpperCase(),
      (item.message || "Sin consulta").replace(/,/g, ' ')
    ]);

    // Generación de CSV con delimitador punto y coma (Excel Español) + BOM para tildes
    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(e => e.join(";"))].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    // Nombre de archivo solicitado
    const dateStr = new Date().toLocaleDateString().replace(/\//g, '-');
    link.setAttribute("href", url);
    link.setAttribute("download", `inscriptos_fundacion_ministerio_${dateStr}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- FILTRADO (Sentido de pertenencia al estado) ---
  const filteredList = useMemo(() => {
    return list.filter(item => {
      const matchesSearch = 
        item.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.dni.includes(searchTerm);
      const matchesStatus = activeFilter === "all" || item.status === activeFilter;
      return matchesSearch && matchesStatus;
    });
  }, [list, searchTerm, activeFilter]);

  const stats = {
    total: list.length,
    pending: list.filter(i => i.status === 'pending').length,
    contacted: list.filter(i => i.status === 'contacted').length,
    rejected: list.filter(i => i.status === 'rejected').length
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pt-32 pb-24 px-4 md:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-brand-primary">
              <div className="p-2 bg-brand-primary/10 rounded-xl"><GraduationCap size={24} /></div>
              <span className="text-xs font-black uppercase tracking-[0.4em]">Gestión Ministerio de Educación</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-brand-dark tracking-tighter leading-none uppercase">
              Admin<span className="text-brand-primary">Edu</span>
            </h1>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <Button 
              onClick={exportToExcelFriendly}
              className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white rounded-2xl h-14 px-8 shadow-lg font-bold flex gap-2"
            >
              <Download size={18} /> DESCARGAR TABLA EXCEL
            </Button>
            <Button onClick={fetchList} variant="outline" className="rounded-2xl h-14 w-14 bg-white"><RefreshCcw size={18} className={loading ? "animate-spin" : ""} /></Button>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard title="Total" value={stats.total} icon={Users} color="blue" />
          <MetricCard title="Pendientes" value={stats.pending} icon={Clock} color="amber" />
          <MetricCard title="Contactados" value={stats.contacted} icon={UserCheck} color="green" />
          <MetricCard title="No Aplica" value={stats.rejected} icon={XCircle} color="red" />
        </div>

        {/* CONTROLES */}
        <Card className="border-none shadow-xl rounded-[2.5rem] bg-white p-6">
          <div className="flex flex-col md:flex-row gap-6 justify-between items-center">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <Input 
                placeholder="Buscar por Nombre o DNI..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-14 rounded-2xl bg-gray-50 border-none"
              />
            </div>

            <Tabs defaultValue="all" className="w-full md:w-auto" onValueChange={setActiveFilter}>
              <TabsList className="bg-gray-100 p-1 rounded-2xl h-14 w-full">
                <TabsTrigger value="all" className="rounded-xl px-6 font-bold text-[10px]">TODOS</TabsTrigger>
                <TabsTrigger value="pending" className="rounded-xl px-6 font-bold text-[10px] data-[state=active]:bg-amber-500">PENDIENTES</TabsTrigger>
                <TabsTrigger value="contacted" className="rounded-xl px-6 font-bold text-[10px] data-[state=active]:bg-green-600">CONTACTADOS</TabsTrigger>
                <TabsTrigger value="rejected" className="rounded-xl px-6 font-bold text-[10px] data-[state=active]:bg-red-600">DESCARTADOS</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </Card>

        {/* TABLA */}
        <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 uppercase text-[10px] font-black text-gray-400 tracking-widest">
                  <th className="px-8 py-6">Aspirante</th>
                  <th className="px-8 py-6">Contacto</th>
                  <th className="px-8 py-6">Nivel / Localidad</th>
                  <th className="px-8 py-6">Estado</th>
                  <th className="px-8 py-6 text-right">Gestión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <AnimatePresence>
                  {filteredList.map((item) => (
                    <motion.tr 
                      layout
                      key={item.id} 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      exit={{ opacity: 0 }}
                      className="hover:bg-brand-sand/5 transition-all group"
                    >
                      <td className="px-8 py-6">
                        <p className="font-black text-brand-dark uppercase tracking-tight">{item.full_name}</p>
                        <p className="text-[10px] text-gray-400 font-bold">DNI {item.dni} • {item.age} años</p>
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-1">
                          <a href={`https://wa.me/${item.phone.replace(/\D/g,'')}`} target="_blank" className="flex items-center gap-2 text-xs text-brand-primary font-black">
                            <Phone size={14} className="text-green-500" /> {item.phone}
                          </a>
                          <p className="text-[10px] text-gray-400 lowercase">{item.email}</p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-none text-[9px] font-black mb-1">{item.level_to_start}</Badge>
                        <div className="flex items-center gap-1 text-[10px] text-gray-400 uppercase font-bold"><MapPin size={10} /> {item.location}</div>
                      </td>
                      <td className="px-8 py-6">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-8 py-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl"><MoreVertical size={20} /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 shadow-2xl border-gray-100">
                            <DropdownMenuLabel className="text-[10px] uppercase font-black text-gray-400 px-3 py-2">Mover a:</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'contacted')} className="rounded-xl py-3 cursor-pointer font-bold text-xs uppercase text-blue-600">
                              <Phone className="mr-3 h-4 w-4" /> Marcar Contactado
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'inscrito')} className="rounded-xl py-3 cursor-pointer font-bold text-xs uppercase text-green-600">
                              <UserCheck className="mr-3 h-4 w-4" /> Confirmar Inscripción
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'rejected')} className="rounded-xl py-3 cursor-pointer font-bold text-xs uppercase text-red-600">
                              <XCircle className="mr-3 h-4 w-4" /> No Aplica / Descartar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, icon: Icon, color }) => {
  const colors = {
    blue: "text-blue-600 bg-blue-50",
    amber: "text-amber-600 bg-amber-50",
    green: "text-green-600 bg-green-50",
    red: "text-red-600 bg-red-50",
  };
  return (
    <Card className="border-none shadow-sm bg-white rounded-3xl p-6 flex items-center justify-between">
      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{title}</p>
        <p className="text-4xl font-black text-brand-dark">{value}</p>
      </div>
      <div className={`p-4 rounded-2xl ${colors[color]}`}><Icon size={24} /></div>
    </Card>
  );
};

const StatusBadge = ({ status }) => {
  const configs = {
    pending: { label: "PENDIENTE", class: "bg-amber-100 text-amber-700", icon: Clock },
    contacted: { label: "CONTACTADO", class: "bg-blue-100 text-blue-700", icon: Phone },
    inscrito: { label: "INSCRITO", class: "bg-green-100 text-green-700", icon: CheckCircle2 },
    rejected: { label: "NO APLICA", class: "bg-red-100 text-red-700", icon: XCircle },
  };
  const config = configs[status] || configs.pending;
  const Icon = config.icon;
  return (
    <Badge className={`${config.class} border-none text-[9px] font-black px-3 py-1 flex items-center gap-1 w-fit`}>
      <Icon size={12} /> {config.label}
    </Badge>
  );
};

export default EducationAdmin;