import React from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ExportButton = ({ data }) => {
  const exportToCSV = () => {
    if (!data || data.length === 0) return;

    // 1. Definir los encabezados para que el Excel se vea profesional
    const headers = [
      "ID", "Fecha Registro", "Email", "Nombre Completo", "DNI", 
      "Edad", "Ult. Año", "WhatsApp", "Localidad", "Nivel a Iniciar", 
      "Interés", "Vínculo Club", "Modalidad", "Horario", "Mensaje"
    ];

    // 2. Mapear los datos al orden de los encabezados
    const rows = data.map(item => [
      item.id,
      new Date(item.created_at).toLocaleDateString(),
      item.email,
      item.full_name?.toUpperCase(),
      item.dni,
      item.age,
      item.last_year_completed,
      item.phone,
      item.location,
      item.level_to_start,
      item.interest_area || 'N/A',
      item.relationship_club,
      item.preferred_modality,
      item.preferred_schedule || 'N/A',
      `"${item.message?.replace(/"/g, '""') || ''}"` // Evita errores con comas en el mensaje
    ]);

    // 3. Unir todo con punto y coma (mejor para Excel en español)
    const csvContent = [
      headers.join(";"), 
      ...rows.map(e => e.join(";"))
    ].join("\n");

    // 4. Crear el archivo y descargar
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Preinscripciones_Educacion_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Button 
      onClick={exportToCSV}
      variant="outline"
      className="flex items-center gap-2 border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white transition-all font-bold"
    >
      <Download size={18} />
      EXPORTAR A EXCEL (CSV)
    </Button>
  );
};

export default ExportButton;