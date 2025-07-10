import { format } from 'date-fns';

export const generateGoogleCalendarLink = (activity) => {
  if (!activity || !activity.title || !activity.date) {
    return '#';
  }

  const G_CAL_DATE_FORMAT = "yyyyMMdd'T'HHmmss'Z'";
  const G_CAL_DATE_FORMAT_ALL_DAY = "yyyyMMdd";

  let startDate, endDate;

  try {
    const activityDate = new Date(activity.date);
    
    const [hours = 0, minutes = 0] = (activity.duration_start_time || "00:00").split(':').map(Number);
    activityDate.setUTCHours(hours, minutes, 0, 0);

    startDate = new Date(activityDate);

    let durationHours = 0;
    let durationMinutes = 0;

    if (activity.duration && typeof activity.duration === 'string') {
      const durationMatch = activity.duration.match(/(\d+)\s*(hora|horas)/i);
      if (durationMatch && durationMatch[1]) {
        durationHours = parseInt(durationMatch[1], 10);
      }
      const minutesMatch = activity.duration.match(/(\d+)\s*(minuto|minutos)/i);
      if (minutesMatch && minutesMatch[1]) {
        durationMinutes = parseInt(minutesMatch[1], 10);
      }
      if (activity.duration.includes('todo el día') || activity.duration.toLowerCase().includes('all day')) {
         endDate = new Date(startDate);
         endDate.setUTCDate(startDate.getUTCDate() + 1); 
         
         const formattedStartDate = format(startDate, G_CAL_DATE_FORMAT_ALL_DAY);
         const formattedEndDate = format(endDate, G_CAL_DATE_FORMAT_ALL_DAY);
         
         const details = encodeURIComponent(activity.description || `Participar en: ${activity.title}`);
         const location = encodeURIComponent(activity.modality === 'presencial' ? 'Salta, Argentina' : 'Virtual');
         
         return `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(activity.title)}&dates=${formattedStartDate}/${formattedEndDate}&details=${details}&location=${location}`;
      }
    }
    
    if (durationHours === 0 && durationMinutes === 0) {
        durationHours = 2; // Default duration if not specified
    }

    endDate = new Date(startDate.getTime() + (durationHours * 60 * 60 * 1000) + (durationMinutes * 60 * 1000));

    const formattedStartDate = format(startDate, G_CAL_DATE_FORMAT);
    const formattedEndDate = format(endDate, G_CAL_DATE_FORMAT);

    const details = encodeURIComponent(activity.description || `Participar en: ${activity.title}`);
    const location = encodeURIComponent(activity.modality === 'presencial' ? 'Salta, Argentina' : 'Virtual');

    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(activity.title)}&dates=${formattedStartDate}/${formattedEndDate}&details=${details}&location=${location}`;

  } catch (error) {
    console.error("Error generating Google Calendar link:", error);
    return '#';
  }
};