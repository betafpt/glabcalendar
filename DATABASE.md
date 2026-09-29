# G.Lab Calendar — Database Design

## Database

PostgreSQL is the target database.

Use UUID primary keys and `created_at` / `updated_at` timestamps on mutable business tables.

## Core entities

### organizations

Provides the tenancy boundary needed for future teams.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text | |
| timezone | text | IANA timezone, e.g. `Asia/Ho_Chi_Minh` |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### projects

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| organization_id | uuid FK | required |
| name | text | required |
| client_name | text nullable | |
| status | enum/text | planned, active, completed, archived |
| starts_on | date nullable | |
| ends_on | date nullable | |
| notes | text nullable | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### shoots

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| organization_id | uuid FK | required |
| project_id | uuid FK nullable | |
| title | text | required |
| status | enum/text | planned, confirmed, in_progress, completed, cancelled |
| starts_at | timestamptz | required |
| ends_at | timestamptz | required; must be > starts_at |
| call_time | timestamptz nullable | |
| location_name | text nullable | |
| location_address | text nullable | |
| notes | text nullable | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Indexes:
- `(organization_id, starts_at)`
- `(organization_id, project_id)`

### crew_members

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| organization_id | uuid FK | required |
| name | text | required |
| default_role | text nullable | e.g. DOP, photographer, AC, gaffer |
| phone | text nullable | |
| email | text nullable | |
| status | enum/text | active, inactive |
| notes | text nullable | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### shoot_crew_assignments

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| organization_id | uuid FK | required |
| shoot_id | uuid FK | required |
| crew_member_id | uuid FK | required |
| role | text nullable | role for this shoot |
| notes | text nullable | |
| created_at | timestamptz | |

Constraints/indexes:
- unique `(shoot_id, crew_member_id)`
- index `(organization_id, crew_member_id)`

Crew conflict query joins the assigned shoots and checks interval overlap against the target shoot.

### equipment_items

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| organization_id | uuid FK | required |
| name | text | required |
| category | text nullable | camera, lens, lighting, audio, grip, etc. |
| asset_code | text nullable | unique within organization when present |
| serial_number | text nullable | |
| status | enum/text | available, maintenance, retired |
| notes | text nullable | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### equipment_bookings

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| organization_id | uuid FK | required |
| shoot_id | uuid FK | required |
| equipment_item_id | uuid FK | required |
| quantity | integer | default 1; v1 treats each inventory row as a bookable item |
| notes | text nullable | |
| created_at | timestamptz | |

Constraints/indexes:
- unique `(shoot_id, equipment_item_id)`
- index `(organization_id, equipment_item_id)`

Equipment conflict query joins bookings to shoots and checks the same interval-overlap rule.

### shoot_checklist_items

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| organization_id | uuid FK | required |
| shoot_id | uuid FK | required |
| title | text | required |
| is_completed | boolean | default false |
| sort_order | integer | default 0 |
| assigned_crew_member_id | uuid FK nullable | optional |
| completed_at | timestamptz nullable | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Index: `(shoot_id, sort_order)`.

## Future tables

### users / organization_memberships
Authentication and roles when multi-user support is introduced.

### calendar_connections
Provider, external account ID, encrypted credentials/token reference, sync cursor, status.

### external_calendar_events
Maps a shoot to a provider event ID without contaminating the core shoot schema.

### outbox_events
Durable events for future notification and integration workers.

### notification_preferences / notification_deliveries
User/team delivery configuration and audit trail.

## Conflict detection query semantics

For a target interval `[target_start, target_end)` a conflict exists when another active shoot satisfies:

```sql
other.starts_at < target_end
AND target_start < other.ends_at
```

Cancelled shoots are excluded.

When editing an existing shoot, exclude the current shoot ID from its own conflict query.

## Transaction rules

- Assignment/booking conflict check and insert should execute inside one transaction.
- A later hardening step may use PostgreSQL advisory locks or exclusion constraints if concurrent writes become a real operational concern.
- Deleting a shoot should cascade its assignments, bookings, and checklist items.
- Deleting crew/equipment should be restricted or soft-disabled when historical records depend on them.
