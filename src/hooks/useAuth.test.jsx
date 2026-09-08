// src/hooks/useAuth.test.jsx
//
// Lo que fija este archivo es UNA regla, y es la que este provider ya rompió dos
// veces: **`loading` desmonta la aplicación, así que solo puede moverse cuando
// cambia quién está logueado.**
//
// `ProtectedRoute` devuelve un spinner EN LUGAR de `children` mientras `loading`
// es true. Cada vez que el provider lo pone en true, la pantalla protegida entera
// se desmonta y se vuelve a montar: se pierde el formulario a medio llenar, el
// lote de movimientos ya analizado, el scroll. Desde afuera se ve idéntico a una
// recarga de página, y por eso es difícil de diagnosticar mirando la pantalla.
//
// La primera vez fue un listener propio de `visibilitychange`; se quitó el
// listener y se dejó el mecanismo, así que el síntoma volvió por otra puerta —
// `onAuthStateChange` emite eventos que no cambian la identidad de nadie.
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './useAuth';

// El callback que la app le pasa a `supabase.auth.onAuthStateChange`, para poder
// dispararle los eventos que emite Supabase de verdad.
let emitir;
const perfilesLeidos = vi.fn();

const SESION = { user: { id: 'u1', email: 'admin@x.com' } };

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      // Devuelve la sesión real: `syncSession` la lee al montar y es la que
      // resuelve el arranque. Con `null` acá, el arranque cerraría la sesión
      // justo después de que el test la abre, y el test mediría una carrera
      // suya en vez del comportamiento del provider.
      getSession: vi.fn(async () => ({ data: { session: SESION }, error: null })),
      onAuthStateChange: (cb) => {
        emitir = cb;
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => {
            perfilesLeidos();
            // ⚠️ LA DEMORA ES PARTE DEL TEST, no ruido.
            // Leer el perfil es un viaje a Supabase. Si el mock resuelve en el
            // mismo microtask, React agrupa el `loading` true→false y **el
            // desmontaje nunca llega a renderizarse**: el test pasa con el bug
            // puesto. Se comprobó — con el arreglo revertido, 3 de 4 seguían en
            // verde hasta que se agregó esto.
            await new Promise((r) => setTimeout(r, 0));
            return { data: { id: 'u1', name: 'Admin', role: 'admin' }, error: null };
          },
        }),
      }),
    }),
  },
}));

// ⚠️ `toast` TIENE que ser la misma referencia entre renders, como en el real
// (es una función de módulo). `fetchUserProfile` depende de él, y de
// `fetchUserProfile` depende el efecto que se suscribe a `onAuthStateChange`:
// con un `vi.fn()` nuevo por render, el efecto se vuelve a suscribir y a llamar
// a `syncSession()` en cada render, y el test mide eso en vez del provider.
const toastEstable = vi.fn();
vi.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast: toastEstable }) }));
vi.mock('@/lib/queryClient', () => ({ queryClient: { clear: vi.fn() } }));

// Espeja lo que hace ProtectedRoute: mientras `loading` es true, los hijos NO
// están en el árbol. Contar montajes es contar cuántas veces se perdió el
// trabajo de la persona.
let montajes = 0;
const Pantalla = () => {
  React.useEffect(() => {
    montajes += 1;
  }, []);
  return <div>pantalla protegida</div>;
};

const Protegida = () => {
  const { loading, isAuthenticated } = useAuth();
  if (loading) return <div>spinner</div>;
  if (!isAuthenticated) return <div>login</div>;
  return <Pantalla />;
};

const montar = () =>
  render(
    <AuthProvider>
      <Protegida />
    </AuthProvider>
  );

beforeEach(() => {
  montajes = 0;
  perfilesLeidos.mockClear();
  emitir = undefined;
});

describe('AuthProvider — `loading` solo se mueve si cambia la identidad', () => {
  it('🔒 TOKEN_REFRESHED no desmonta la pantalla protegida', async () => {
    montar();
    // Se espera POR EL CONTADOR y no por el texto: el texto aparece al commitear
    // el render y `montajes` se incrementa recién en el efecto, así que bajo carga
    // `waitFor` del texto puede resolver con el contador todavía en 0. Pasó al
    // correr la suite completa.
    await waitFor(() => expect(montajes).toBe(1));

    // Supabase lo emite solo cuando falta menos de 90s para que venza el access
    // token (EXPIRY_MARGIN_MS), o sea una vez por hora. Basta una para perder un
    // lote de movimientos analizado.
    await act(async () => {
      await emitir('TOKEN_REFRESHED', SESION);
    });

    expect(screen.getByText('pantalla protegida')).toBeInTheDocument();
    expect(montajes).toBe(1);
  });

  it('🔒 el INITIAL_SESSION duplicado no relee el perfil ni remonta', async () => {
    // Llega dos veces de verdad: `syncSession` lo dispara a mano y Supabase lo
    // emite por su cuenta al suscribirse.
    montar();
    await waitFor(() => expect(screen.getByText('pantalla protegida')).toBeInTheDocument());

    await act(async () => {
      await emitir('INITIAL_SESSION', SESION);
    });

    expect(montajes).toBe(1);
    expect(perfilesLeidos).toHaveBeenCalledTimes(1);
  });

  // El control positivo. Sin esto, "no remonta nunca" y "no remonta cuando debe"
  // se ven idénticos desde afuera, y un provider que ignora un logout pasaría
  // los dos tests de arriba.
  it('🔒 SIGNED_OUT sí cambia la pantalla: la verificación puede fallar', async () => {
    montar();
    await waitFor(() => expect(screen.getByText('pantalla protegida')).toBeInTheDocument());

    await act(async () => {
      await emitir('SIGNED_OUT', null);
    });

    expect(screen.getByText('login')).toBeInTheDocument();
  });

  it('🔒 entrar con OTRA cuenta relee el perfil, no reusa el de la anterior', async () => {
    montar();
    await waitFor(() => expect(screen.getByText('pantalla protegida')).toBeInTheDocument());
    expect(perfilesLeidos).toHaveBeenCalledTimes(1);

    await act(async () => {
      await emitir('SIGNED_IN', { user: { id: 'u2', email: 'otro@x.com' } });
    });

    expect(perfilesLeidos).toHaveBeenCalledTimes(2);
  });
});
