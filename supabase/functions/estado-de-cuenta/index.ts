// Estado de cuenta para MatchBot («Mi aporte» por WhatsApp). Ver _shared/estadoCuenta.ts.
//
// verify_jwt = false (supabase/config.toml): no hay usuario, es servicio a servicio. La
// autenticación es la firma HMAC con ESTADO_CUENTA_SECRET, que viaja en cada pedido.
//
// Secretos: ESTADO_CUENTA_SECRET (≥ 32 caracteres; el mismo valor que en MatchBot es
// MATCHBOT_CONNECTOR_<ALIAS>_SECRET). SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta
// la plataforma. SITE_URL es opcional: sin ella se usa el sitio de la entidad.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleEstadoCuenta } from "../_shared/estadoCuenta.ts";
import { sitioEntidad } from "../_shared/entidad.generated.ts";

Deno.serve((req) =>
  handleEstadoCuenta(req, {
    secret: (Deno.env.get("ESTADO_CUENTA_SECRET") ?? "").trim(),
    sitio: sitioEntidad(Deno.env.get("SITE_URL")),
    accountStatus: async (phone, chargeIds) => {
      const url = Deno.env.get("SUPABASE_URL");
      const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!url || !key) throw new Error("not_configured");
      const admin = createClient(url, key, { auth: { persistSession: false } });
      const { data, error } = await admin.rpc("account_status_for_phone", {
        p_phone: phone,
        p_charge_ids: chargeIds.length ? chargeIds : null,
      });
      if (error) throw new Error(error.message);
      return data;
    },
  })
);
