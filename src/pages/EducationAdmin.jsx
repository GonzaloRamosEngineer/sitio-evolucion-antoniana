import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getPreinscriptions,
  updatePreinscriptionStatus,
} from "@/api/educationApi";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  Search,
  Download,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  GraduationCap,
  MoreVertical,
  MapPin,
  UserCheck,
  RefreshCcw,
  LayoutGrid,
  List,
  FilterX,
  XCircle,
  Trash2,
  ExternalLink,
  MessageSquare,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  useEffect(() => {
    fetchList();
  }, []);

  // --- GESTIÓN DE ESTADOS (Actualización inmediata de UI) ---
  const handleStatusChange = async (id, status) => {
    const previousList = [...list];
    // Optimistic Update: Cambiamos en UI antes que en DB para mayor fluidez
    setList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: status } : item)),
    );

    try {
      await updatePreinscriptionStatus(id, status);
      toast({
        title: "Estado Actualizado",
        description: `Registro movido a ${status.toUpperCase()}`,
        className: "bg-brand-dark text-white border-none rounded-2xl",
      });
    } catch (e) {
      setList(previousList); // Revertir si falla
      toast({
        title: "Error",
        description: "No se pudo sincronizar el cambio",
        variant: "destructive",
      });
    }
  };

  // --- EXPORTACIÓN FORMATO TABLA EXCEL (Standard Salta/Argentina) ---
  const exportToExcelFriendly = () => {
    if (filteredList.length === 0) {
      toast({
        title: "Sin datos",
        description: "No hay registros para exportar con los filtros actuales.",
      });
      return;
    }

    // Encabezados con formato oficial
    // Encabezados exactos requeridos por el Ministerio
    const headers = [
      "APELLIDO Y NOMBRE",
      "DNI",
      "EDAD",
      "ÚLTIMO AÑO CURSADO DE SECUNDARIA",
      "SIN INGRESO A SECUNDARIA",
      "CONTACTO",
      "E-MAIL",
    ];

    const rows = filteredList.map((item) => {
      // Lógica técnica: determinamos si el aspirante nunca ingresó a la secundaria
      const sinIngreso =
        item.last_year_completed === "sin-ingreso" ? "SÍ" : "NO";

      // Si no ingresó, el "Último año" queda vacío o aclarado según prefieras
      const ultimoAño =
        item.last_year_completed === "sin-ingreso"
          ? "N/A"
          : item.last_year_completed.replace(/-/g, " ").toUpperCase();

      return [
        item.full_name.toUpperCase().replace(/;/g, " "), // Apellido y Nombre
        item.dni, // DNI
        item.age, // EDAD
        ultimoAño, // ÚLTIMO AÑO CURSADO DE SECUNDARIA
        sinIngreso, // SIN INGRESO A SECUNDARIA
        `'${item.phone}`, // CONTACTO (con ' para evitar errores de Excel)
        item.email.toLowerCase(), // E-MAIL
      ];
    });

    // CSV con punto y coma + BOM para tildes (Perfecto para Excel en Español)
    const csvContent =
      "\uFEFF" +
      [headers.join(";"), ...rows.map((e) => e.join(";"))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const dateStr = new Date().toISOString().split("T")[0];
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `inscriptos_fundacion_ministerio_${dateStr}.csv`,
    );

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const exportMasterData = () => {
  if (list.length === 0) return;

  const headers = [
    "ID REGISTRO", "FECHA", "HORA", "ESTADO", "NOMBRE COMPLETO", "DNI", "EDAD",
    "EMAIL", "WHATSAPP", "LOCALIDAD", "ULTIMO NIVEL", "NIVEL A INICIAR",
    "INTERES/ORIENTACIÓN", "VÍNCULO CLUB", "MODALIDAD", "TURNO", "MENSAJE USUARIO"
  ];

  const rows = list.map(item => {
    const fechaObj = new Date(item.created_at);
    return [
      item.id,
      fechaObj.toLocaleDateString('es-AR'),
      fechaObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      item.status.toUpperCase(),
      item.full_name.toUpperCase(),
      item.dni,
      item.age,
      item.email.toLowerCase(),
      `'${item.phone}`,
      item.location,
      item.last_year_completed,
      item.level_to_start,
      item.interest_area || "No especifica",
      item.relationship_club,
      item.preferred_modality,
      item.preferred_schedule || "No especifica",
      `"${item.message?.replace(/"/g, '""').replace(/\n/g, ' ') || ''}"`
    ];
  });

  const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(e => e.join(";"))].join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `MASTER_DATA_EVOLUCION_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  toast({ title: "Master Data Generada", description: "Informe completo listo para análisis." });
};

  // --- FILTRADO INTELIGENTE ---
  const filteredList = useMemo(() => {
    return list.filter((item) => {
      const searchStr = searchTerm.toLowerCase();
      const matchesSearch =
        item.full_name.toLowerCase().includes(searchStr) ||
        item.dni.includes(searchStr) ||
        item.email.toLowerCase().includes(searchStr) ||
        item.location.toLowerCase().includes(searchStr);

      const matchesStatus =
        activeFilter === "all" || item.status === activeFilter;
      return matchesSearch && matchesStatus;
    });
  }, [list, searchTerm, activeFilter]);

  const stats = {
    total: list.length,
    pending: list.filter((i) => i.status === "pending").length,
    contacted: list.filter((i) => i.status === "contacted").length,
    rejected: list.filter((i) => i.status === "rejected").length,
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pt-32 pb-24 px-4 md:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* HEADER ESTRATÉGICO */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
          <div className="space-y-3">
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 text-brand-primary"
            >
              <div className="p-2 bg-brand-primary/10 rounded-xl">
                <GraduationCap size={24} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.4em]">
                Gestión Ministerial v2.0
              </span>
            </motion.div>
            <h1 className="text-5xl md:text-7xl font-black text-brand-dark tracking-tighter leading-none uppercase">
              Admin<span className="text-brand-primary">Edu</span>
            </h1>
          </div>

          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            {/* EL BOTÓN PARA EL MINISTERIO (Se queda igual) */}
            <Button
              onClick={exportToExcelFriendly}
              className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white rounded-2xl h-14 px-8 shadow-xl shadow-green-600/20 font-bold flex gap-2 transition-all active:scale-95"
            >
              <Download size={18} /> EXPORTAR MINISTERIO
            </Button>

            {/* NUEVO: BOTÓN MASTER DATA PARA TU ANÁLISIS */}
            <Button
              onClick={exportMasterData}
              className="flex-1 md:flex-none bg-brand-dark hover:bg-brand-primary text-white rounded-2xl h-14 px-8 shadow-xl shadow-brand-dark/20 font-bold flex gap-2 transition-all active:scale-95"
            >
              <LayoutGrid size={18} /> MASTER DATA FUNDACIÓN
            </Button>

            <Button
              onClick={fetchList}
              variant="outline"
              className="rounded-2xl h-14 w-14 bg-white border-gray-200 hover:bg-gray-50 shadow-sm transition-all"
            >
              <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
            </Button>
          </div>
        </div>

        {/* DASHBOARD RÁPIDO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            title="Total Registros"
            value={stats.total}
            icon={Users}
            color="blue"
          />
          <MetricCard
            title="Por Contactar"
            value={stats.pending}
            icon={Clock}
            color="amber"
          />
          <MetricCard
            title="Gestión Exitosa"
            value={stats.contacted}
            icon={UserCheck}
            color="green"
          />
          <MetricCard
            title="Descartados"
            value={stats.rejected}
            icon={XCircle}
            color="red"
          />
        </div>

        {/* CONTROLES DE FILTRADO */}
        <Card className="border-none shadow-2xl shadow-brand-dark/5 rounded-[2.5rem] bg-white p-6">
          <div className="flex flex-col md:flex-row gap-6 justify-between items-center">
            <div className="relative w-full md:w-96 group">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-primary transition-colors"
                size={20}
              />
              <Input
                placeholder="Nombre, DNI, Email o Localidad..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-14 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-medium"
              />
            </div>

            <Tabs
              value={activeFilter}
              className="w-full md:w-auto"
              onValueChange={setActiveFilter}
            >
              <TabsList className="bg-gray-100 p-1 rounded-2xl h-14 w-full flex overflow-x-auto no-scrollbar">
                <TabsTrigger
                  value="all"
                  className="rounded-xl px-6 font-bold text-[10px] tracking-widest uppercase"
                >
                  TODOS
                </TabsTrigger>
                <TabsTrigger
                  value="pending"
                  className="rounded-xl px-6 font-bold text-[10px] tracking-widest uppercase data-[state=active]:bg-amber-500"
                >
                  PENDIENTES
                </TabsTrigger>
                <TabsTrigger
                  value="contacted"
                  className="rounded-xl px-6 font-bold text-[10px] tracking-widest uppercase data-[state=active]:bg-green-600"
                >
                  CONTACTADOS
                </TabsTrigger>
                <TabsTrigger
                  value="rejected"
                  className="rounded-xl px-6 font-bold text-[10px] tracking-widest uppercase data-[state=active]:bg-red-600"
                >
                  DESCARTADOS
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </Card>

        {/* TABLA PRINCIPAL */}
        <div className="bg-white rounded-[3rem] shadow-2xl shadow-brand-dark/5 overflow-hidden border border-gray-100">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100 uppercase text-[10px] font-black text-gray-400 tracking-[0.2em]">
                  <th className="px-8 py-6">Aspirante</th>
                  <th className="px-8 py-6">Canales de Contacto</th>
                  <th className="px-8 py-6">Perfil Académico</th>
                  <th className="px-8 py-6">Nivel Previo</th>
                  <th className="px-8 py-6">Estado Actual</th>
                  <th className="px-8 py-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <AnimatePresence mode="popLayout">
                  {filteredList.length > 0 ? (
                    filteredList.map((item) => (
                      <motion.tr
                        layout
                        key={item.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-brand-sand/5 transition-all group"
                      >
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <span className="font-black text-brand-dark uppercase tracking-tight text-sm">
                              {item.full_name}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                DNI {item.dni}
                              </span>
                              <span className="text-[10px] font-bold text-brand-gold uppercase tracking-tighter">
                                {item.age} Años
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col gap-1">
                            <a
                              href={`https://wa.me/${item.phone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-xs text-brand-primary font-black hover:text-green-600 transition-colors group/link"
                            >
                              <MessageSquare
                                size={14}
                                className="text-green-500 group-hover/link:scale-110 transition-transform"
                              />
                              {item.phone}
                            </a>
                            <span className="text-[10px] text-gray-400 lowercase font-medium flex items-center gap-1">
                              <Mail size={12} /> {item.email}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col gap-1">
                            <Badge
                              variant="outline"
                              className="bg-blue-50 text-blue-700 border-none text-[9px] font-black px-2 py-0.5 w-fit"
                            >
                              {item.level_to_start}
                            </Badge>
                            <div className="flex items-center gap-1 text-[10px] text-gray-400 uppercase font-bold tracking-tighter">
                              <MapPin size={10} className="text-brand-gold" />{" "}
                              {item.location}
                            </div>
                          </div>
                        </td>

                        {/* ... después de la celda de contacto ... */}
                        <td className="px-8 py-6">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-black text-brand-dark uppercase tracking-tight">
                              Cursó hasta:
                            </span>
                            <Badge
                              variant="secondary"
                              className="bg-gray-100 text-gray-600 border-none text-[9px] font-bold px-2 py-0.5 w-fit uppercase"
                            >
                              {item.last_year_completed.replace(/-/g, " ")}
                            </Badge>
                          </div>
                        </td>
                        {/* ... antes de la celda de Nivel / Localidad ... */}

                        <td className="px-8 py-6">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="px-8 py-6 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                className="h-11 w-11 p-0 rounded-2xl hover:bg-gray-100 transition-all border border-transparent hover:border-gray-200 shadow-sm hover:shadow-none"
                              >
                                <MoreVertical
                                  size={20}
                                  className="text-brand-dark"
                                />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-64 rounded-[1.5rem] p-3 shadow-2xl border-gray-100 bg-white/95 backdrop-blur-sm"
                            >
                              <DropdownMenuLabel className="text-[9px] uppercase font-black text-gray-400 px-3 py-2 tracking-widest">
                                FLUJO DE TRABAJO
                              </DropdownMenuLabel>

                              <DropdownMenuItem
                                onClick={() =>
                                  handleStatusChange(item.id, "contacted")
                                }
                                className="rounded-xl py-3 cursor-pointer font-bold text-xs uppercase text-blue-600 focus:bg-blue-50 focus:text-blue-700 transition-all"
                              >
                                <Phone className="mr-3 h-4 w-4" /> Marcar como
                                Contactado
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() =>
                                  handleStatusChange(item.id, "inscrito")
                                }
                                className="rounded-xl py-3 cursor-pointer font-bold text-xs uppercase text-green-600 focus:bg-green-50 focus:text-green-700 transition-all"
                              >
                                <CheckCircle2 className="mr-3 h-4 w-4" />{" "}
                                Finalizar Inscripción
                              </DropdownMenuItem>

                              <DropdownMenuSeparator className="my-2 bg-gray-50" />

                              <DropdownMenuItem
                                onClick={() =>
                                  handleStatusChange(item.id, "rejected")
                                }
                                className="rounded-xl py-3 cursor-pointer font-bold text-xs uppercase text-red-500 focus:bg-red-50 focus:text-red-600 transition-all"
                              >
                                <XCircle className="mr-3 h-4 w-4" /> No aplica /
                                Descartar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </motion.tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="py-32 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="p-6 bg-gray-50 rounded-full text-gray-300">
                            <FilterX size={48} />
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-brand-dark font-black uppercase text-sm tracking-widest">
                              Sin coincidencias
                            </h4>
                            <p className="text-gray-400 text-xs font-medium">
                              Probá ajustando los filtros o el buscador.
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTES AUXILIARES ---

