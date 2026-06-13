// src/components/Admin/UserList.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import {
  Users,
  UserCheck,
  ShieldCheck,
  Mail,
  Phone,
  Calendar,
  Fingerprint,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Loader2,
  UserCog,
  Briefcase,
  GraduationCap,
  MailWarning,
  Copy,
} from 'lucide-react';
import SectionHeader from '@/components/Admin/shared/SectionHeader';
import SearchBar from '@/components/Admin/shared/SearchBar';
import ListSkeleton from '@/components/Admin/shared/ListSkeleton';
import EmptyState from '@/components/Admin/shared/EmptyState';
import { useSearch } from '@/components/Admin/shared/useSearch';
import FilterChips from '@/components/Comision/FilterChips';
import { USER_ROLES, createUser, updateUserRole, verifyUser, resendVerificationEmail } from '@/api/userApi';

// Presentación visual de cada rol (label + estilo + icono).
const ROLE_META = {
  admin: { label: 'Admin', icon: ShieldCheck, badge: 'bg-red-50 text-red-700 border-red-200' },
  comision_directiva: { label: 'Comisión Directiva', icon: Briefcase, badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  educacion_manager: { label: 'Gestor Educación', icon: GraduationCap, badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  user: { label: 'Miembro', icon: UserCheck, badge: 'bg-blue-50 text-blue-700 border-blue-200' },
};

const roleMeta = (role) => ROLE_META[role] || ROLE_META.user;

const EMPTY_FORM = { name: '', email: '', password: '', role: 'comision_directiva' };

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const { toast } = useToast();
  const { query, setQuery, filtered: filteredUsers } = useSearch(users, ['name', 'email', 'dni']);

  // Alta de usuario
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);

  // Filtro por rol
  const [roleFilter, setRoleFilter] = useState('all');

  const roleFilteredUsers = roleFilter === 'all'
    ? filteredUsers
    : filteredUsers.filter((u) => (u.role || 'user') === roleFilter);

  const roleChipOptions = [
    { value: 'all', label: 'Todos', count: filteredUsers.length },
    ...Object.entries(ROLE_META).map(([value, meta]) => ({
      value,
      label: meta.label,
      count: filteredUsers.filter((u) => (u.role || 'user') === value).length,
    })),
  ];

  // Edición de rol
  const [roleUser, setRoleUser] = useState(null); // usuario seleccionado
  const [newRole, setNewRole] = useState('');
  const [savingRole, setSavingRole] = useState(false);

  // Verificación de email
  const [verifyDialog, setVerifyDialog] = useState(null); // usuario seleccionado
  const [generatedLink, setGeneratedLink] = useState('');
  const [emailSent, setEmailSent] = useState(''); // email al que se envió
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setFetchError(true);
      toast({ title: "Error", description: "No se pudieron cargar los usuarios.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();

    const channel = supabase.channel('realtime:public:users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        fetchUsers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchUsers]);

  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'U';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (creating) return;
    setCreating(true);
    try {
      const { error } = await createUser({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });
      if (error) {
        toast({ title: 'No se pudo crear el usuario', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Usuario creado', description: `${form.name} fue dado de alta correctamente.` });
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      fetchUsers();
    } finally {
      setCreating(false);
    }
  };

  const openRoleDialog = (u) => {
    setRoleUser(u);
    setNewRole(u.role || 'user');
  };

  const handleSaveRole = async () => {
    if (!roleUser || savingRole) return;
    if (newRole === roleUser.role) { setRoleUser(null); return; }
    setSavingRole(true);
    try {
      const { error } = await updateUserRole(roleUser.id, newRole);
      if (error) {
        toast({ title: 'No se pudo cambiar el rol', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Rol actualizado', description: `${roleUser.name || 'El usuario'} ahora es ${roleMeta(newRole).label}.` });
      setRoleUser(null);
      fetchUsers();
    } finally {
      setSavingRole(false);
    }
  };

  const closeVerifyDialog = () => {
    if (verifyLoading) return;
    setVerifyDialog(null);
    setGeneratedLink('');
    setEmailSent('');
    setLinkCopied(false);
  };

  const handleManualVerify = async () => {
    if (!verifyDialog || verifyLoading) return;
    setVerifyLoading(true);
    try {
      const { error } = await verifyUser(verifyDialog.id);
      if (error) {
        toast({ title: 'Error al verificar', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Usuario verificado', description: `${verifyDialog.name || 'El usuario'} fue verificado correctamente.` });
      closeVerifyDialog();
      fetchUsers();
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleGetVerificationLink = async () => {
    if (!verifyDialog || verifyLoading) return;
    setVerifyLoading(true);
    try {
      const { data, error } = await resendVerificationEmail(verifyDialog.id);
      if (error) {
        toast({ title: 'Error al enviar verificación', description: error.message, variant: 'destructive' });
        return;
      }
      if (data.sent) {
        // Resend configurado: email enviado exitosamente
        setEmailSent(data.email);
      } else {
        // Sin Resend o fallo de envío: mostrar link para copiar manualmente
        setGeneratedLink(data.link);
        if (data.emailError) {
          toast({ title: 'No se pudo enviar el email', description: `${data.emailError}. Podés copiar el link manualmente.`, variant: 'destructive' });
        }
      }
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  return (
    <div>
      <SectionHeader
        icon={Users}
        title="Usuarios"
        description="Base de datos central de miembros, administradores y voluntarios."
        actions={
          <Button onClick={() => setCreateOpen(true)} className="bg-brand-action hover:bg-red-800 text-white font-bold rounded-xl">
            <Plus className="w-4 h-4 mr-2" /> Crear usuario
          </Button>
        }
      />

      {loading ? (
        <ListSkeleton rows={6} />
      ) : fetchError && users.length === 0 ? (
        <Card className="border-none shadow-sm bg-white rounded-2xl">
          <CardContent className="p-0">
            <EmptyState
              icon={AlertTriangle}
              title="Error al cargar los usuarios"
              description="No se pudieron obtener los datos. Recargá la página o intentá nuevamente más tarde."
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Buscar por nombre, email o DNI..."
            count={roleFilteredUsers.length}
            countLabel="usuarios"
          />

          <FilterChips
            options={roleChipOptions}
            value={roleFilter}
            onChange={setRoleFilter}
            className="mb-4"
          />

          <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              {roleFilteredUsers.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No se encontraron usuarios"
                  description={query || roleFilter !== 'all' ? 'Probá con otro término de búsqueda o filtro.' : 'Todavía no hay usuarios registrados.'}
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-brand-sand border-b border-gray-100 text-brand-dark text-xs font-bold uppercase tracking-wider">
                        <th className="px-6 py-4">Usuario</th>
                        <th className="px-6 py-4">Contacto</th>
                        <th className="px-6 py-4 hidden md:table-cell">Documento/Nac.</th>
                        <th className="px-6 py-4">Estado / Rol</th>
                        <th className="px-6 py-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {roleFilteredUsers.map((u) => {
                        const meta = roleMeta(u.role);
                        const RoleIcon = meta.icon;
                        return (
                        <tr key={u.id} className="hover:bg-brand-sand/30 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                                <AvatarFallback className="bg-brand-primary text-white text-xs font-bold">
                                  {getInitials(u.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-bold text-brand-dark">{u.name || 'Sin Nombre'}</p>
                                <p className="text-xs text-gray-400">Desde {formatDate(u.created_at)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center text-sm text-gray-600 gap-2">
                                 <Mail className="w-3.5 h-3.5 text-brand-gold" /> {u.email}
                              </div>
                              {u.phone && (
                                <div className="flex items-center text-xs text-gray-500 gap-2">
                                   <Phone className="w-3.5 h-3.5 text-brand-gold" /> {u.phone}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 hidden md:table-cell">
                            <div className="flex flex-col gap-1">
                              {u.dni && (
                                <div className="flex items-center text-xs text-gray-600 gap-2">
                                   <Fingerprint className="w-3.5 h-3.5 text-gray-400" /> {u.dni}
                                </div>
                              )}
                              {u.birth_date && (
                                <div className="flex items-center text-xs text-gray-600 gap-2">
                                   <Calendar className="w-3.5 h-3.5 text-gray-400" /> {formatDate(u.birth_date)}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col sm:flex-row gap-2">
                              <Badge
                                variant="outline"
                                className={`flex items-center justify-center gap-1.5 px-2 py-1 border shadow-sm ${meta.badge}`}
                              >
                                <RoleIcon className="w-3 h-3" />
                                <span>{meta.label}</span>
                              </Badge>

                              <Badge
                                variant="outline"
                                className={`flex items-center justify-center gap-1.5 px-2 py-1 ${u.is_verified ? 'border-green-200 text-green-700 bg-green-50' : 'border-amber-200 text-amber-700 bg-amber-50'}`}
                              >
                                {u.is_verified ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                <span>{u.is_verified ? 'Verificado' : 'Pendiente'}</span>
                              </Badge>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {!u.is_verified && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setVerifyDialog(u)}
                                  className="text-amber-500 hover:text-amber-700 hover:bg-amber-50 gap-1.5"
                                >
                                  <MailWarning className="w-4 h-4" /> Verificar
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openRoleDialog(u)}
                                className="text-gray-500 hover:text-brand-primary hover:bg-brand-primary/5 gap-1.5"
                              >
                                <UserCog className="w-4 h-4" /> Rol
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );})}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* --- Dialog: crear usuario --- */}
      <Dialog open={createOpen} onOpenChange={(open) => { if (!creating) { setCreateOpen(open); if (!open) setForm(EMPTY_FORM); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-poppins text-brand-dark">Crear usuario</DialogTitle>
            <DialogDescription>
              La cuenta queda activa de inmediato (sin paso de verificación de email).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cu-name">Nombre completo</Label>
              <Input id="cu-name" value={form.name} required
                onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej. María Pérez" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cu-email">Email</Label>
              <Input id="cu-email" type="email" value={form.email} required
                onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="persona@ejemplo.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cu-password">Contraseña</Label>
              <Input id="cu-password" type="text" value={form.password} required minLength={8}
                onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 8 caracteres" />
              <p className="text-xs text-gray-400">Compartísela con la persona; podrá cambiarla luego.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Rol</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {USER_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={creating} onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={creating} className="bg-brand-primary hover:bg-brand-dark text-white">
                {creating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creando...</> : 'Crear usuario'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- Dialog: cambiar rol --- */}
      <Dialog open={!!roleUser} onOpenChange={(open) => { if (!savingRole && !open) setRoleUser(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-poppins text-brand-dark">Cambiar rol</DialogTitle>
            <DialogDescription>
              {roleUser?.name || roleUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Nuevo rol</Label>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {USER_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={savingRole} onClick={() => setRoleUser(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveRole} disabled={savingRole} className="bg-brand-primary hover:bg-brand-dark text-white">
              {savingRole ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</> : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* --- Dialog: verificar email --- */}
      <Dialog open={!!verifyDialog} onOpenChange={(open) => { if (!open) closeVerifyDialog(); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-poppins text-brand-dark">Verificación de email</DialogTitle>
            <DialogDescription>
              {verifyDialog?.name || verifyDialog?.email}
            </DialogDescription>
          </DialogHeader>

          {emailSent ? (
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <p className="font-semibold text-brand-dark">Email enviado</p>
              <p className="text-sm text-gray-500">
                Se envió un link de acceso a <span className="font-medium">{emailSent}</span>.
                Al hacer clic quedará logueado y su cuenta se verificará automáticamente.
              </p>
            </div>
          ) : generatedLink ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                Compartí este link con el usuario. Al hacer clic quedará logueado y
                su cuenta se verificará automáticamente.
              </p>
              <div className="flex items-center gap-2">
                <Input value={generatedLink} readOnly className="text-xs font-mono" />
                <Button variant="outline" size="icon" onClick={handleCopyLink} title="Copiar link">
                  {linkCopied ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-gray-400">
                El link es de un solo uso y expira en 1 hora.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                Este usuario aún no confirmó su email. Podés verificarlo manualmente
                o enviarle un email con un link de acceso.
              </p>
              <Button
                onClick={handleManualVerify}
                disabled={verifyLoading}
                className="w-full bg-brand-primary hover:bg-brand-dark text-white"
              >
                {verifyLoading
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verificando...</>
                  : <><CheckCircle2 className="w-4 h-4 mr-2" /> Verificar manualmente</>
                }
              </Button>
              <Button
                onClick={handleGetVerificationLink}
                disabled={verifyLoading}
                variant="outline"
                className="w-full"
              >
                {verifyLoading
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
                  : <><Mail className="w-4 h-4 mr-2" /> Enviar email de verificación</>
                }
              </Button>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={verifyLoading} onClick={closeVerifyDialog}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserList;
