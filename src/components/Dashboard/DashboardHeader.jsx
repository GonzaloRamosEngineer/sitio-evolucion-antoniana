import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Edit3, ShieldCheck, User } from 'lucide-react';
import EditProfileModal from './EditProfileModal';

const DashboardHeader = ({ user, onUpdateSuccess }) => {
  const getInitials = (name) => {
    if (!name && user?.email) return user.email[0].toUpperCase();
    if (!name) return '?';
    const names = name.split(' ');
    if (names.length === 1) return names[0][0]?.toUpperCase();
    return (names[0][0] + names[names.length - 1][0])?.toUpperCase();
  };

  return (
    <div className="mb-8 p-8 bg-gradient-to-br from-brand-primary to-blue-700 rounded-3xl shadow-xl text-white relative overflow-hidden">
      {/* Decoración de fondo */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
      
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
          <Avatar className="h-24 w-24 border-4 border-white/20 shadow-2xl">
            <AvatarImage src={user?.avatar_url || ''} alt={user?.name || 'Usuario'} className="object-cover" />
            <AvatarFallback className="bg-brand-sand text-brand-primary text-3xl font-bold">
              {getInitials(user?.name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="space-y-1">
            <h2 className="text-3xl font-poppins font-bold text-white tracking-tight">
                {user?.name || user?.email?.split('@')[0] || 'Usuario'}
            </h2>
            <div className="flex items-center justify-center md:justify-start gap-2 text-blue-100">
                {user?.role === 'admin' ? <ShieldCheck className="w-4 h-4" /> : <User className="w-4 h-4" />}
                <span className="text-sm font-medium uppercase tracking-wider">
                    {user?.role === 'admin' ? 'Administrador' : 'Miembro Activo'}
                </span>
            </div>
            {user?.email && (
                <p className="text-sm text-blue-200/80">{user.email}</p>
            )}
          </div>
        </div>

        <EditProfileModal user={user} onUpdateSuccess={onUpdateSuccess}>
          <Button 
            variant="outline" 
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 hover:border-white/40 transition-all backdrop-blur-sm"
          >
            <Edit3 className="w-4 h-4 mr-2" />
            Editar Perfil
          </Button>
        </EditProfileModal>
      </div>
    </div>
  );
};

export default DashboardHeader;