# Functional Specification: Home CMMS (MaintEnhance)

_Rebrand note (v1.8): this app was previously called HomeKeep — it's referred to as MaintEnhance ("ME") throughout the rest of this document from v1.8 onward._

**Date:** September 26, 2026
**Status:** Draft

_Versioning note: this document is no longer given its own version number — it's tracked by Git history in the project repo. See `CHANGELOG.md` for the app's own release history (v0.1–v0.8 pre-release, v1 onward official)._

---

## 1. Purpose and Scope

This document defines the functional requirements for a Computerized Maintenance Management System (CMMS) designed for residential/home use. Unlike commercial CMMS platforms built for industrial facilities or fleets, this system is scoped for a single household (or a small number of properties) managing maintenance on the home itself, appliances, vehicles, and other durable assets.

### 1.1 Goals
- Track every maintainable asset in the home and its maintenance history
- Automate reminders for preventive maintenance based on time or usage intervals
- Reduce unplanned breakdowns by surfacing overdue tasks
- Maintain a searchable record of repairs, warranties, manuals, parts, and service providers
- Support multiple household members, with different permission levels, all sharing one view of the household

### 1.2 Out of Scope
- Multi-tenant property management (landlords managing multiple rented units) — may be a future extension
- Integration with commercial building management systems
- IoT sensor-based condition monitoring (may be a future phase)

---

## 2. Users and Roles

| Role | Description | Permissions |
|---|---|---|
| **Owner** | Primary household member(s) who set up the system | Full access everywhere, including Owner Tools (account management, backups, record deletion). Can delete any record. |
| **Manager** | A trusted household member given elevated rights short of full ownership | Same rights as Owner everywhere *except*: no access to the Owner Tools page, can only delete records they personally created (an Owner can still delete anything a Manager created), and — on the Alarms tab (3.14) — can manage sensor mappings but cannot view or regenerate the webhook API key. |
| **Executor** | The household member(s) who actually do the work (residents, family members) | View everything; submit and edit their own work requests while pending; create new work orders. On an existing work order, can only change its status (except Closed) and add comments — every other field is read-only. Cannot verify a work order, delete records, manage accounts, or review/convert requests. |
| **Guest** | Read-only access for anyone who shouldn't make changes | Can view every page but cannot create, edit, delete, or submit anything. |

Notes:
- "Household Member" was the working name for this role in earlier drafts; it is now called **Executor** to better describe what the role does.
- Role changes and account creation/removal are performed by an Owner from the Owner Tools page (see 3.16).
- Authentication is username/password based, scoped to a single household per deployment. Passwords must be at least 8 characters.
- **Password management (v2.2):** any signed-in user can change their own password (current password, new password twice, must differ from the current one) and their own email address from the account (key) menu. An Owner can set a **temporary password** for any member (typed, or generated and shown once; the Owner can never see an existing password). Accounts created by an Owner, and any account whose password an Owner resets, are flagged **must change password**: that user can do nothing but change the password or sign out until they do, enforced by the server as well as the screen. Changing or resetting a password signs that account out of its other sessions. Sign-in is throttled after repeated failures.
- **Forgotten password by email (v2.2):** when the deployment has SMTP and `APP_URL` configured, the sign-in screen offers "Forgot password?". The user enters a username or email and, if an account with an email exists, a single-use link valid for about one hour is sent to it (the response is the same either way, requests are rate limited, only a hash of the token is stored). The member's notification email doubles as the reset address and must be unique. Without SMTP the link is hidden and the Owner issues temporary passwords instead.

---

## 3. Functional Requirements

### 3.1 Location Hierarchy
- Each household defines a hierarchical location tree representing its physical structure, e.g., **Property → Structure → Floor → Room → Area → Sub-area**
- Depth and naming are customizable — a household isn't locked into 6 levels or fixed labels (e.g., a household with a main house, detached garage, and shed can model each as a separate top-level structure)
- When adding a new location node, the level field defaults based on where in the tree it's being added — a new top-level node defaults to **Property**; a child of a Property defaults to **Structure**; then **Floor**, **Room**, **Area**, and **Sub-area** for each level deeper (staying at Sub-area beyond that). The default can always be overridden.
- Each location node has: name, level/type, parent node
- A **Property**-level node additionally carries an optional address, year built, and climate zone, used by the PM setup wizard (below)
- **PM setup wizard:** available on any Property-level node (an Owner/Manager action), re-runnable at any time. Step one collects the address and year built and guesses a climate zone from the address — a simple built-in state/province lookup table, not a live climate/weather service, and always shown for the household to confirm or change before continuing. Step two offers a curated starter list of common recurring household maintenance (HVAC filter, gutters, water heater, smoke detectors, furnace/AC service, sump pump, winterizing, roof inspection, pest inspection, and similar), pre-checked based on the confirmed climate zone so, for example, a cold-climate household sees furnace service and spigot winterizing checked by default while a hot-humid one sees AC service and pest inspection instead. Finishing the wizard creates one ordinary PM Base (see 3.6.5) per checked item, linked to that Property location — each is fully editable afterward like any other PM Base (trigger type, checklist template, frequency, etc.); the wizard itself has no further effect once it's created them.
- **One combined catalogue with Type and sub type (v2.3):** the starter catalogue is a single list of about 300 typical templates, each with a **Type** (Home, Facilities, and any others the Owner adds) and a **sub type** (its category, e.g. HVAC & Heating, Plumbing & Water, Landscape & Outdoor). In step two the wizard filters by Type (defaulting to Home), by sub type and by search text, with "Tick all shown" / "Untick all shown"; ticks are kept as the filters change. Entries not typical for the property's climate zone are greyed but can still be ticked. The large catalogue starts with nothing ticked (a small custom catalogue of 30 entries or fewer keeps the earlier behaviour of pre-ticking zone matches). Frequencies are typical starting points, not real schedules. Existing deployments that already customised their catalogue keep it unchanged; entries without a Type count as Home. Type and sub type are columns in the PM Wizard Catalog Excel sheet and in the Owner Tools editor, which also filters by both.
- **Starter catalogue is editable (v1.8):** the list the wizard offers in step two isn't fixed — an Owner can add, edit, or remove entries from Owner Tools (3.16), each with a title, description, frequency, and which climate zone(s) it's relevant to (or "all"). This lets a household — or a deployment built for a different kind of property — replace the built-in default list with its own, without a code change. Every entry created through the wizard is still a Calendar/Non-fixed PM Base; meter- and seasonal-triggered PM are set up by hand afterward, same as today.
- Every asset (3.2) is assigned to exactly one location node
- Every work request (3.5) and work order (3.6) must have an associated hierarchy location — inherited automatically when linked to an asset, or selected directly when not (e.g., general work like "repaint hallway")
- The hierarchy is presented throughout the app as an expandable/collapsible tree, with **Expand all** / **Collapse all** controls — both on the Locations management page itself and on the reusable filter tree used to narrow the Assets, Work Requests, Work Orders, and Schedule pages
- On the Locations page, each row shows an icon matching its level (a map-pin for Property, and a distinct icon for each level below it — Structure, Floor, Room, Area, Sub-area), making the hierarchy scannable at a glance
- Nodes can be renamed or moved; a node with children or assets still attached cannot be deleted until those are moved or removed first

