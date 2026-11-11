// withTenant(tx, tenantId) will go here: it sets app.tenant_id with set_config(..., true) inside a transaction.
// Every database access goes through it; never use a plain SET (brief section 7).
export {}
