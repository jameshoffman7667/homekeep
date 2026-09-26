# Functional Specification: Home CMMS (HomeKeep)

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
| **Manager** | A trusted household member given elevated rights short of full ownership | Same rights as Owner everywhere *except*: no access to the Owner Tools page, and can only delete records they personally created (an Owner can still delete anything a Manager created). |
| **Executor** | The household member(s) who actually do the work (residents, family members) | View everything; submit and edit their own work requests while pending; create new work orders. On an existing work order, can only change its status (except Verified) and add comments — every other field is read-only. Cannot verify a work order, delete records, manage accounts, or review/convert requests. |
| **Guest** | Read-only access for anyone who shouldn't make changes | Can view every page but cannot create, edit, delete, or submit anything. |

Notes:
- "Household Member" was the working name for this role in earlier drafts; it is now called **Executor** to better describe what the role does.
- Role changes and account creation/removal are performed by an Owner from the Owner Tools page (see 3.14).
- Authentication is username/password based, scoped to a single household per deployment.

---

## 3. Functional Requirements

### 3.1 Location Hierarchy
- Each household defines a hierarchical location tree representing its physical structure, e.g., **Property → Structure → Floor → Room → Area → Sub-area**
- Depth and naming are customizable — a household isn't locked into 6 levels or fixed labels (e.g., a household with a main house, detached garage, and shed can model each as a separate top-level structure)
- When adding a new location node, the level field defaults based on where in the tree it's being added — a new top-level node defaults to **Property**; a child of a Property defaults to **Structure**; then **Floor**, **Room**, **Area**, and **Sub-area** for each level deeper (staying at Sub-area beyond that). The default can always be overridden.
- Each location node has: name, level/type, parent node
- Every asset (3.2) is assigned to exactly one location node
- Every work request (3.5) and work order (3.6) must have an associated hierarchy location — inherited automatically when linked to an asset, or selected directly when not (e.g., general work like "repaint hallway")
- The hierarchy is presented throughout the app as an expandable/collapsible tree, with **Expand all** / **Collapse all** controls — both on the Locations management page itself and on the reusable filter tree used to narrow the Assets, Work Requests, Work Orders, and Schedule pages
- On the Locations page, each row shows an icon matching its level (a map-pin for Property, and a distinct icon for each level below it — Structure, Floor, Room, Area, Sub-area), making the hierarchy scannable at a glance
- Nodes can be renamed or moved; a node with children or assets still attached cannot be deleted until those are moved or removed first

### 3.2 Asset Registry
- Add, edit, and archive assets (e.g., furnace, water heater, refrigerator, car, lawn mower, HVAC filter, smoke detectors, gutters, pool, sprinkler system)
- Each asset record includes:
  - Name, category/type, hierarchy location (required — see 3.1)
  - Manufacturer, model number, serial number
  - Purchase date, warranty end date
  - Notes/free text field
- Support hierarchical assets for grouping related standalone units (e.g., "HVAC System" as parent of "Furnace," "Condenser," "Thermostat," each its own full asset record) — independent from, but each linked to, the location hierarchy
- Each asset can also serve as the root of a detailed Bill of Materials breaking it down into its physical components and parts (see 3.3)
- Search and filter by category, location (hierarchy filter, expand/collapse-able), or warranty status
- Assets, Work Requests, and Work Orders all share the same location-hierarchy filter component

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
  - Requested-by (auto-filled) and date submitted
- Work request lifecycle: **Submitted → Under Review → Approved (converted to Work Order) / Declined / Merged (duplicate)**
- Requests land in a review queue visible to Owners and Managers
- The submitter (or an Owner/Manager) can **edit** a request's fields while it is still Submitted or Under Review; once it's Approved, Declined, or Merged it becomes a locked historical record
- Owners and Managers review each request and can:
  - **Convert to Work Order:** carries over all request details (description, asset, BOM node, location, priority, required-by date, suggested parts) into a new work order, using the reviewer's chosen type — **PM, PM Base, Benchmark, or Corrective**. A work request can never be converted into an **Unplanned** work order, since unplanned work by definition bypasses the review step. Converting to PM Base collects the same frequency/fixed-date details as creating one directly (see 3.6.5).
  - **Decline:** with a required reason/comment, visible to the submitter
  - **Merge:** link the request to an existing open work order instead of creating a new one
  - **Request more info:** send the request back to the submitter with a comment, without declining it
- Owners and Managers can delete any work request; a Manager's delete rights are additionally limited to requests they created themselves once an Owner exists to grant broader rights (see 2). Deletion is available both directly from the request and via search-by-number on the Owner Tools page (3.14)
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