### 3.2 Asset Registry
- **Fill in from a link (v2.3):** the add/edit asset form has a link bar; pasting a product page fills the name, manufacturer, model and notes (from the page description) and the manual link — see 3.16 for how the feature works and is controlled
- Add, edit, and archive assets (e.g., furnace, water heater, refrigerator, car, lawn mower, HVAC filter, smoke detectors, gutters, pool, sprinkler system)
- Each asset record includes:
  - Name, category/type, hierarchy location (required — see 3.1)
  - Manufacturer, model number, serial number
  - Purchase date, warranty end date
  - An optional **manual link** — a URL to the manufacturer's manual or product page, shown as a clickable link on the asset's detail view
  - An **"is this a major asset?"** flag — marks the asset as significant enough to warrant a physical QR label (see below)
  - An optional **meter unit and current reading** (e.g. "247 hours," "58,300 miles") — logged from the asset's detail page and, when set, available as the trigger for a meter-based PM Base (see 3.6.5)
  - Notes/free text field
- Support hierarchical assets for grouping related standalone units (e.g., "HVAC System" as parent of "Furnace," "Condenser," "Thermostat," each its own full asset record) — independent from, but each linked to, the location hierarchy
- Each asset can also serve as the root of a detailed Bill of Materials breaking it down into its physical components and parts (see 3.3)
- Search and filter by category, location (hierarchy filter, expand/collapse-able), or warranty status
- Assets, Work Requests, and Work Orders all share the same location-hierarchy filter component
- The dashboard's warranty panel surfaces assets whose warranty ends within the next 90 days
- **QR labels:** any asset flagged as major gets a "QR label" action on its detail view, generating a printable label containing a QR code. Scanning it (or otherwise opening the link it encodes) jumps straight to that asset's detail view, deep-linking past the normal tab navigation, and surfaces a one-tap "New work order" action pre-filled with that asset. The same "New work order" quick action is also available directly on every asset's detail view, regardless of whether it has a QR label

### 3.3 Bill of Materials (BOM) / Equipment Hierarchy
- Any asset can serve as the root of a Bill of Materials: a multi-level breakdown of the equipment into its constituent components, sub-components, and parts
- Example: **Furnace** (Asset) → **Burner Assembly** (Component) → **Blower**, **Ignitor**, **Control System** (Sub-components) → **Thermocouple**, **Motor**, **Fan Cage** (Parts, nested under the relevant sub-component)
- Each BOM node includes: name, node level (Component, Sub-component, or Part), manufacturer, model/part number, install date, unit cost, and notes
- Every BOM node inherits the hierarchy location (3.1) of its root asset — it is not independently relocated; moving the asset moves its entire BOM tree
- Work requests (3.5) and work orders (3.6) can optionally reference a specific BOM node instead of just the top-level asset, enabling precise tracking (e.g., logging that the ignitor failed rather than just "something's wrong with the furnace")
- Parts in the Parts Catalogue (3.9) can link directly to the BOM node(s) they belong to, keeping reorder tracking and work-order part attachment tied to the exact component
- BOM trees are browsable as an expandable tree view per asset
- Owners, Managers, and Executors can all edit BOM details (Guests cannot)

### 3.4 Preventive Maintenance (PM) Scheduling
Two mechanisms exist for recurring maintenance, at different levels of structure:

**3.4.1 Lightweight PM Tasks** — simple recurring reminders attached to an asset or BOM node (title, frequency, next-due date, estimated cost, notes), shown on the asset's detail page. These do not generate work orders automatically; they're a lightweight to-do reminder for simpler recurring items.

**3.4.2 PM Base (recurring work orders)** — see 3.6.5. This is the primary mechanism for recurring maintenance that should produce trackable, numbered work orders each time it runs.

### 3.5 Work Requests
- Any user with write access (Owner, Manager, or Executor — not Guest) can submit a work request to flag an issue or ask for something to be looked at, without needing to create a full work order themselves
- Work request fields:
  - Title and description of the issue
  - Related asset and, optionally, a specific BOM node (see 3.3); a request may also map to no asset at all (e.g., "squeaky step in hallway")
  - **Hierarchy location (required)** — inherited automatically if an asset is linked, or selected directly from the household's location hierarchy (see 3.1)
  - **Required-by date (required)** — when the requester needs this addressed by
  - Priority: **High**, **Medium**, or **Low**
  - **Suggested work order type** — the submitter's guess at what kind of work order this should become (PM, PM Base, Benchmark, or Corrective — not Unplanned; see 3.6.2), offered to the reviewer as a starting point during conversion
  - **Suggested parts** — parts from the Parts Catalogue (3.9) the submitter believes will be needed, picked with the same location/BOM-scoped part search used on work orders (3.6.6); carried over automatically if the request is converted
  - **Photos (optional, up to 5)** — attached from the device's camera or photo library at submission time; carried over automatically if the request is converted into a work order. Stored on the server as files referenced by id, not embedded in the household data
  - Requested-by (auto-filled) and date submitted
- **Offline submission (v1.6):** submitting a work request works without a connection. If the device is offline — or the submission fails partway through (e.g. a dropped upload) — the request, including its photos, is saved on the device instead of being lost, and a pending-sync count appears in the top bar. It's submitted for real automatically the next time the device is online (detected immediately when possible, checked periodically as a fallback, or triggered manually with a "Sync now" action); a request that fails to sync stays queued and flagged rather than being silently dropped. This applies to Work Requests specifically — the reporting entry point already open to every write-access role — not to direct Work Order creation, which remains an Owner/Manager planning action typically done with a connection.
- Work request lifecycle: **Submitted → Under Review → Approved (converted to Work Order) / Declined / Merged (duplicate)**
- Requests land in a review queue visible to Owners and Managers
- The submitter (or an Owner/Manager) can **edit** a request's fields while it is still Submitted or Under Review; once it's Approved, Declined, or Merged it becomes a locked historical record
- Owners and Managers review each request and can:
  - **Convert to Work Order:** carries over all request details (description, asset, BOM node, location, priority, required-by date, suggested parts) into a new work order, using the reviewer's chosen type — **PM, PM Base, Benchmark, or Corrective**. A work request can never be converted into an **Unplanned** work order, since unplanned work by definition bypasses the review step. Converting to PM Base collects the same frequency/fixed-date details as creating one directly (see 3.6.5).
  - **Decline:** with a required reason/comment, visible to the submitter
  - **Merge:** link the request to an existing open work order instead of creating a new one
  - **Request more info:** send the request back to the submitter with a comment, without declining it
- Owners and Managers can delete any work request; a Manager's delete rights are additionally limited to requests they created themselves once an Owner exists to grant broader rights (see 2). Deletion is available both directly from the request and via search-by-number on the Owner Tools page (3.16)
- Executors see and can act on their own submitted requests; Owners and Managers see and can act on all of them
- The Work Requests page supports search by title or number, and filters for location (hierarchy), priority, and review status (all / awaiting review)
- Full history of requests retained, including declined/merged ones, for reference

### 3.6 Work Orders / Task Execution

#### 3.6.1 Creation Paths
Every work order, regardless of type, can be created in either of two ways:
- **Directly (ad hoc):** any user with write access creates the work order from scratch (or the system generates it automatically, for PM instances spawned from a PM Base)
- **Via conversion:** an Owner or Manager converts an approved work request (see 3.5) into a work order

The one exception is the **Unplanned** type, which can only be created directly and can never originate from a converted work request.

#### 3.6.2 Work Order Types
Every work order must be classified with exactly one type:

