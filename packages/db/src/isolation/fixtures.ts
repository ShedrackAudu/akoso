// How to make one valid row for a given school, for every tenant table (spec:
// stage-1-tenancy.md, section 5). The isolation suite finds tenant tables by reading
// the database, then fails for any table missing here. Add an entry in the same pull
// request as the table's migration.
import { sql, type SQL } from "drizzle-orm"

/**
 * @param tenantId The school the row belongs to.
 * @param marker A unique lower-case token (letters, digits, hyphens) to keep rows apart.
 */
export type IsolationFixture = (tenantId: string, marker: string) => SQL

export const ISOLATION_FIXTURES: Record<string, IsolationFixture> = {
  "platform.idempotency_keys": (tenantId, marker) => sql`
    insert into platform.idempotency_keys (tenant_id, user_id, key, request_hash, state)
    values (${tenantId}, 'isolation', ${marker}, 'hash', 'done')`,

  // The trigger fills seq, time and hashes.
  "platform.audit_events": (tenantId, marker) => sql`
    insert into platform.audit_events (tenant_id, actor, action, entity_type, entity_id)
    values (${tenantId}, 'system:isolation', 'isolation.test', 'isolation', ${marker})`,

  // One per school, so an existing head is left as it is.
  "platform.audit_chain_heads": (tenantId) => sql`
    insert into platform.audit_chain_heads (tenant_id, last_seq, last_hash)
    values (${tenantId}, 0, repeat('0', 64))
    on conflict (tenant_id) do nothing`,

  "platform.tenant_feature_flags": (tenantId, marker) => sql`
    insert into platform.tenant_feature_flags (tenant_id, flag_key, enabled)
    values (${tenantId}, ${`isolation.${marker.replaceAll("-", "_")}`}, true)`,

  "platform.memberships": (tenantId, marker) => sql`
    with person as (
      insert into platform.users (id, name, email)
      values (gen_random_uuid(), 'Isolation Test Person', ${`${marker}@isolation.invalid`})
      returning id
    )
    insert into platform.memberships (tenant_id, user_id, roles)
    select ${tenantId}, id, array['teacher'] from person`,

  // Sign-in part B.
  "platform.custom_roles": (tenantId, marker) => sql`
    insert into platform.custom_roles (tenant_id, name, permissions)
    values (${tenantId}, ${`Isolation ${marker}`}, array['identity.profile.read'])`,

  "platform.membership_custom_roles": (tenantId, marker) => sql`
    with person as (
      insert into platform.users (id, name, email)
      values (gen_random_uuid(), 'Isolation Role Holder', ${`${marker}-holder@isolation.invalid`})
      returning id
    ), membership as (
      insert into platform.memberships (tenant_id, user_id, roles)
      select ${tenantId}, id, array['teacher'] from person returning id
    ), role as (
      insert into platform.custom_roles (tenant_id, name, permissions)
      values (${tenantId}, ${`Isolation holder ${marker}`}, '{}') returning id
    )
    insert into platform.membership_custom_roles (tenant_id, membership_id, custom_role_id)
    select ${tenantId}, membership.id, role.id from membership, role`,

  "platform.school_settings": (tenantId, marker) => sql`
    insert into platform.school_settings (tenant_id, key, value)
    values (${tenantId}, ${`isolation.${marker}`}, '[]'::jsonb)`,

  "platform.contact_changes": (tenantId, marker) => sql`
    with person as (
      insert into platform.users (id, name, email)
      values (gen_random_uuid(), 'Isolation Changed Person', ${`${marker}-changed@isolation.invalid`})
      returning id
    )
    insert into platform.contact_changes
      (tenant_id, user_id, changed_by, kind, check_method, evidence, reason)
    select ${tenantId}, id, id, 'phone_number', 'in_person', 'parent_id', 'sim_lost'
    from person`,

  "platform.tenant_domains": (tenantId, marker) => sql`
    insert into platform.tenant_domains (tenant_id, hostname, status)
    values (${tenantId}, ${`${marker}.isolation.example`}, 'pending_dns')`,

  "school_setup.school_profiles": (tenantId) => sql`
    insert into school_setup.school_profiles (tenant_id, school_types)
    values (${tenantId}, array['primary'])`,

  "school_setup.academic_sessions": (tenantId, marker) => sql`
    insert into school_setup.academic_sessions (tenant_id, name, starts_on, ends_on)
    values (${tenantId}, ${`iso-${marker}`.slice(0, 40)}, '2026-09-07', '2027-07-23')`,

  "school_setup.terms": (tenantId, marker) => sql`
    with session as (
      insert into school_setup.academic_sessions (tenant_id, name, starts_on, ends_on)
      values (${tenantId}, ${`iso-t-${marker}`.slice(0, 40)}, '2026-09-07', '2027-07-23')
      returning id
    )
    insert into school_setup.terms (tenant_id, session_id, number, starts_on, ends_on)
    select ${tenantId}, id, 1, '2026-09-07', '2026-12-11' from session`,

  "school_setup.non_school_days": (tenantId, marker) => sql`
    insert into school_setup.non_school_days (tenant_id, starts_on, ends_on, reason, note)
    values (${tenantId}, '2026-10-01', '2026-10-01', 'public_holiday', ${marker.slice(0, 200)})`,

  "school_setup.levels": (tenantId, marker) => sql`
    insert into school_setup.levels (tenant_id, name, stage, position)
    values (${tenantId}, ${`Level ${marker}`.slice(0, 60)}, 'nursery', 1)
    on conflict (tenant_id, stage) do nothing`,

  "school_setup.classes": (tenantId, marker) => sql`
    with level as (
      insert into school_setup.levels (tenant_id, name, stage, position)
      values (${tenantId}, 'Primary', 'primary', 2)
      on conflict (tenant_id, stage) do update set name = excluded.name
      returning id
    )
    insert into school_setup.classes (tenant_id, level_id, name, position)
    select ${tenantId}, id, ${`Class ${marker}`.slice(0, 60)}, 1 from level`,

  "school_setup.class_arms": (tenantId, marker) => sql`
    with level as (
      insert into school_setup.levels (tenant_id, name, stage, position)
      values (${tenantId}, 'Junior secondary', 'junior', 3)
      on conflict (tenant_id, stage) do update set name = excluded.name
      returning id
    ), class as (
      insert into school_setup.classes (tenant_id, level_id, name, position)
      select ${tenantId}, id, ${`Arm class ${marker}`.slice(0, 60)}, 1 from level
      returning id
    )
    insert into school_setup.class_arms (tenant_id, class_id, name, curriculum)
    select ${tenantId}, id, 'A', 'nerdc_2025' from class`,

  "school_setup.subjects": (tenantId, marker) => sql`
    insert into school_setup.subjects (tenant_id, name, code, kind)
    values (${tenantId}, ${`Subject ${marker}`.slice(0, 80)}, ${subjectCode(marker)}, 'core')`,

  "school_setup.arm_subjects": (tenantId, marker) => sql`
    with level as (
      insert into school_setup.levels (tenant_id, name, stage, position)
      values (${tenantId}, 'Senior secondary', 'senior', 4)
      on conflict (tenant_id, stage) do update set name = excluded.name
      returning id
    ), class as (
      insert into school_setup.classes (tenant_id, level_id, name, position)
      select ${tenantId}, id, ${`Pair class ${marker}`.slice(0, 60)}, 1 from level
      returning id
    ), arm as (
      insert into school_setup.class_arms (tenant_id, class_id, name, curriculum)
      select ${tenantId}, id, 'A', 'nerdc_2025' from class
      returning id
    ), subject as (
      insert into school_setup.subjects (tenant_id, name, code, kind)
      values (${tenantId}, ${`Pair subject ${marker}`.slice(0, 80)}, ${subjectCode(`p${marker}`)}, 'core')
      returning id
    )
    insert into school_setup.arm_subjects (tenant_id, arm_id, subject_id)
    select ${tenantId}, arm.id, subject.id from arm, subject`,
}

/** A subject code (2–8 capitals or digits) that differs with the marker. */
function subjectCode(marker: string): string {
  let hash = 0
  for (const character of marker)
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  return `X${hash.toString(36).toUpperCase().slice(0, 7)}`
}