#### 3.6.3 Benchmark Work Orders
- A **Benchmark** is a saved, reusable checklist/template for a specific recurring-but-not-scheduled job (e.g., "Repaint a bedroom," "Reseal the deck")
- When creating a **Corrective** work order, the user may optionally copy from an existing benchmark to pre-fill the checklist, estimated time/cost, notes, and vendor
- After the work is completed, the user can update the source benchmark (adjust the checklist, notes, cost/time, preferred vendor, lessons learned) so the next copy starts from an improved version, or save a completed Benchmark/Corrective work order as a brand-new benchmark for future reuse
- Benchmark library is browsable/searchable independent of any specific work order instance, and retains a version count

#### 3.6.4 General Work Order Behavior
- Work order lifecycle: **Open → In Progress → Completed → Verified**
- Every work order (other than PM Base) has: type, status, priority (High/Medium/Low), an optional **Executor** assignment (see 3.6.7), scheduled date, required-by date, cost, linked vendor, attached parts (3.6.6), notes/checklist, completion comments (below), and an optional link back to the originating work request
- Every work order must have an associated hierarchy location (see 3.1) — inherited automatically from a linked asset, or selected directly if no asset is linked
- Optional link to a specific BOM node (component/sub-component/part), in addition to the asset, for precise diagnosis and history
- Every work order and work request is assigned a permanent, sequential, human-readable number (e.g., `WO-0041`, `WR-0017`) at creation, shown wherever that record appears in the UI
- **Field editing is Owner/Manager only.** Opening a work order — including a PM Base — as an Owner or Manager allows full editing of every field. An Executor opening the same work order gets a read-only view of its details and can only change its status (Open → In Progress → Completed; Verified is Owner/Manager only, see below) and add completion comments (below); they cannot edit dates, cost, vendor, priority, executor assignment, attached parts, or notes.
- **Moving a work order to Verified is restricted to Owners and Managers.** Executors can move a work order through Open, In Progress, and Completed, but the final verification step requires Owner/Manager sign-off.
- **Completion comments:** once a work order reaches Completed (or later Verified), anyone with write access — including an Executor who otherwise can't edit the work order — can leave dated, attributed comments on it: feedback on how the work went, or notes for next time. Comments accumulate as a simple log and are never edited or deleted.
- **Parts consumption:** the first time a work order is marked Completed, the quantity of each attached part is deducted from that part's on-hand quantity in the Parts Catalogue (floored at zero — inventory never goes negative). This happens once per work order, regardless of later status changes.
- **Verified work order archive:** the Verified column on the work order board only shows work orders verified within the last 30 days; older ones roll off into an archive, reachable via an archive icon beside the Verified column header. The archive is searchable by title/number and filterable by location and work order type.
- Owners can delete any work order (directly from its detail view, or by searching its number on the Owner Tools page); Managers can delete work orders they created; Executors and Guests cannot delete
- Every editable popup — work order, work request, asset, location, vendor, and part — offers both **Save** (stays open) and **Save & Close** (saves and exits) once there's something to save
- The Work Orders page supports search by title or number (on its own row so it never crowds the filter controls), and filters for work order type, priority, location (hierarchy), due-date status (all / overdue / due within 30 days), and **executor** — the executor filter defaults to "all executors" for Owners, Managers, and Guests, and defaults to the logged-in user for an Executor, so anyone can quickly see just their own assigned work
- Full history retained per asset (and, where linked, per BOM node), permanently searchable

#### 3.6.5 PM Base — Recurring Work Order Templates
A **PM Base** is a template work order that is never itself scheduled or completed — it exists to spawn numbered **PM** work order occurrences on a schedule. It can be created directly or by converting a work request. Like any work order, its own fields (description, priority, default vendor/executor, and its frequency or fixed-date configuration) are editable by Owners and Managers at any time from its detail view — changes only affect occurrences generated afterward, not ones already spawned.

- **Only one occurrence per PM Base can be Open or In Progress at a time.** A new PM is never generated — whether at PM Base creation or after completing the previous occurrence — while another occurrence from the same base is still active. If a Fixed-mode base has multiple configured dates, only the earliest upcoming one is generated initially; the rest follow only once the active occurrence is completed.
- At creation, a PM Base is set to one of two modes:
  - **Non-fixed:** repeats on a frequency (e.g., every 3 months, every 2 years). When the PM Base is created, the first PM occurrence is generated immediately, with its required-by date set to the creation date plus the frequency. When a PM generated from a non-fixed base is marked **Completed**, the next occurrence is generated automatically (subject to the one-active-occurrence rule above), with its required-by date set to *that completion date* plus the frequency — the schedule rolls forward from whenever the work actually gets done.
  - **Fixed:** runs on one or more specific calendar dates every year (e.g., "every May 1" or "May 1 and October 1" for seasonal HVAC service), regardless of when the previous occurrence was completed. At creation, the next upcoming occurrence of the earliest configured date is generated immediately. When a fixed-schedule PM is completed, the next occurrence for that same date is generated exactly one year after its own required-by date — not based on the completion date — so the schedule stays anchored to the calendar.