const MetricCard = ({ title, value, icon: Icon, color }) => {
  const colors = {
    blue: "text-blue-600 bg-blue-50 border-blue-100 shadow-blue-600/5",
    amber: "text-amber-600 bg-amber-50 border-amber-100 shadow-amber-600/5",
    green: "text-green-600 bg-green-50 border-green-100 shadow-green-600/5",
    red: "text-red-600 bg-red-50 border-red-100 shadow-red-600/5",
  };
  return (
    <Card
      className={`border border-white/50 shadow-lg ${colors[color]} rounded-[2rem] p-6 flex items-center justify-between transition-all hover:-translate-y-1`}
    >
      <div className="space-y-1">
        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
          {title}
        </p>
        <p className="text-4xl font-black text-brand-dark tracking-tighter">
          {value}
        </p>
      </div>
      <div
        className={`p-4 rounded-2xl bg-white shadow-sm border border-inherit`}
      >
        <Icon size={24} />
      </div>
    </Card>
  );
};

const StatusBadge = ({ status }) => {
  const configs = {
    pending: {
      label: "PENDIENTE",
      class: "bg-amber-100 text-amber-700",
      icon: Clock,
    },
    contacted: {
      label: "CONTACTADO",
      class: "bg-blue-100 text-blue-700",
      icon: Phone,
    },
    inscrito: {
      label: "INSCRITO",
      class: "bg-green-100 text-green-700",
      icon: CheckCircle2,
    },
    rejected: {
      label: "NO APLICA",
      class: "bg-red-100 text-red-700",
      icon: XCircle,
    },
  };
  const config = configs[status] || configs.pending;
  const Icon = config.icon;
  return (
    <Badge
      className={`${config.class} border-none text-[9px] font-black px-3 py-1 flex items-center gap-2 w-fit tracking-widest shadow-sm`}
    >
      <Icon size={12} /> {config.label}
    </Badge>
  );
};

export default EducationAdmin;
