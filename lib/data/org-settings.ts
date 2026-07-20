import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSignedDocUrlMap } from "@/lib/storage";
import { isVaultType, type VaultType } from "@/lib/vault-shared";
import { NOTIFY_KINDS, type NotifyKind } from "@/lib/notify-shared";
import type { PersonActor } from "@/lib/actor";
import type { Json } from "@/lib/database.types";

export interface OrgSettings {
  id: string;
  type: "epc" | "sub";
  name: string;
  country: string | null;
  address: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  vatId: string | null;
  iban: string | null;
  accountantEmail: string | null;
}

export interface VaultDoc {
  id: string;
  type: VaultType;
  title: string;
  validFrom: string | null;
  validUntil: string | null;
  storagePath: string;
  url: string | null;
}

export async function getOrgSettings(actor: PersonActor): Promise<OrgSettings | null> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("organizations")
    .select("id, type, name, country, address, contact_email, contact_phone, vat_id, iban, accountant_email")
    .eq("id", actor.orgId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    type: data.type as "epc" | "sub",
    name: data.name,
    country: data.country,
    address: data.address,
    contactEmail: data.contact_email,
    contactPhone: data.contact_phone,
    vatId: data.vat_id,
    iban: data.iban,
    accountantEmail: data.accountant_email,
  };
}

/**
 * Save the company record. The caller must already have passed
 * requireOfficeActor: these fields decide where money is sent, so they are the
 * single most attractive thing in this application to tamper with.
 *
 * The organization id comes from the ACTOR, never from the form, so no crafted
 * submission can edit another company's IBAN.
 */
export async function updateOrgSettings(
  actor: PersonActor,
  input: {
    name: string;
    address: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    vatId: string | null;
    iban: string | null;
    accountantEmail: string | null;
  },
): Promise<void> {
  const name = input.name.trim();
  if (!name) throw new Error("A company name is required.");

  const db = createAdminClient();
  const { error } = await db
    .from("organizations")
    .update({
      name,
      address: input.address?.trim() || null,
      contact_email: input.contactEmail?.trim().toLowerCase() || null,
      contact_phone: input.contactPhone?.trim() || null,
      vat_id: input.vatId?.trim() || null,
      // Stored without spaces so two people typing the same IBAN differently
      // do not produce two different looking records on an invoice.
      iban: input.iban?.replace(/\s+/g, "").toUpperCase() || null,
      accountant_email: input.accountantEmail?.trim().toLowerCase() || null,
    })
    .eq("id", actor.orgId);

  if (error) throw new Error(`Could not save settings: ${error.message}`);
}

/**
 * A person's own notification preferences. Any office role may edit their own,
 * and only their own: the person id comes from the actor.
 */
export async function setNotificationPref(
  actor: PersonActor,
  kind: NotifyKind,
  wanted: boolean,
): Promise<void> {
  if (!(NOTIFY_KINDS as readonly string[]).includes(kind)) {
    throw new Error("Unknown notification kind.");
  }

  const db = createAdminClient();
  const { data: person } = await db
    .from("people")
    .select("notification_prefs")
    .eq("id", actor.personId)
    .maybeSingle();

  const current =
    person?.notification_prefs && typeof person.notification_prefs === "object"
      ? (person.notification_prefs as Record<string, boolean>)
      : {};

  // Only an explicit false silences a kind, so returning to the default is a
  // deletion rather than storing true.
  const next: Record<string, boolean> = { ...current };
  if (wanted) delete next[kind];
  else next[kind] = false;

  const { error } = await db
    .from("people")
    .update({ notification_prefs: next as Json })
    .eq("id", actor.personId);

  if (error) throw new Error(`Could not save preference: ${error.message}`);
}

export async function getNotificationPrefs(actor: PersonActor): Promise<Record<string, unknown>> {
  const db = createAdminClient();
  const { data } = await db
    .from("people")
    .select("notification_prefs")
    .eq("id", actor.personId)
    .maybeSingle();

  return data?.notification_prefs && typeof data.notification_prefs === "object"
    ? (data.notification_prefs as Record<string, unknown>)
    : {};
}

/**
 * The organization's own compliance documents, newest expiry first so whatever
 * is about to lapse is at the top.
 *
 * Signing is safe here because the rows are selected by the ACTOR's org id:
 * every path handed to getSignedDocUrlMap therefore belongs to the caller's own
 * company. Any future caller reading another org's rows (an EPC looking at its
 * subcontractor's vault) must resolve access through requireProjectActor first.
 */
export async function listVaultDocs(actor: PersonActor): Promise<VaultDoc[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("documents")
    .select("id, type, title, valid_from, valid_until, storage_path")
    .eq("org_id", actor.orgId)
    .order("valid_until", { ascending: true, nullsFirst: false });

  if (error || !data) return [];

  const urls = await getSignedDocUrlMap(data.map((d) => d.storage_path));

  return data.map((d) => ({
    id: d.id,
    type: (isVaultType(d.type) ? d.type : "other") as VaultType,
    title: d.title,
    validFrom: d.valid_from,
    validUntil: d.valid_until,
    storagePath: d.storage_path,
    url: urls[d.storage_path] ?? null,
  }));
}

export async function addVaultDoc(
  actor: PersonActor,
  input: {
    type: VaultType;
    title: string;
    validFrom: string | null;
    validUntil: string | null;
    storagePath: string;
  },
): Promise<void> {
  // The path was minted for this organization by createVaultDocTarget. Checked
  // again here so a crafted action call cannot attach another company's file to
  // this company's vault.
  if (!input.storagePath.startsWith(`${actor.orgId}/vault/`)) {
    throw new Error("Invalid document path.");
  }

  const db = createAdminClient();
  const { error } = await db.from("documents").insert({
    org_id: actor.orgId,
    type: input.type,
    title: input.title.trim() || input.type,
    valid_from: input.validFrom || null,
    valid_until: input.validUntil || null,
    storage_path: input.storagePath,
    uploaded_by_person: actor.personId,
  });

  if (error) throw new Error(`Could not save document: ${error.message}`);
}
