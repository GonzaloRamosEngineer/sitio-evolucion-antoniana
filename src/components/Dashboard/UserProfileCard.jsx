import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Mail, Phone, Calendar } from 'lucide-react';
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
    <Card className="shadow-lg border-gray-100 bg-white overflow-hidden rounded-2xl">
      <div className="h-24 bg-brand-primary/10"></div>
      
      <div className="px-6 relative">
         <Avatar className="h-20 w-20 border-4 border-white shadow-md absolute -top-10">
            <AvatarImage src={user?.avatar_url || ''} alt={user?.name} className="object-cover" />
            <AvatarFallback className="bg-brand-sand text-brand-primary font-bold text-xl">
              {getInitials(user?.name)}
            </AvatarFallback>
         </Avatar>
      </div>

      <div className="pt-12 px-6 pb-6">
         <div className="mb-6">
            <h3 className="text-xl font-bold font-poppins text-brand-dark">{user?.name || 'Usuario'}</h3>
            <p className="text-sm text-gray-500">{user?.role === 'admin' ? 'Administrador' : 'Miembro'}</p>
         </div>

         <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm text-gray-600">
                <Mail className="w-4 h-4 text-brand-gold" />
                <span>{user?.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
                <Phone className="w-4 h-4 text-brand-gold" />
                <span>{user?.phone || 'Sin teléfono'}</span>
            </div>
            {user?.created_at && (
                <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Calendar className="w-4 h-4 text-brand-gold" />
                    <span>Miembro desde {new Date(user.created_at).toLocaleDateString()}</span>
                </div>
            )}
         </div>

         <div className="mt-6 pt-6 border-t border-gray-100">
            <EditProfileModal user={user} onUpdateSuccess={onUpdateSuccess} />
         </div>
      </div>
    </Card>
  );
};

export default UserProfileCard;