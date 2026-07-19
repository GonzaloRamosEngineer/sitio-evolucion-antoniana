// supabase/functions/send-contact-email/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { Resend } from "npm:resend@3";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "info@evolucionantoniana.com";
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
    }
  });
}
serve(async (req)=>{
  if (req.method === "OPTIONS") return json({
    ok: true
  });
  try {
    if (!RESEND_API_KEY) {
      console.error("Falta RESEND_API_KEY");
      return json({
        error: "Mailer not configured"
      }, 500);
    }
    const { recipient_email, subject, text_content, html_content, reply_to } = await req.json();
    if (!recipient_email || !subject || !text_content && !html_content) {
      return json({
        error: "Faltan parámetros requeridos"
      }, 400);
    }
    const resend = new Resend(RESEND_API_KEY);
    const sendRes = await resend.emails.send({
      from: `Fundación Evolución Antoniana <${FROM_EMAIL}>`,
      to: [
        recipient_email
      ],
      subject,
      text: text_content ?? undefined,
      html: html_content ?? undefined,
      reply_to: reply_to ?? undefined
    });
    if (sendRes.error) {
      console.error("Resend error:", sendRes.error);
      return json({
        error: "Send failed",
        details: sendRes.error
      }, 502);
    }
    console.log("Email enviado OK, ID:", sendRes.data?.id);
    return json({
      ok: true,
      id: sendRes.data?.id
    });
  } catch (err) {
    console.error("send-contact-email exception:", err);
    return json({
      error: err?.message ?? "Unexpected error"
    }, 500);
  }
});
