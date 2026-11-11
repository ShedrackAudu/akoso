## 27. Database design

Create normalised Drizzle migrations for tables such as:

- **Platform:** `groups`, `tenants`, `branches`, `users`, `memberships` (user × tenant × role), `sessions`, `audit_events`, `feature_flags`, `platform_settings`, `support_tickets`, `roles` and `role_permissions` (custom roles), `approval_requests` (two-person control), `domain_events` (outbox), `idempotency_keys`, `terms_acceptances`, `leads`, `signup_requests`, `agent_applications`, `platform_staff`, `platform_role_assignments`, `support_access_grants`, `emergency_switches`, `platform_announcements`, `tenant_exits`, `agent_commissions`, `agent_payouts`
- **Calendar:** `academic_sessions`, `terms`, `non_school_days`, `school_events`, `event_rsvps`
- **Structure:** `levels`, `classes`, `class_arms`, `curriculum_versions`, `subjects`, `class_subjects` (arm × subject × teacher × term)
- **People:** `students`, `guardians`, `families`, `student_guardians`, `staff`, `enrollments`, `authorised_collectors`, `medical_records`, `consent_records`, `documents`, `billing_accounts`, `sponsors`, `custody_restrictions`, `contact_change_requests`
- **Assessment:** `assessment_schemes`, `grading_schemes`, `traits`, `score_sheets`, `scores`, `score_changes`, `trait_ratings`, `comments`, `nursery_ratings`
- **Results:** `subject_results`, `term_results`, `result_snapshots`, `report_card_files`, `transcripts`
- **Fees:** `fee_items`, `discounts`, `invoices`, `invoice_lines`, `instalment_plans`, `payments`, `payment_allocations`, `family_credits`, `virtual_accounts`, `payment_events`, `unmatched_payments`, `refunds`, `invoice_line_payers`, `deposits`, `write_offs`, `receipt_counters`, `receipts`, `payment_moves`, `bank_statement_imports`, `bank_statement_lines`, `payouts`, `payout_items`, `disputes`
- **Finance:** `expenses`, `expense_categories`, `salary_structures`, `payroll_runs`, `payslips`, `tax_tables`, `statutory_deadlines`
- **Comms:** `notifications`, `message_templates`, `message_deliveries`, `credit_ledger`, `announcements`, `pta_slots`, `conversations`, `permission_slips`, `permission_responses`
- **Operations:** `attendance_records`, `staff_attendance`, `behaviour_records`, `sickbay_visits`, `pickup_codes`, `pickup_logs`, `homework`, `lesson_notes`, `absence_reports`, `staff_leave_requests`, `early_warning_flags`
- **Admissions:** `applicants`, `applications`, `entrance_exams`, `offers`
- **Billing:** `plans`, `subscriptions`, `subscription_invoices`, `usage_snapshots`, `agents`, `referrals`, `platform_fee_ledgers`, `platform_fee_entries`, `payment_mandates`, `tax_rates`
- **Imports:** `import_batches`, `import_rows`, `import_mappings`

Use:

- UUID primary keys, foreign keys, unique constraints and indexes led by `tenant_id`.
- `created_at`, `updated_at`, `created_by` on every table.
- Transactions for every multi-row money or results operation.
- Append-only tables for payments, allocations, audit events, credit ledgers and result snapshots.
- Every create, update and delete on tenant data is audit-logged with actor, tenant, the fields changed, and before and after values, **except sensitive fields** (health data, national IDs, bank details, restricted notes, custody restrictions): for those, log only that the field changed, never the value. Audit entries identify people by internal ID, not by name, so when the law requires someone's personal data to be deleted, their live records can be deleted or pseudonymised without editing the audit log or breaking its hash chain (section 28.3). Document this deletion procedure in the DPIA.
- Soft deletion only where justified (students, staff), never for money.
- Encrypted columns for staff bank details and any national identifiers (NIN, LIN).
- A documented data retention policy per table.

Also add `tenant_domains` (section 7.1) and `devices` for push tokens (section 5.1) to the platform tables. Provide complete migrations, RLS policies for every tenant table, and seed scripts for presets (NERDC subjects and subject limits, grading schemes, traits, tax tables, statutory deadlines) and a demo school.

