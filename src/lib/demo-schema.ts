import { z } from "zod";

export const demoRoles = ["creator", "reviewer", "manager"] as const;
export const demoRoleSchema = z.enum(demoRoles);
export type DemoRole = z.infer<typeof demoRoleSchema>;

const accountSchema = z.object({
  email: z.email(),
  password: z.string().min(24),
  userId: z.uuid().optional(),
});

export const demoSlotSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  verificationOnly: z.boolean(),
  accounts: z.object({ creator: accountSchema, reviewer: accountSchema, manager: accountSchema }),
});

export const demoManifestSchema = z.object({
  projectUrl: z.url(),
  slots: z.array(demoSlotSchema).min(3),
}).superRefine((manifest, ctx) => {
  const ids = manifest.slots.map((slot) => slot.id);
  const workspaces = manifest.slots.map((slot) => slot.workspaceId);
  const users = manifest.slots.flatMap((slot) => demoRoles.flatMap((role) => {
    const id = slot.accounts[role].userId;
    return id ? [id] : [];
  }));
  if (new Set(ids).size !== ids.length || new Set(workspaces).size !== workspaces.length || new Set(users).size !== users.length) {
    ctx.addIssue({ code: "custom", message: "Demo slots, workspaces and role identities must be distinct." });
  }
});
export type DemoManifest = z.infer<typeof demoManifestSchema>;

export const demoLeaseSchema = z.object({
  slot_id: z.uuid(), workspace_id: z.uuid(), expires_at: z.iso.datetime({ offset: true }),
  ai_attempts: z.number().int().nonnegative(), ai_attempt_limit: z.number().int().min(1).max(15),
});
export type DemoLease = z.infer<typeof demoLeaseSchema>;