| Type | Description | Can originate from a converted Work Request? |
|---|---|---|
| **PM** | A single occurrence of preventive maintenance, generated automatically from a PM Base (3.6.5), or created ad hoc | Yes |
| **PM Base** | A template for recurring PM work — never itself scheduled or completed; generates PM occurrences (see 3.6.5) | Yes |
| **Benchmark** | Repeat work that doesn't follow a fixed time/usage frequency. Instead of scheduling, the work order is copied from a saved benchmark the next time similar work comes up, and the benchmark itself can be refined afterward to improve the next iteration | Yes |
| **Corrective** | Work identified in advance (e.g., during an inspection or from an asset showing wear) that is then planned and scheduled for a future date, without being urgent enough to require immediate action. When created directly, can optionally start from an existing Benchmark's checklist. | Yes |
| **Unplanned** | Reactive work done on short notice or ad hoc, with no advance planning (e.g., a burst pipe) | No — always created directly |

**Corrective** and **Unplanned** work orders additionally offer an optional **Failure code** (a fixed list: Wear, Leak, Electrical, Mechanical, User Error, Install Defect, Unknown, Other) and a free-text **Root cause** field, so recurring problems can be tracked and analyzed across an asset's history.

#### 3.6.3 Benchmark Work Orders
- A **Benchmark** is a saved, reusable checklist/template for a specific recurring-but-not-scheduled job (e.g., "Repaint a bedroom," "Reseal the deck")
- When creating a **Corrective** work order, the user may optionally copy from an existing benchmark to pre-fill the checklist, estimated time/cost, notes, and vendor
- After the work is completed, the user can update the source benchmark (adjust the checklist, notes, cost/time, preferred vendor, lessons learned) so the next copy starts from an improved version, or save a completed Benchmark/Corrective work order as a brand-new benchmark for future reuse
- Benchmark library is browsable/searchable independent of any specific work order instance, and retains a version count

#### 3.6.4 General Work Order Behavior
- Work order lifecycle: **Active → Scheduled → Completed → Closed** (renamed in v2.2 from Open / In Progress / Completed / Verified; stored data is migrated once at first start: an Open work order with a scheduled date becomes Scheduled, any other Open becomes Active, In Progress becomes Scheduled, Closed becomes Closed). A work order becomes **Scheduled** automatically when a scheduled date is set on an Active one, and returns to **Active** if that date is cleared; PM-generated work orders do not move on their own — only setting the scheduled date does, never the required-by date. Moving a work order from Scheduled to Completed requires a comment
- Every work order (other than PM Base) has: type, status, priority (High/Medium/Low), an optional **Executor** assignment (see 3.6.7), scheduled date, a **required-by date (mandatory on every work order type except PM Base, backfilled to the upgrade date for older records; Corrective and Unplanned have no default)**, cost, linked vendor, attached parts (3.6.6), notes/checklist, completion comments (below), and an optional link back to the originating work request
- Every work order must have an associated hierarchy location (see 3.1) — inherited automatically from a linked asset, or selected directly if no asset is linked
- Optional link to a specific BOM node (component/sub-component/part), in addition to the asset, for precise diagnosis and history
- Every work order and work request is assigned a permanent, sequential, human-readable number (e.g., `WO-0041`, `WR-0017`) at creation, shown wherever that record appears in the UI
- **Field editing is Owner/Manager only.** Opening a work order — including a PM Base — as an Owner or Manager allows full editing of every field. An Executor opening the same work order gets a read-only view of its details and can only change its status (Active → Scheduled → Completed; Closed is Owner/Manager only, see below) and add completion comments (below); they cannot edit dates, cost, vendor, priority, executor assignment, attached parts, or notes. **Exception:** a PM occurrence's checklist (see 3.6.5) is fillable by an Executor like a comment, not locked like the rest of the record.
- **Moving a work order to Closed is restricted to Owners and Managers.** Executors can move a work order through Active, Scheduled, and Completed, but the final closing step requires Owner/Manager sign-off.
- **Bulk auto-schedule (v2.2):** each work order card on the list has a checkbox, the column header has a select-all, and an **Auto schedule** button sets every selected Active work order's scheduled date to its required-by date (which then moves it to Scheduled). Work orders that are not Active or have no required-by date are skipped and reported.
- **Completion comments:** once a work order reaches Completed (or later Closed), anyone with write access — including an Executor who otherwise can't edit the work order — can leave dated, attributed comments on it: feedback on how the work went, or notes for next time. Comments accumulate as a simple log and are never edited or deleted.
- **Parts consumption:** the first time a work order is marked Completed, the quantity of each attached part is deducted from that part's on-hand quantity in the Parts Catalogue (floored at zero — inventory never goes negative). This happens once per work order, regardless of later status changes.
- **Closed work order archive:** the Closed column on the work order board only shows work orders closed within the last 30 days; older ones roll off into an archive, reachable via an archive icon beside the Closed column header. The archive is searchable by title/number and filterable by location and work order type.
- Owners can delete any work order (directly from its detail view, or by searching its number on the Owner Tools page); Managers can delete work orders they created; Executors and Guests cannot delete
- Every editable popup — work order, work request, asset, location, vendor, and part — offers both **Save** (stays open) and **Save & Close** (saves and exits) once there's something to save
- The Work Orders page supports search by title or number (on its own row so it never crowds the filter controls), and filters for work order type, priority, location (hierarchy), due-date status (all / overdue / due within 30 days), and **executor** — the executor filter defaults to "all executors" for Owners, Managers, and Guests, and defaults to the logged-in user for an Executor, so anyone can quickly see just their own assigned work
- Full history retained per asset (and, where linked, per BOM node), permanently searchable

#### 3.6.5 PM Base — Recurring Work Order Templates
A **PM Base** is a template work order that is never itself scheduled or completed — it exists to spawn numbered **PM** work order occurrences on a schedule. It can be created directly or by converting a work request. Like any work order, its own fields (description, priority, default vendor/executor, and its frequency or fixed-date configuration) are editable by Owners and Managers at any time from its detail view — changes only affect occurrences generated afterward, not ones already spawned.

- **Only one occurrence per PM Base can be Active or Scheduled at a time.** A new PM is never generated — whether at PM Base creation or after completing the previous occurrence — while another occurrence from the same base is still active. If a Fixed-mode base has multiple configured dates, only the earliest upcoming one is generated initially; the rest follow only once the active occurrence is completed.
- At creation, a PM Base is set to one of three **trigger types**:
  - **Calendar** (the original mechanism): one of two modes —
    - **Non-fixed:** repeats on a frequency (e.g., every 3 months, every 2 years). When the PM Base is created, the first PM occurrence is generated immediately, with its required-by date set to the creation date plus the frequency. When a PM generated from a non-fixed base is marked **Completed**, the next occurrence is generated automatically (subject to the one-active-occurrence rule above), with its required-by date set to *that completion date* plus the frequency — the schedule rolls forward from whenever the work actually gets done.
    - **Fixed:** runs on one or more specific calendar dates every year (e.g., "every May 1" or "May 1 and October 1" for seasonal HVAC service), regardless of when the previous occurrence was completed. At creation, the next upcoming occurrence of the earliest configured date is generated immediately. When a fixed-schedule PM is completed, the next occurrence for that same date is generated exactly one year after its own required-by date — not based on the completion date — so the schedule stays anchored to the calendar.
  - **Meter** (usage-based): tied to a linked asset's meter reading (see 3.2) rather than the calendar — e.g., "service every 250 hours" or "rotate every 5,000 miles." The PM Base stores an interval and a baseline reading; no occurrence is generated at creation. Each time the linked asset's reading is logged, every meter-based PM Base is checked, and the next occurrence is generated automatically the moment the reading reaches baseline + interval, with its required-by date set to that day (meter PM is due immediately once triggered, not scheduled ahead). Completing the occurrence rolls the baseline forward to the reading it was triggered at, so the next interval starts from there — mirroring how Non-fixed calendar PM rolls forward from the actual completion date.
  - **Seasonal:** runs every year around the start of a chosen season (Spring/Summer/Fall/Winter, using Northern Hemisphere meteorological boundaries — Mar 1 / Jun 1 / Sep 1 / Dec 1 — as a documented simplification), shiftable by a configurable day offset before or after that boundary. This suits maintenance that should happen "before heating season" or "around first frost" without pinning it to the same calendar date every year the way Fixed mode does. Behaves like Fixed mode otherwise: the next occurrence is generated immediately at creation and, on completion, exactly one year after the completed occurrence's own required-by date.