- A PM Base's detail view lists every PM occurrence it has generated, with quick links to each
- PM Base templates are shown in their own section on the Work Orders page, separate from the Open/In Progress/Completed/Verified board
- Deleting a PM Base does not delete PM occurrences it already generated; they remain as independent historical records

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
- (Email/SMS/push notifications are a future enhancement — see Section 8)

### 3.8 Vendors and Service Providers
- Directory of contractors/service providers (plumber, HVAC tech, landscaper, etc.)
- Fields: name, specialty, contact info, an optional website link, and notes
- Link service providers to specific work orders and benchmarks for quick "who fixed this last time" lookup
- Searchable by name, specialty, or contact info
- A stored web link opens in a new window/tab via a dedicated link button, wherever it's shown
- Owners and Managers can add, edit, and remove vendors — the delete control is available both in the vendor list and inside the edit popup itself; a Manager's delete rights are limited to vendors they created

### 3.9 Parts Catalogue
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
- A running shopping list, generated automatically rather than maintained by hand: any part attached (with a quantity) to an Open or In Progress work order in a quantity greater than what's currently on hand in the Parts Catalogue appears here
- Shortages are grouped by the work order that needs them, each showing quantity needed, quantity on hand, and the shortfall to buy
- Clicking a work order group jumps to that work order's detail view
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

### 3.14 Multi-User Collaboration & Permissions
- Shared household view: all users see the same data, with UI controls shown or hidden based on role (2)
- **Unsaved-changes protection:** closing a work order, work request, asset, location, vendor, or part form (via the X button or clicking outside it) while it has unsaved changes prompts the user to **Save**, **Discard changes**, or **Cancel** and keep editing — no silent data loss
- **In-app help:** every page has an info icon beside its title that opens a short explanation of that page's purpose, typical workflow, who can do what, and its key features
- **Required-field convention:** required field labels are shown in bold red text with a trailing asterisk; all other fields are shown in plain, non-bold black text — there is no reliance on the word "optional"
- Full audit trail via each record's creator (`createdBy`), which also determines what a Manager is permitted to delete

### 3.15 Owner Tools
- Visible only to Owners
- **Household members:** add or remove accounts, and set/change each member's role (Owner, Manager, Executor, Guest)
- **Backup & bulk edit:** export the entire household to a multi-sheet Excel workbook (one sheet per record type — locations, assets, BOM nodes, PM tasks, work requests, work orders, benchmarks, vendors, parts) and re-import it after edits. Leaving a row's `id` blank on import creates a new record (letting bulk additions be done directly in Excel); keeping an existing `id` updates that record in place. Re-importing replaces the entire household dataset, with a confirmation prompt first.
- **Delete a work order / work request by number:** search tools to find and permanently delete a specific work order or work request by its number or title — available here in addition to the delete action already present on each record's own detail view

---

## 4. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | Dashboard and asset list load in under 2 seconds for a household with up to 500 assets |
| **Data retention** | Full history retained until explicitly deleted by a permitted user |
| **Security** | Password-hashed accounts, signed session cookies, role-based access control enforced in the UI |
| **Privacy** | Single-household scope per deployment; no data shared across households |
| **Backup** | Owner-initiated full data export/import via Excel at any time (3.15); infrastructure-level backup is a deployment concern, not an in-app one |
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
15. **Executor updating a work order:** An Executor opens a work order assigned to them — the dates, cost, vendor, and parts are all read-only, but they move it from In Progress to Completed and leave a comment noting the replacement part was slightly undersized. An Owner later opens the same work order, edits the notes for next time, and moves it to Verified.
16. **PM Base won't double up:** A furnace-filter PM Base (Non-fixed, every 3 months) has a PM occurrence sitting In Progress. Its required-by date passes without being completed — no second occurrence is generated in the meantime, since one is already active; the next one is only created once the current occurrence is marked Completed.

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

- Email/SMS/push notifications and configurable reminder lead times
- Photo/document attachments on assets, BOM nodes, work orders, and work requests
- Calendar export (ICS) / sync with external calendars
- IoT/smart-home sensor integration to trigger condition-based maintenance automatically
- Automatic mileage sync from a connected vehicle or odometer-tracking app
- Multi-property support for landlords or vacation homes
- Barcode/QR code generation and scanning for assets and parts
