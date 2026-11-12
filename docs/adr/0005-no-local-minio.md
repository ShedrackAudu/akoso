# 0005: No local MinIO; choose a replacement with the file-storage spec

- **Status:** Accepted (founder, 12/11/2026)
- **Brief:** section 2 (development environment: "Docker Compose running Postgres,
  Gotenberg and MinIO (local S3)")

## Context

Brief section 2 names MinIO as the local stand-in for Cloudflare R2. MinIO has since
stopped distributing its free community edition as images:

- Free community images stopped being published in October 2025.
- In September 2026 the `minio/minio` and `minio/mc` repositories were deleted from
  Docker Hub.
- `quay.io/minio/minio` now refuses anonymous pulls.

The repository's `docker-compose.yml` used `minio/minio:latest`, so it could no longer be
pinned (T10) or scanned. On a fresh computer, `docker compose up` failed outright.
Nothing in Akoso reads or writes object storage yet; the `ObjectStorage` interface in
`packages/providers/src/storage/` is still a placeholder.

## Decision

Remove MinIO from `docker-compose.yml` now. Choose the local S3-compatible service in the
file-storage spec, when code first needs one, and pin and scan it like every other image.
Production and staging are unchanged: Cloudflare R2.

## Alternatives considered

- **Replace it now with SeaweedFS** (Apache 2.0, mature). Rejected for now: it would add
  an image to pin, scan and update before anything uses it.
- **Replace it now with RustFS** (Apache 2.0, MinIO-like, younger). Rejected for the same
  reason, and it is less proven.
- **Mirror the last community image into our own registry.** Rejected: it would freeze
  on an unmaintained image that receives no security fixes.

## Consequences

- `docker compose up -d` starts Postgres, PgBouncer and Gotenberg only.
- The file-storage spec must choose and justify the local service, and keep the code
  S3-compatible so R2 and the local service behave the same.
- Brief section 2 still says MinIO. Only the founder edits the brief; until then this
  ADR overrides that line.