- **Standby (v2.2):** any PM Base, of any trigger type, can be put on standby so it stops generating new occurrences — manually, or by a yearly date range (e.g. active May 1, standby November 1, every year; windows that span New Year are supported). Occurrences that already exist are left alone, and when a base becomes active again nothing missed is backfilled: Calendar and Seasonal bases generate from today, and a Meter base resets its baseline to the current reading. Windows are evaluated when the app is opened or data changes. PM Base templates are exempt from the required-by date rule.
- A PM Base's detail view lists every PM occurrence it has generated, with quick links to each
- PM Base templates are shown in their own section on the Work Orders page, separate from the Active/Scheduled/Completed/Closed board
- Deleting a PM Base does not delete PM occurrences it already generated; they remain as independent historical records
- **Checklist template (optional):** independent of trigger type, a PM Base can carry an ordered checklist template — each step is a **Task** (check off), a **Numeric reading** (with an optional expected min/max and unit, auto-flagged in- or out-of-spec once a value is entered — an out-of-spec reading also raises an alarm on the Alarms page as of v1.8, see 3.14), a **Photo required** step (tracked as an acknowledgment checkbox — attaching the actual photo is a future consideration, see Section 8), or a **Pass/Fail** step. Steps can be reordered and are edited only at the template, by an Owner or Manager; every PM occurrence the base generates from then on gets its own fresh, independent copy of the template to fill in. **Filling in a PM occurrence's checklist is available to any user with write access, including an Executor** — unlike the rest of a work order's fields, which are read-only for an Executor — since it's meant to be completed while doing the work; each step saves as soon as it's checked off, entered, or marked. The filled-in checklist stays on the work order permanently once completed, turning a PM occurrence into a real inspection record rather than a single checkbox.

