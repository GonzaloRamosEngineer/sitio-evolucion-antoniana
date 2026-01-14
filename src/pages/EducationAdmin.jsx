import React, { useEffect, useState } from 'react';
import { getPreinscriptions, updatePreinscriptionStatus } from '@/api/educationApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, Search, Download, CheckCircle2, 
  Clock, Phone, Mail, GraduationCap 
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const EducationAdmin = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchList = async () => {
    try {
      const data = await getPreinscriptions();
      setList(data);
    } catch (e) {
      toast({ title: "Error al cargar datos", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(); }, []);

  const handleStatusChange = async (id, status) => {
    try {
      await updatePreinscriptionStatus(id, status);
      toast({ title: "Estado actualizado" });
      fetchList();
    } catch (e) {
      toast({ title: "Error al actualizar", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] pt-32 pb-24 px-6">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-6">
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-brand-primary">
                    <GraduationCap size={20} />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Gestión Ministerial</span>
                </div>
                <h1 className="text-5xl font-black font-poppins text-brand-dark tracking-tighter">PREINSCRIPTOS</h1>
            </div>
            <Button variant="outline" className="rounded-2xl font-bold border-gray-200 h-14 px-8">
                <Download size={18} className="mr-2" /> EXPORTAR CSV
            </Button>
        </div>

        {/* TABLA DE GESTIÓN */}
        <Card className="border-none shadow-2xl rounded-[3rem] overflow-hidden">
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                <th className="px-8 py-6">Aspirante</th>
                                <th className="px-8 py-6">Contacto</th>
                                <th className="px-8 py-6">Nivel Deseado</th>
                                <th className="px-8 py-6">Estado</th>
                                <th className="px-8 py-6 text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {list.map((item) => (
                                <tr key={item.id} className="hover:bg-brand-sand/5 transition-colors">
                                    <td className="px-8 py-8">
                                        <p className="font-black text-brand-dark uppercase tracking-tight">{item.full_name}</p>
                                        <p className="text-[10px] text-gray-400 font-bold tracking-tighter">DNI: {item.dni} • {item.age} años</p>
                                    </td>
                                    <td className="px-8 py-8 space-y-1">
                                        <div className="flex items-center gap-2 text-xs text-brand-primary font-bold">
                                            <Phone size={12} /> {item.phone}
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                            <Mail size={12} /> {item.email}
                                        </div>
                                    </td>
                                    <td className="px-8 py-8">
                                        <Badge className="bg-blue-50 text-blue-600 border-none uppercase text-[9px] font-black tracking-widest px-3">
                                            {item.level_to_start}
                                        </Badge>
                                        <p className="text-[9px] text-gray-400 mt-1 italic">{item.location}</p>
                                    </td>
                                    <td className="px-8 py-8">
                                        {item.status === 'pending' ? (
                                            <Badge className="bg-amber-50 text-amber-600 border-none text-[9px] font-black tracking-widest">PENDIENTE</Badge>
                                        ) : (
                                            <Badge className="bg-green-50 text-green-600 border-none text-[9px] font-black tracking-widest uppercase">{item.status}</Badge>
                                        )}
                                    </td>
                                    <td className="px-8 py-8 text-right">
                                        <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            className="text-[10px] font-black text-brand-primary hover:bg-brand-primary/10 rounded-xl"
                                            onClick={() => handleStatusChange(item.id, 'contactado')}
                                        >
                                            MARCAR CONTACTADO
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EducationAdmin;