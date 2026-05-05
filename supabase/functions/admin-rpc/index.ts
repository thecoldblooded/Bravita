/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createServiceClient,
  getCorsHeaders,
  getStringField,
  getUserFromRequest,
  jsonResponse,
  readJsonBody,
} from "../_shared/edge-security.ts";

const ORDER_STATUSES = new Set(["pending", "processing", "preparing", "shipped", "delivered", "cancelled"]);

async function getAdminProfile(supabase: ReturnType<typeof createServiceClient>, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("is_admin,is_superadmin")
    .eq("id", userId)
    .maybeSingle();

  if (error) return { isAdmin: false, isSuperadmin: false };
  return {
    isAdmin: data?.is_admin === true || data?.is_superadmin === true,
    isSuperadmin: data?.is_superadmin === true,
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return jsonResponse(req, 405, { error: "Method not allowed" });
  }

  try {
    const body = await readJsonBody(req, 16_384);
    const action = getStringField(body, "action");
    const supabase = createServiceClient();
    const user = await getUserFromRequest(req, supabase);
    if (!user?.id) {
      return jsonResponse(req, 401, { error: "Unauthorized" });
    }

    const profile = await getAdminProfile(supabase, user.id);
    if (!profile.isAdmin) {
      return jsonResponse(req, 403, { error: "Forbidden" });
    }

    if (action === "updateOrderStatus") {
      const orderId = getStringField(body, "orderId");
      const status = getStringField(body, "status");
      const note = getStringField(body, "note");
      if (!orderId || !ORDER_STATUSES.has(status)) {
        return jsonResponse(req, 400, { error: "Invalid order status request" });
      }

      const { data, error } = await supabase.rpc("admin_update_order_status_for_actor_v1", {
        p_actor_id: user.id,
        p_order_id: orderId,
        p_new_status: status,
        p_note: note || null,
      });

      if (error) return jsonResponse(req, 400, { error: error.message || "Order status update failed" });
      return jsonResponse(req, 200, { success: data === true });
    }

    if (action === "getDashboardStats") {
      const startDate = getStringField(body, "startDate");
      const endDate = getStringField(body, "endDate");
      if (!startDate || !endDate) {
        return jsonResponse(req, 400, { error: "Invalid dashboard date range" });
      }

      const { data, error } = await supabase.rpc("get_dashboard_stats_v2_for_actor_v1", {
        p_actor_id: user.id,
        start_date: startDate,
        end_date: endDate,
      });

      if (error) return jsonResponse(req, 400, { error: error.message || "Dashboard stats failed" });
      return jsonResponse(req, 200, { success: true, data });
    }

    if (action === "syncUserAdminStatus") {
      if (!profile.isSuperadmin) {
        return jsonResponse(req, 403, { error: "Forbidden" });
      }

      const targetUserId = getStringField(body, "userId");
      const isAdmin = body.isAdmin === true;
      if (!targetUserId) {
        return jsonResponse(req, 400, { error: "Invalid target user" });
      }

      const { error } = await supabase.rpc("sync_user_admin_status_for_actor_v1", {
        p_actor_id: user.id,
        p_user_id: targetUserId,
        p_is_admin: isAdmin,
      });

      if (error) return jsonResponse(req, 400, { error: error.message || "Admin sync failed" });
      return jsonResponse(req, 200, { success: true });
    }

    return jsonResponse(req, 400, { error: "Unknown action" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const status = message === "PAYLOAD_TOO_LARGE" ? 413 : 400;
    return jsonResponse(req, status, { error: "Request could not be processed" });
  }
});

