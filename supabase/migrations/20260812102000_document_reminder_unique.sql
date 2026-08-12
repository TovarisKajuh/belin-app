-- One reminder per document per threshold, enforced by the database.
--
-- The compliance panel notices that an A1 is expiring while it renders, which
-- means two people opening the dashboard at the same moment both notice it.
-- Without this index both would send the warning, and the dedupe would be a
-- read-then-write check with a race in the middle.
--
-- With it, inserting the reminder row IS the claim: exactly one caller gets a
-- successful insert, and only that caller sends. The loser gets 23505 and does
-- nothing, which is the same pattern the naročilnica numbering uses.

delete from public.document_reminders a
using public.document_reminders b
where a.document_id = b.document_id
  and a.days_before = b.days_before
  and a.ctid > b.ctid;

create unique index idx_document_reminders_once
  on public.document_reminders (document_id, days_before);
