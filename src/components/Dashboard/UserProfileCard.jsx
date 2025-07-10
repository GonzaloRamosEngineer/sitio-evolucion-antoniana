import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserCircle, Mail, Phone } from 'lucide-react';
import EditProfileModal from './EditProfileModal';

const UserProfileCard = ({ user, onUpdateSuccess }) => {
  const getInitials = (name) => {
    if (!name && user?.email) return user.email[0].toUpperCase();
    if (!name) return '?';
    const names = name.split(' ');
    if (names.length === 1) return names[0][0]?.toUpperCase();
    return (names[0][0] + names[names.length - 1][0])?.toUpperCase();
  };

  return (
    <Card className="shadow-xl border-marron-legado/10 dark:border-border dark:bg-card">
      <CardHeader className="bg-primary-antoniano dark:bg-primary text-blanco-fundacion dark:text-primary-foreground rounded-t-xl p-6">
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16 border-2 border-celeste-complementario dark:border-primary/70">
            <AvatarImage src={user?.avatar_url || ''} alt={user?.name || 'Usuario'} />
            <AvatarFallback className="bg-celeste-complementario dark:bg-accent text-primary-antoniano dark:text-primary text-2xl font-semibold">
              {getInitials(user?.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-2xl font-poppins text-blanco-fundacion dark:text-primary-foreground">{user?.name || user?.email || 'Usuario'}</CardTitle>
            <CardDescription className="text-celeste-complementario/80 dark:text-primary/80">
              {user?.role === 'admin' ? 'Administrador/a' : 'Miembro'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center text-marron-legado dark:text-foreground">
          <UserCircle className="w-5 h-5 mr-3 text-primary-antoniano/80 dark:text-primary/80" />
          <span>{user?.name || 'Nombre no especificado'}</span>
        </div>
        <div className="flex items-center text-marron-legado dark:text-foreground">
          <Mail className="w-5 h-5 mr-3 text-primary-antoniano/80 dark:text-primary/80" />
          <span>{user?.email}</span>
        </div>
        <div className="flex items-center text-marron-legado dark:text-foreground">
          <Phone className="w-5 h-5 mr-3 text-primary-antoniano/80 dark:text-primary/80" />
          <span>{user?.phone || 'Teléfono no especificado'}</span>
        </div>
        <EditProfileModal user={user} onUpdateSuccess={onUpdateSuccess} />
      </CardContent>
    </Card>
  );
};

export default UserProfileCard;