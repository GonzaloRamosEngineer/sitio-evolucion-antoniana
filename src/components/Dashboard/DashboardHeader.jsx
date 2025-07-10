import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';
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
    <div className="mb-10 p-6 bg-gradient-to-r from-primary-antoniano to-azul-antoniano dark:from-primary dark:to-primary/80 rounded-xl shadow-lg text-white">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16 border-2 border-celeste-complementario dark:border-primary/70">
            <AvatarImage src={user?.avatar_url || ''} alt={user?.name || 'Usuario'} />
            <AvatarFallback className="bg-celeste-complementario dark:bg-accent text-primary-antoniano dark:text-primary text-2xl font-semibold">
              {getInitials(user?.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-poppins font-semibold text-white">{user?.name || user?.email || 'Usuario'}</h2>
            <p className="text-sm text-celeste-complementario/90 dark:text-primary/90">
              {user?.role === 'admin' ? 'Administrador/a' : 'Miembro'}
            </p>
          </div>
        </div>
        <EditProfileModal user={user} onUpdateSuccess={onUpdateSuccess}>
          <Button variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/30 dark:bg-primary/20 dark:hover:bg-primary/30 dark:text-primary-foreground dark:border-primary/50">
            <Edit className="w-4 h-4 mr-2" />
            Editar Datos del Perfil
          </Button>
        </EditProfileModal>
      </div>
    </div>
  );
};

export default DashboardHeader;