#### 3.6.6 Parts Attachment
- Any non-PM-Base work order (and, as a suggestion, any work request) can have one or more parts from the Parts Catalogue (3.9) attached, each with its own **quantity** (in case more than one is needed)
- The part picker supports:
  - Free-text search across part number, name, manufacturer, and manufacturer part number
  - A location filter (defaulting to the work order's own location) that narrows the search to parts linked to assets at that location or below
  - A BOM-component filter (options scoped to the currently selected location) that narrows further to parts linked to a specific component
  - A **New part** button to create a part on the spot if it isn't in the catalogue yet, without leaving the work order form
- Attached parts are listed with an editable quantity and a quick-remove control

#### 3.6.7 Executor Assignment
- A work order can be assigned to an **Executor**, chosen from a dropdown listing every user with the Owner, Manager, or Executor role (Guests are never assignable)
- Assignment is optional and can be changed at any time from the work order's detail view

### 3.7 Notifications
- In-app indicators: a badge on the Work Requests nav item shows the count awaiting review; dashboard stat cards surface overdue and soon-due work
- **Email digest (opt-in):** if the deployment has an SMTP server configured (server-level environment variables — off by default, nothing is sent and no error is raised if unset), each household member can set a personal notification email and choose which of three daily digests they want to receive, from a notification-settings control next to their entry on the Owner Tools members list:
  - Overdue work orders (any non-PM-Base order past its scheduled date and still Active or Scheduled; the scheduled date, or the required-by date if none, is used)
  - Warranties expiring soon (within a configurable window, default 30 days)
  - Work requests that have sat unreviewed too long (Submitted or Under Review past a configurable window, default 3 days)
- A member with no email set, or with all three toggles off, simply receives nothing — the feature requires no action from anyone who doesn't want it
- The digest runs once a day per deployment; it is a summary email, not a per-event push/SMS notification (still a future enhancement — see Section 8)

### 3.8 Vendors and Service Providers
- **Fill in from a link (v2.3):** the vendor form can fill the name, notes and website from a company web page (same mechanism as 3.2)
- Directory of contractors/service providers (plumber, HVAC tech, landscaper, etc.)
- Fields: name, specialty, contact info, an optional website link, and notes
- Link service providers to specific work orders and benchmarks for quick "who fixed this last time" lookup
- Searchable by name, specialty, or contact info
- A stored web link opens in a new window/tab via a dedicated link button, wherever it's shown
- Owners and Managers can add, edit, and remove vendors — the delete control is available both in the vendor list and inside the edit popup itself; a Manager's delete rights are limited to vendors they created

### 3.9 Parts Catalogue
- **Fill in from a link (v2.3):** the part form can fill name, description, manufacturer, manufacturer part number, cost and web link from a product page (same mechanism as 3.2)
- Every part or consumable the household keeps on hand — filters, batteries, fasteners, spare igniters, anything — gets its own record with a permanent, sequential part number (e.g., `PT-0012`)
- Each part record includes: part number (system-assigned), name, description, manufacturer, manufacturer part number, cost, an optional web/purchase link, linked asset and/or BOM node, quantity on hand, and a reorder threshold
- Parts below their reorder threshold are flagged in the catalogue
- Searchable by part number, name, or manufacturer
- Clicking a part card opens its full detail/edit view; quantity on hand can also be adjusted with quick +/- controls directly on the card
- A stored web link opens in a new window/tab via a dedicated link button, both on the card and inside the edit popup
- Parts are attached (with a quantity) to work orders and suggested on work requests via the shared part-search picker (3.6.6); when a work order carrying attached parts is completed, each part's on-hand quantity is reduced by the quantity used (see 3.6.4)
- Owners and Managers can add, edit, and remove parts — the delete control is available both in the catalogue and inside the edit popup itself; any writer (Owner, Manager, Executor) can adjust quantity on hand; a Manager's delete rights are limited to parts they created

### 3.10 Budget and Cost Tracking
- Log actual cost per work order
- Aggregate view: total spend, and spend broken down by asset category
- Computed automatically from logged work order costs — nothing to maintain separately

### 3.11 Purchasing
- A running shopping list, generated automatically rather than maintained by hand: any part attached (with a quantity) to an Active or Scheduled work order in a quantity greater than what's currently on hand in the Parts Catalogue appears here
- Shortages are grouped by the work order that needs them, each showing quantity needed, quantity on hand, and the shortfall to buy
- Clicking a work order group jumps to that work order's detail view
- **Manual additions (v2.2):** an Owner or Manager can add a part to the list by hand — picked from the Parts Catalogue or free-typed — with a quantity and note, and remove it again. Manual lines are stored in a separate purchase list shown beside the automatic shortages
- Visible only to Owners and Managers

### 3.12 Dashboard
- Stat cards: **Open work orders**, **Pending requests**, **Overdue work orders**, **Due within 30 days** — each clickable, jumping to the Work Orders or Work Requests page pre-filtered to match (e.g., clicking "Overdue work orders" opens Work Orders filtered to overdue)
- **Upcoming Work Orders** panel: any work order (excluding PM Base templates) with a scheduled date or required-by date in the next 30 days
- **Work requests awaiting review** panel
- **Next 7 days** strip: a condensed, single-row, day-by-day look-ahead of scheduled work orders, separate from the full Schedule page
- **Warranty expiring soon** panel: assets with a warranty end date within 90 days
- Visible to every role; nothing on the dashboard is hidden by permission

### 3.13 Schedule
- Month-view calendar of work orders by scheduled date, color-coded by type
- Filterable by location hierarchy and by executor — the executor filter defaults to "all executors" for Owners, Managers, and Guests, and defaults to the logged-in user for an Executor
- Clicking an entry opens that work order's detail view

### 3.14 Alarms (Sensor, PM, and Manual Alarms)
_Named "Alarms" through v1.7, "Alarm Dashboard" in v1.8–v2.2 (when it grew beyond Home Assistant to also catch out-of-spec PM checklist readings and manually raised alarms), and "Alarms" again from v2.3._

- **Three ways an alarm gets raised:**
  1. **Home Assistant webhook (v1.7) — push, not poll.** Home Assistant already normalizes household sensors (water leak, smoke/CO, freezer/fridge temperature probes, sump pump runtime, well pump cycles, power monitoring, humidity, door/window contacts) into entities, and already has a mature automation engine for thresholds, debouncing, and duration conditions — MaintEnhance doesn't re-implement any of that. A Home Assistant automation fires a `rest_command` that POSTs to MaintEnhance's webhook only once a condition is actually met (e.g., "sump pump ran continuously for more than 2 minutes," "freezer above 10°F for 15 minutes," "water sensor reads wet")
  2. **PM checklist out-of-range reading (v1.8):** a numeric checklist step (3.6.5) on a PM work order carries an optional expected min/max. The moment a logged reading falls outside that range, an alarm is raised automatically — deduplicated per work order + checklist step, so re-entering the same out-of-spec value doesn't spam the dashboard with duplicates. Whoever is filling in the checklist (any role with write access, including an Executor) can trigger this; it isn't Owner/Manager-gated, since raising the alarm is a side effect of ordinary checklist work
  3. **Manual (v1.8):** anyone can raise an alarm directly from the dashboard's "Create alarm" action — title, details, severity, and an optional asset/location — for anything worth tracking that didn't come from a sensor or a checklist
- **Webhook:** `POST /api/alarms`, authenticated by a per-deployment API key (sent as an `X-Api-Key` header, or `Authorization: Bearer …`) rather than the cookie-based session auth used everywhere else in the app — Home Assistant has no browser to log into. The key is generated automatically on first use, shown (and regenerable) to Owners from the Alarms page, along with the exact webhook URL and a ready-to-paste `rest_command` example
- Accepted webhook payload fields: `entity_id`, `friendly_name`, `state`, `attributes` (free-form, kept for audit), `message`, `severity` (`info` / `warning` / `critical`, defaults to `warning`), `timestamp`. Only `entity_id` or `message` is required
- **Source-agnostic design:** each alarm records a `source` field — `home_assistant`, `pm_checklist`, or `manual` as of v1.8 — so another system could plug into the same queue later without a redesign
- **Entity mapping:** a small table, managed from the Alarms page, maps a Home Assistant entity id to a MaintEnhance asset and/or location. A payload whose `entity_id` matches a saved mapping arrives already linked; one with no match (or no `entity_id` at all — a `message`-only alarm) arrives unassigned and can still be acted on
- **Alarm queue — its own queue, upstream of Work Requests:** not every alert should become a work item, so alarms don't automatically create one. Each alarm stores its source, source entity id (if any), resolved asset/location (if mapped or provided), message, severity, status, and — for webhook alarms — the raw payload it arrived with (kept for auditing/debugging a flaky sensor)
- Alarm lifecycle: **Open → Acknowledged as false / Linked to Work Request / Linked to Work Order**
  - **Acknowledge as false alarm:** closes it with a required reason — useful later for spotting which physical sensor needs its Home-Assistant-side threshold retuned
  - **Create Work Request:** opens a pre-filled Work Request form (title, description, location, asset, priority guessed from severity) from the alarm; submitting it both creates the request and marks the alarm linked
  - **Link to existing Work Order:** ties the alarm on as supporting evidence against an already-open work order, without spawning a duplicate work item
- **Location filter and beacons (v2.3):** the page has the same expandable location tree used on Assets and Work Orders; choosing a location narrows the queue and history to alarms at that location or below. An alarm's location is its own, or its asset's location when it has none (alarms with neither show only under "All locations"). Beside each location that has an open alarm — and beside every parent level above it, all the way up — the tree shows a small **red flashing beacon** (steady when the device asks for reduced motion), so a problem deep in the tree is visible from the top. Beacons always reflect all open alarms regardless of the current filter.
- The Alarms page shows an **Open** queue (sorted by severity, then most recent) and a **History** view of everything acknowledged or linked, for the audit trail
- Alarms and the entity-mapping table are stored separately from the rest of the household record (their own database tables, not the shared `app_data` document) since they're written independently of the app's normal save cycle; as of v2.2 they are included in the Owner Tools Excel backup/restore (3.16)
- **Permissions split (v1.8):** viewing and managing alarms (the dashboard tab itself, acknowledging, linking, webhook key, entity mappings) stays Owner/Manager-only, same as v1.7. *Raising* an alarm — automatically from a checklist, or manually via "Create alarm" — is available to any signed-in user, since an Executor filling in a checklist needs to be able to trigger one
- **Componentized (v2):** the Home Assistant piece specifically — the inbound webhook, its API key, and the entity-mapping table — is an Owner-toggled feature (Owner Tools → Features, 3.16). With the toggle off the app 404s the webhook and its related endpoints (as if they don't exist) and hides the corresponding setup UI; nothing is deleted, so historical Home-Assistant-sourced alarms and saved mappings are unaffected and reappear if the component is turned back on. The PM-checklist-triggered and manual alarm paths are **not** part of this component — they're core Alarms page behavior and stay on regardless of the toggle

### 3.15 Multi-User Collaboration & Permissions
- Shared household view: all users see the same data, with UI controls shown or hidden based on role (2)
- **Unsaved-changes protection:** closing a work order, work request, asset, location, vendor, or part form (via the X button or clicking outside it) while it has unsaved changes prompts the user to **Save**, **Discard changes**, or **Cancel** and keep editing — no silent data loss
- **In-app help:** every page has an info icon beside its title that opens a short explanation of that page's purpose, typical workflow, who can do what, and its key features
- **Required-field convention:** required field labels are shown in bold red text with a trailing asterisk; all other fields are shown in plain, non-bold black text — there is no reliance on the word "optional"
- Full audit trail via each record's creator (`createdBy`), which also determines what a Manager is permitted to delete

### 3.16 Tools (formerly Owner Tools)
- **The Tools tab (v2.4)** is visible to Owners, Managers and Executors (not Guests) and shows cards by role: Executors see executor tools (My account; My hours when 3.17 is on); Managers see those plus manager tools (Executor colours, Shift templates, and the all-executor hours report); Owners see everything, including the Owner-only cards listed below. Everything described in the rest of 3.16 is **Owner only**.
- **Household members:** add or remove accounts, set each member's role (Owner, Manager, Executor, Guest) and notification email, and set a temporary password (3, Notes above)
- **Branding & Terminology (v2.2):** the Owner customises the app after deployment — there are no editions or per-deployment variants. Settings: name (required, 40 characters), short name (12), tagline (60), an optional **top-bar title** (40, blank by default and then not shown), a **logo** (Owner-only upload; PNG, JPG, SVG or WebP, up to 512 KB; the built-in wrench mark is used until one is uploaded and again after removal), four colours (light and dark primary and accent) with a contrast warning, six **location-level labels**, the **site level** (the level that carries address, year built, climate zone and the PM setup wizard) and the word used in place of "household". Labels are free text, required, trimmed, at most 15 characters and unique; they are display-only over stable stored keys (Property, Structure, Floor, Room, Area, Sub-area), so changing one updates every record's display instantly with no data change. Defaults: Property, Structure, Floor, Room, Area, Sub-area; site level = first. "Reset to defaults" restores everything. Settings are served by a public `GET /api/config` (applied before sign-in), and drive the page title, theme colour, `/manifest.json`, email wording and the Excel export. PWA icons remain the default set. Secrets (`JWT_SECRET`, SMTP) stay in the Docker environment.
- **Fill in from a link (v2.3):** an Owner toggle (default on) for link-based pre-population on asset, vendor and part forms, with a second toggle, **Use AI (Gemini)** (default off, available only when `GEMINI_API_KEY` is set in the Docker environment; the card shows "key detected: yes/no" but never the key). How it works: the user pastes a link and chooses **Fill from link**; the server fetches the page and extracts product or company details — JSON-LD product data, Open Graph and meta tags, the page title — and returns suggestions. With AI on, the link, the page's visible text (capped) and those hints are sent to Google's Gemini and its answer is used where it has one, falling back to the plain details if it fails. Only empty fields are filled (typed values are never overwritten); each filled field shows a faint **x** at its right edge that clears just that value. Guests can't use it; look-ups are rate limited (30 per 10 minutes per user). **Safety:** the server refuses localhost, private, loopback, link-local, carrier-grade-NAT, multicast and cloud-metadata addresses (checked on the address actually connected to, and again on every redirect), allows only http/https on ports 80/443, rejects links with credentials, follows at most 4 redirects, reads at most about 1.5 MB with an 8-second limit, and accepts only web-page content types. The key is read on the server only.
- **Features (v2.2):** an Owner toggle for the **Home Assistant alarm integration** (webhook, its API key and the entity-mapping table; default on). Enforced on every request without a restart: when off the routes answer `404` and the UI is hidden, and nothing is deleted. Manual and PM-checklist alarms are core and always on. It also shows whether emailed password reset is available (needs `SMTP_HOST` and `APP_URL`).
- **Backup & bulk edit:**
  - **Excel export:** one sheet per record type — locations, assets, BOM nodes, PM tasks, work requests, work orders (including comments, the parts-deducted flag and PM standby settings), benchmarks, vendors, parts, the manual purchase list, the PM Wizard catalogue — plus **Users** (username, role, email, notification toggles, must-change flag), **Alarms**, **Alarm Mappings**, **Alarm Settings**, **Settings** (branding, labels, feature toggles; the logo is split across rows to fit Excel's cell limit) and an **Attachments** index. Password hashes and the webhook key are excluded unless "Include login credentials" is ticked, which warns that the file is then sensitive. Not backed up: `JWT_SECRET`, SMTP settings, and browser-only items (theme, offline queue).
  - **Import by tab:** the file's tabs are listed with row counts; the Owner ticks the tabs to apply and, for each, chooses **Update and add** (default; match on id/number, keep rows not in the file) or **Replace tab** (explicit confirmation). A tab that is missing, or not ticked, is never touched. A blank `id` creates a record; keeping an id updates it. Excel import accepts old or new status names and either stored level keys or current labels.
  - **Pre-check:** the whole file is validated before anything changes — missing sheets/columns, duplicate ids/numbers, missing required fields (including the required-by date), values outside the allowed lists, bad dates and numbers, label limits, and broken references (location, asset, vendor, parent, cycles) judged against the resulting data. Errors are shown on screen and downloadable (sheet, row, column, problem) and **nothing is applied**; warnings are listed separately and need an explicit confirm. Users match by username, the importing Owner is never overwritten or locked out, and users restored without a password get a random one and must have a temporary password set by the Owner.
  - **Full backup (.zip):** the workbook, every attachment file and a manifest. Restoring it runs the same pre-check, then restores attachments.
  - **Automatic snapshots:** a consistent SQLite copy about once a day into `DATA_DIR/backups/`, keeping the newest N (`BACKUP_KEEP`, default 7; `BACKUP_SNAPSHOTS=false` disables), listed and downloadable by the Owner. Off-device backup of the data volume is left to the operator.
  - **Photos:** new photos are shrunk in the browser (about 1600 px long edge, JPEG about 80%, orientation kept, small photos untouched) before upload or queuing offline; an Owner action shrinks existing photos once, replacing a photo only when the result is smaller.
- **PM Wizard starter catalogue (v1.8):** add, edit, or remove the entries the PM setup wizard (3.1) offers on a site-level location — title, description, frequency, and which climate zone(s) it applies to (or "all"). "Reset to default" restores the built-in list. Editing it does not affect PM Bases already created.
- **Delete a work order / work request by number:** search tools to find and permanently delete a specific work order or work request by its number or title — in addition to the delete action on each record's own detail view

### 3.17 Execution-based scheduling, workforce scheduling and hourly assignment (v2.4)
Three Owner toggles under Tools → Features, all default off. With all three off nothing changes.

**Executor colours (Manager tools).** Each person has a colour (automatic by default, overridable and resettable) used wherever their name or card appears on the labour assignment and workforce schedule screens and in shift template previews. Stored in the household document (`executorColors`).

**A. Execution-based scheduling and time keeping.**
- The Schedule tab is renamed **Labour assignment**. Work orders (all types, including PM Base so that generated PM work inherits them) gain **Estimated hours per executor**, **Executors required** (default 1) and a multi-person **Executors** assignment (`executorIds`; `executorId` keeps the first for compatibility). Filters and the work order board treat any assigned executor as matching.
- **Views:** Month (as before, but each week sits in a box with a week-number header on the left; the box is a lighter shade of the background in dark mode and darker in light mode), **Week** (one board per executor with seven day columns, plus an Unassigned board) and **Day** (one column per executor plus Unassigned; sized to fit a standard monitor). Back/forward arrows, an up arrow (Day to Week to Month), Today, and a Month/Week/Day selector on every view. Clicking a day header opens that day; clicking the week-number header opens that week.
- **Filters** on every view: a multi-select executor filter and a location (hierarchy) filter. An Executor opens it filtered to themselves.
- **Side list (Owners and Managers):** open work orders sorted by due date (an Unscheduled only checkbox, default on). Drag a card onto a person in the Week or Day view to add that person and set the scheduled date to that day, or onto a calendar day in the Month view to set only the date. Dragging a card from one person to another moves it; each assigned card has a remove (x) control. Completed and Closed work orders are not moved.
- **Cards** show the number of executors required (person icon) and hours (clock icon). **Column headers** show that person's total scheduled hours for the day; week boards show the week total.
- **Under-staffed** (assigned executors fewer than required, for open work) is flagged by a dashed red outline and a Short label (an alert icon in the month view), with a tooltip.
- **Hours worked:** moving a work order to Completed asks for hours worked for each assigned executor (or the person completing it, if none are assigned); hours must be greater than 0. Each is stored as a time entry (`timeEntries`: executor, hours, date, recorded by). Time entries, estimates, crew size and assignments are shown on the work order and included in the Excel Work Orders sheet. Tools shows **My hours** (everyone) and **Hours worked, all executors** (Managers and Owners): last 7 days, last 30 days, all time, and recent entries.
- If workforce scheduling (B) is also on, a person appears on a day only if scheduled to work that day; a person who is not on shift but has work that day still appears, with a warning marker, so assigned work is never hidden.

**B. Workforce scheduling.**
- Adds the **Workforce schedule** tab: everyone can view and export it; Owners and Managers set it. Same Month, Week and Day views and filters (no work orders).
- **Shift templates** (Manager tools): named **daily** templates (start, duration of 8, 8.5, 10, 10.5 or 12 hours, and end; fill any two and the third is calculated, the older of the two earlier entries being the one recalculated) and **weekly** templates (the same for each of the seven days, each day off or working). Templates can also be created ad hoc from the schedule; the Workforce schedule's **Create new template** button opens the Tools tab at the templates card.
- **Scheduling:** name cards for the team sit above the schedule and stay available. Dragging a card onto a day (Month, Week or Day view) or onto a week-number header opens a popup offering saved daily templates (day) or weekly templates (week), or a one-time daily or weekly schedule (optionally saved as a template). The result replaces that person's shifts on the affected days. Shifts have a start and end (`workShifts`); an end at or before the start means the shift runs overnight and is always shown on the day it starts.
- **Day headers** show the first start and last end of the day; the text turns red, with a tooltip naming the unworked period(s), when any time between the first start and last end has nobody working.
- **PDF export:** the visible month, week or day is opened as a print-ready page (Print, then Save as PDF).

**C. Hourly labour assignments** (available only when A and B are both on). The Day view becomes a 30-minute grid per executor spanning the earliest shift start to the latest shift end; times outside a person's shift are shaded and cannot be used. Dragging a work order card to a time sets that executor's start time (`startTimes`); the card spans its estimated duration, overlapping cards sit side by side, and cards without a start time stay in a strip above the grid.

---

### 3.18 Help tab and information buttons (v2.4)
- **Help tab:** a menu item at the bottom of the left menu, visible to every signed-in role. It opens the training guide inside the app as a page with a linked table of contents (one link per subject and screen) and a switch between the Executor guide and the Manager & Owner guide (managers and owners open the latter by default). Each guide can be downloaded as a Word (.docx) file. The guides are bundled with the app as static files under `help/`.
- **Information buttons (i):** a small round button beside page titles, card headings and pop-up titles opens a short note covering the purpose of the area, how to use it, and who may use it. The note opens above any pop-up already on screen without closing it. Buttons cover every page, card, form and dialog, including the v2.4 scheduling features. Terminology follows the Owner's branding settings.

### 3.19 Touch support and split storage (v2.5)
- **Touch (tap to pick up, tap to place):** on touch screens, tapping a work order card (calendar or side list) or a person's name card picks it up. The card is highlighted and a banner shows what is held, with Open (work orders) and Cancel. Tapping a drop target places it: a calendar day, a person's day cell, a week-number box, or an hour slot in the hourly grid, with the same results and validation as a mouse drop. Tapping the held card again, Cancel, Escape or changing the view puts it down. Touch devices open a work order from the banner's Open button (a tap picks up instead). Mouse behaviour is unchanged.
- **Split storage:** `DATA_DIR` (default `/data`) holds the database and should be on fast local storage. `FILES_DIR` (default `/files` in the image; falls back to `DATA_DIR`) holds `attachments/`, `backups/` and `tmp/` and may be on slower storage. `ATTACH_DIR`, `BACKUP_DIR` and `TMP_DIR` override individual folders. `docker-compose.yml` mounts two volumes, selectable per host folder with `DATA_PATH` and `FILES_PATH`.

### 3.20 Password entry (v2.5.1)
- The first-run setup screen (shown when no accounts exist) asks for a username, a password (minimum 8 characters) and a **Confirm password**; the two must match before the Owner account is created.
- Every password box (setup, sign-in, emailed reset, forced password change, My account, Owner add-member) has an eye button that toggles between hidden and visible text. The state is per box and is not remembered.
- Form inputs are sized with border-box so they never exceed their container.

## 4. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | Dashboard and asset list load in under 2 seconds for a household with up to 500 assets |
| **Data retention** | Full history retained until explicitly deleted by a permitted user |
| **Security** | Password-hashed accounts, signed session cookies, role-based access control enforced in the UI |
| **Privacy** | Single-household scope per deployment; no data shared across households |
| **Backup** | Owner-initiated full data export/import via Excel at any time (3.16); infrastructure-level backup is a deployment concern, not an in-app one |
| **Platform support** | Modern web browsers; installable as a Progressive Web App on Android, Chrome desktop (with an in-app "Install app" prompt when the browser supports it), and other Chromium-based browsers |
| **Responsive layout** | Fully usable on phone-sized screens (~360px wide and up): the navigation collapses to an off-canvas drawer, multi-column layouts stack to one column, the month calendar keeps its 7-day grid at reduced scale, and touch targets meet a comfortable minimum size |
| **Appearance** | Light and dark themes; follows the device/browser's color-scheme preference automatically, with a manual override switch (auto/light/dark) in the top bar that's remembered per browser |

---

## 5. Data Model (High-Level)

- **Household** (1) → **Location Nodes** (many); Location Nodes self-reference for parent/child hierarchy
- **Household** (1) → **Users** (many); each User has a role of Owner, Manager, Executor, or Guest
- **Household** (1) → **Assets** (many); Assets may self-reference for parent/child asset hierarchy (separate from location hierarchy)
- **Location Node** (1) → **Assets** (many)
- **Asset** (1) → **BOM Nodes** (many, root of the tree); **BOM Node** self-references for parent/child (Component → Sub-component → Part)
- **BOM Node** inherits **Location Node** from its root Asset (not independently assigned)
- **Asset** (1) → **PM Task Templates** (many, lightweight reminders — 3.4.1); **BOM Node** (0 or 1) → **PM Task Templates** (many, for node-scoped tasks)
- **User** (1) → **Work Requests** (many, as submitter); **User** (1) → **Work Orders** (many, as creator, and separately as assigned Executor)
- **Work Request** (0 or 1) → **Work Order** (0 or 1, once approved/converted; never of type Unplanned)
- **Location Node** (1) → **Work Requests** (many); **Location Node** (1) → **Work Orders** (many)
- **Asset** (0 or 1) → **Work Requests** (many, optional link); **BOM Node** (0 or 1) → **Work Requests** (many, optional link, more specific than Asset)
- **BOM Node** (0 or 1) → **Work Orders** (many, optional link, more specific than Asset)
- **Work Order** (many) → **Work Order Type** (1 of: PM, PM Base, Benchmark, Corrective, Unplanned)
- **PM Base** (1) → **PM Work Orders** (many, generated occurrences, each carrying the required-by date and, for a Fixed base, which configured date it corresponds to)
- **Benchmark Template** (1) → **Work Order Instances** (many, copied from over time)
- **Work Order** (many) → **Vendor** (0 or 1); **Work Order** (many) ↔ **Part** (many, via attachment, each attachment carrying its own quantity); **Work Request** (many) ↔ **Part** (many, via suggestion, likewise with quantity)
- **Asset** (0 or 1) → **Parts** (many, optional link); **BOM Node** (0 or 1) → **Parts** (many, optional link, more specific than Asset)
- **Household** (1) → **Vendors** (many); **Household** (1) → **Parts** (many)
- Every Location, Asset, Vendor, Part, Benchmark, Work Request, and Work Order record stores the User who created it, used to scope Manager delete permissions (2)
- **Attachment** (v1.6) — a stored photo file (id, original filename, MIME type, size, uploader, upload timestamp), kept in its own table/directory rather than in the household JSON document. A **Work Request** (0 or many) → **Attachments**, and its **Work Order** (0 or many) → **Attachments** once converted (carried over by reference, not re-uploaded); the household document itself stores only attachment ids.
- **Alarm** (v1.7; sources expanded in v1.8) — source (`home_assistant` / `pm_checklist` / `manual`), source entity id, resolved asset/location (0 or 1 each), message, severity, status, resolution type/reference, raw payload (webhook alarms only), triggered/created/resolved timestamps. Kept in its own table, independent of the household document. **Alarm** (0 or 1) → **Work Request** or **Work Order** as its resolution reference, once acted on.
- **User** (v2.2) additionally stores an optional unique email, a must-change-password flag and a token version (bumped on password change to end other sessions); **Password Reset** — hashed single-use token, user, expiry. **Settings** (v2.2) — Owner branding/terminology/features and the logo, kept in a key/value table. **Purchase List** (v2.2) — manual lines (part or free text, quantity, note, who/when), in the household document.
- **Scheduling & labour (v2.4)** — **Work Order** additionally stores estimated hours per executor, executors required, `executorIds`, optional per-executor `startTimes` and `timeEntries`. The household document gains `executorColors` (user id to colour), `shiftTemplates` (daily or weekly) and `workShifts` (executor, date, start, end). The three toggles are Owner settings (3.17).
- **Alarm Entity Mapping** (v1.7) — entity id (key), asset id (0 or 1), location id (0 or 1), label. **Asset** (0 or 1) → **Alarm Entity Mappings** (many); **Location Node** (0 or 1) → **Alarm Entity Mappings** (many).
- **PM Wizard Catalogue Entry** (v1.8) — id, title, description, frequency value/unit, applicable climate zone(s) (or "all"). Stored in the household/`app_data` document (`pmWizardCatalog`); an absent field falls back to the built-in default list. Used only as input to the PM setup wizard (3.1) — has no relational link to anything it later creates.

---

## 6. Example User Flows

1. **Setup:** Owner creates household → builds out the location hierarchy (structures, floors, rooms) from the starter template → adds assets room by room, each assigned to a location node.
2. **Building out a BOM:** Owner opens the furnace asset and builds its Bill of Materials: a "Burner Assembly" component, "Blower," "Ignitor," and "Control System" sub-components underneath it, and "Thermocouple," "Motor," and "Fan Cage" parts nested under the relevant sub-components.
3. **Recurring PM via PM Base:** Owner creates a PM Base for "Replace furnace filter," Non-fixed mode, every 3 months → the first PM work order is generated immediately, required by 3 months out → an Executor completes it each quarter, and each time, the next occurrence is generated automatically, required by 3 months from that completion.
4. **Seasonal PM via PM Base:** Owner creates a PM Base for "Seasonal HVAC service," Fixed mode, dates May 1 and October 1 → two PM work orders are generated right away for the next upcoming May 1 and October 1 → completing the May 1 occurrence generates next year's May 1 occurrence, regardless of what day it was actually completed.
5. **Corrective work via work request, scoped to a BOM node:** The furnace's ignitor starts clicking without lighting → an Executor submits a work request, links it to the "Ignitor" sub-component, sets a required-by date two days out, marks it High priority, suggests "Corrective" as the type and adds the replacement ignitor as a suggested part → an Owner reviews the queue and converts it into a Corrective work order, with the ignitor link, required-by date, and suggested part all carried over → assigns an Executor and a vendor → work order completed, cost logged → the submitter is notified via the request's linked-work-order reference.
6. **Unplanned work, created directly:** A pipe bursts overnight → an Executor creates an Unplanned work order directly (no work request, since immediate action is needed), attaches the shutoff valve part used, and logs the repair once done.
7. **Benchmark work:** Owner completes a bedroom repaint as a Corrective work order and saves it as a new "Bedroom Repaint" benchmark → two years later, creating a new Corrective work order for a different bedroom starts from that benchmark's checklist.
8. **Manager's limited delete:** A Manager creates a vendor record by mistake and deletes it (their own record) — but cannot delete a work order created by someone else; only an Owner can.
9. **Guest access:** A house-sitter is given a Guest account — they can see the full schedule, open work orders, and asset details, but every Add/Edit/Delete/Submit control is absent from their view.
10. **Bulk update via Excel:** Owner exports the household to Excel, updates the cost field on forty parts and adds fifteen new ones as new rows with blank IDs, then re-imports — the existing parts update in place and the new ones are assigned part numbers automatically.
11. **Dashboard drill-down:** A household member clicks "Due within 30 days" on the dashboard → lands on the Work Orders page, already filtered to that same set.
12. **Purchasing:** Two open work orders each need a replacement ignitor, but only one is in stock → the Owner checks the Purchasing page and sees both work orders grouped there, each showing the shortfall, and buys accordingly.
13. **Parts consumption:** An Executor completes a work order that used two air filters → the Parts Catalogue's on-hand quantity for that filter drops by two automatically.
14. **Executor's own schedule:** An Executor opens the Schedule or Work Orders page — the executor filter is already set to their own name, showing just what's assigned to them; they can switch it to "All executors" to see everyone else's too.
15. **Executor updating a work order:** An Executor opens a work order assigned to them — the dates, cost, vendor, and parts are all read-only, but they move it from Scheduled to Completed and leave a comment noting the replacement part was slightly undersized. An Owner later opens the same work order, edits the notes for next time, and moves it to Closed.
16. **PM Base won't double up:** A furnace-filter PM Base (Non-fixed, every 3 months) has a PM occurrence sitting Scheduled. Its required-by date passes without being completed — no second occurrence is generated in the meantime, since one is already active; the next one is only created once the current occurrence is marked Completed.

---

## 7. UI/UX Conventions

- **Location hierarchy filter:** a single reusable, expandable/collapsible tree component (with Expand all/Collapse all) used identically on the Assets, Work Requests, Work Orders, and Schedule pages to filter to a location and everything below it
- **Executor filter:** used on the Work Orders and Schedule pages; defaults to "all executors" for Owners, Managers, and Guests, and to the signed-in user for an Executor
- **Work order filters:** location, executor, priority, work order type, and due-date status, each its own dropdown, laid out below the search box so nothing overlaps
- **Numbering:** work orders (`WO-####`), work requests (`WR-####`), and parts (`PT-####`) are numbered sequentially and shown wherever the record appears — cards, lists, detail titles, dashboard entries, and search results
- **Web links:** a stored link (on a vendor or a part) is opened via a dedicated "Open link" button in a new window/tab, rather than an inline hyperlink
- **Search:** the Work Orders, Work Requests, Vendors, and Parts Catalogue pages each have their own search box, kept on its own row above any filter dropdowns so the two never crowd each other
- **Required vs. optional fields:** required field labels are bold, red, and end with an asterisk; all other field labels are plain black text
- **Field-level permissions:** a work order (including a PM Base) opened by an Owner or Manager is fully editable; opened by an Executor, it's read-only aside from status changes and comments — the same popup, rendered differently by role, rather than a separate screen
- **Unsaved-changes protection:** applies to the Location, BOM node, Asset, Vendor, Part, Work Request, and Work Order forms — every one of them offers **Save** and **Save & Close** once there's something to save, in addition to the unsaved-changes prompt on close
- **Page-level help:** an info icon beside each page title opens a short Purpose / Workflow / Permissions / Features summary for that page

---

## 8. Future Considerations (Not in Initial Release)

- Per-event push/SMS notifications and configurable reminder lead times (a daily opt-in email digest shipped in v1.2 — see 3.7)
- Photo/document attachments on assets, BOM nodes, and work orders directly (work request photo attachments, carried over on conversion, shipped in v1.6 — see 3.5)
- Calendar export (ICS) / sync with external calendars
- Automatic mileage sync from a connected vehicle or odometer-tracking app
- Multi-property support for landlords or vacation homes
- Barcode/QR code scanning for parts (asset QR label generation shipped in v1.2 — see 3.2)
- ~~Componentization / feature-flag layer~~ — shipped in v2 as env flags, replaced in v2.2 by Owner-managed settings (see 3.16); "editions" no longer exist.
