import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateBody } from "@/lib/validation";
import { withHandler, apiError, apiSuccess } from "@/lib/api-middleware";
import { supabase } from "@/lib/supabase";

const WebhookSchema = z.object({
  event: z.enum(["pr:created", "pr:merged", "pr:closed", "friction:created", "vote:cast"]),
  data: z.record(z.unknown()).optional(),
});

/**
 * Webhook endpoint for external integrations.
 * Accepts events like PR creation/merge/close and syncs to database.
 */
export async function POST(req: NextRequest) {
  return withHandler(req, async () => {
    // Verify webhook secret (optional — skip if not configured)
    const signature = req.headers.get("x-webhook-signature");
    const secret = process.env.WEBHOOK_SECRET;
    if (secret && signature !== secret) {
      return apiError("Invalid webhook signature", 401);
    }

    const rawBody = await req.json();
    const validation = validateBody(rawBody, WebhookSchema);
    if (!validation.success) return validation.error;

    const { event, data } = validation.data;

    // Process event
    switch (event) {
      case "pr:created": {
        if (!data?.description || !data?.diff_id) {
          return apiError("Webhook pr:created requires description and diff_id", 422);
        }
        await supabase.from("pull_requests").upsert({
          id: crypto.randomUUID(),
          diff_id: data.diff_id,
          user_id: (data as Record<string, unknown>).user_id || null,
          description: data.description,
          affected_users: (data as Record<string, unknown>).affected_users || 1,
          status: "open",
          votes_for: 0,
          votes_against: 0,
        }).onConflict("id");
        break;
      }

      case "pr:merged": {
        const prId = (data as Record<string, unknown>).pr_id;
        if (prId) {
          await supabase.from("pull_requests")
            .update({ status: "merged" })
            .eq("id", prId);
        }
        break;
      }

      case "pr:closed": {
        const prId = (data as Record<string, unknown>).pr_id;
        if (prId) {
          await supabase.from("pull_requests")
            .update({ status: "closed" })
            .eq("id", prId);
        }
        break;
      }

      case "vote:cast": {
        const prId = (data as Record<string, unknown>).pr_id;
        const voteType = (data as Record<string, unknown>).vote_type; // "for" | "against"
        if (prId && (voteType === "for" || voteType === "against")) {
          const pr = await supabase
            .from("pull_requests")
            .select("votes_for, votes_against")
            .eq("id", prId)
            .single();
          if (pr.data) {
            await supabase
              .from("pull_requests")
              .update({
                [voteType === "for" ? "votes_for" : "votes_against"]:
                  (pr.data[voteType === "for" ? "votes_for" : "votes_against"] || 0) + 1,
              })
              .eq("id", prId);
          }
        }
        break;
      }

      case "friction:created": {
        if (!data?.saas_name || !data?.component_name) {
          return apiError("Webhook friction:created requires saas_name and component_name", 422);
        }
        await supabase.from("frictions").insert({
          user_id: (data as Record<string, unknown>).user_id || null,
          saas_name: String(data.saas_name),
          component_name: String(data.component_name),
          description: data.description || "",
          screenshot_url: (data as Record<string, unknown>).screenshot_url || null,
        });
        break;
      }
    }

    return apiSuccess({
      received: true,
      event,
      processed_at: new Date().toISOString(),
    }, 202);
  }, { rateLimit: { windowMs: 60_000, maxRequests: 60 } });
}
