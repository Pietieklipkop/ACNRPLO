# ACNRPLO — Application Specification
### Atherstone Collaborative Nature Reserve — Private Land Owners Platform

---

| | |
|---|---|
| **Project Name** | ACNRPLO — Private Land Owners Platform |
| **Client** | Atherstone Nature Reserve PLO |
| **Document Type** | Application Specification |
| **Version** | 0.1 — Draft |
| **Date** | 18 September 2026 |
| **Author** | Stefan van Dyk |

**DOCUMENT STATUS: DRAFT**

---

## 1. Executive Summary

The ACNRPLO platform is a purpose-built Progressive Web Application (PWA) designed to serve the Private Land Owners (PLOs) of the Atherstone Nature Reserve — a reserve co-owned between the Government (LEDET) and a group of private landowners. The application replaces the current WhatsApp-based communication model with a single, structured, and secure source of truth for all PLO governance, operational, and collaborative activities.

The platform centralises land portion management, ownership percentages, and voting weights; provides a shared reserve calendar for member visit scheduling; hosts a structured voting module for pre-loaded meeting topics; manages game quotas and game count records; serves as a document and constitution repository; and exposes a Cloudflare AI-powered assistant that members can query against the PLO constitution in natural language. Role-based, stackable access control ensures that the Secretary, Executive PLO Members, Main PLO Members, and Associate Members each interact with the platform according to their defined responsibilities, with a full audit log providing governance transparency.

---

## 2. Scope of Work

### 2.1 In Scope

- User management with stackable role-based access control (Secretary, Executive PLO Member, Main PLO Member, Associate Member)
- Land portion management — ownership percentages, vote allocations per member
- Shared reserve calendar — member visit bookings with purpose/activity tagging
- Voting module — pre-loaded poll topics with Agree / Disagree / Abstain options
- Quota management — LEDET and PLO categories (Game Capture/Selling and Hunting), individual allocation by ownership %, hunting log, open-to-buy flag, quota exchange and buy/sell between members, purchase from collective PLO quota at Secretary-set prices
- Game count management — Secretary-entered counts visible to all members
- Document repository — file upload and access for all PLO members (no file type/size restrictions at MVP)
- Constitution repository — dedicated housing of the PLO constitution document
- AI assistant — Cloudflare AI-powered natural language query interface scoped to the PLO constitution
- Financial accounts and records module — accessible to Executive PLO Members and Secretary
- Dashboard — at-a-glance view of quota stats, ownership breakdown, game counts, and key reserve metrics
- Audit log — full record of all Secretary and Executive-level actions
- Progressive Web App (PWA) — installable on desktop and mobile devices
- Full deployment on Cloudflare infrastructure (Workers, D1, R2)

### 2.2 Explicitly Out of Scope

- Native iOS or Android mobile applications
- Public-facing or self-registration user onboarding
- Third-party system integrations (payment gateways, accounting software, CRMs, ERPs)
- Data import or export functionality (CSV, Excel, PDF exports)
- Real-time collaborative editing or live data streaming
- Email, SMS, or push notification system
- Multi-language or localisation support
- WCAG or formal accessibility compliance
- GDPR, POPIA, HIPAA, or any other regulatory compliance framework
- Search functionality across documents or records
- LEDET-facing portal or Government user access

---

## 3. Technical Requirements

### 3.1 User Management & Role System

The application shall implement a stackable role-based access control (RBAC) system. A single user account may be assigned one or more roles simultaneously. Permissions are additive — a user with multiple roles receives the combined permissions of all assigned roles.

| Role | Can View | Can Create / Edit | Restrictions |
|---|---|---|---|
| **Secretary** | All platform data including audit log | User accounts, land portions, voting polls, calendar entries, quotas (allocation & pricing), game counts | Cannot vote on behalf of a PLO member |
| **Executive PLO Member** | All PLO member data plus financial records | Financial accounts and records, quota allocations and pricing | Cannot manage user accounts unless also assigned Secretary role |
| **Main PLO Member** | Own portion details, all votes, all documents, quota data, calendar, game counts, dashboard | Own calendar bookings, own hunting log entries, own quota open-to-buy flag, document uploads, quota exchange/buy/sell | Cannot manage other users, cannot create polls, cannot set quota allocations or prices |
| **Associate Member** | All PLO data in read-only mode | Nothing — read-only access only | Cannot vote, book calendar, upload documents, or perform any write action. Must be added by a Main PLO Member |

### 3.2 Authentication

- Authentication shall be implemented using Better Auth with username and password credentials
- User self-registration is disabled — all accounts must be created by a user holding the Secretary role
- No session timeout or automatic logout is required
- Password reset flow shall be included as a standard Better Auth feature

### 3.3 Dashboard

The dashboard shall serve as the application landing page post-login and shall display the following at a glance:

- PLO ownership breakdown — all members with their portion size and ownership percentage
- Quota summary — total quota per category (LEDET / PLO Hunting / PLO Game Capture/Selling), hunted vs. remaining per member
- Open-to-buy quota listings — members who have flagged quota as available
- Upcoming calendar entries — next scheduled reserve visits
- Active voting polls — polls currently open for voting
- Latest game count entry
- Recent document uploads

### 3.4 Land Portion Management

The Secretary shall be able to create, edit, and deactivate land portion records. Each portion record shall contain:

- Member name (linked to user account)
- Portion size (hectares or relevant unit)
- Ownership percentage
- Calculated vote allocation based on ownership percentage

### 3.5 Shared Reserve Calendar

The shared calendar shall allow Main PLO Members and the Secretary to log planned visits to the reserve. Each calendar entry shall capture:

- Member name
- Start date and end date
- Purpose / activity (e.g. hunting, game count, maintenance, leisure)
- Optional notes

All members (including Associates) shall be able to view all calendar entries.

### 3.6 Voting Module

The Secretary shall be able to create voting polls with pre-loaded topics. Each poll shall support the following:

- Poll title and description
- Status: Draft, Open, Closed
- Vote options: Agree / Disagree / Abstain
- Vote weight per member based on ownership percentage / vote allocation
- Results visible to all members once a poll is closed
- Audit trail of who voted and when

Associate Members shall not be able to vote. Only Main PLO Members and Executive PLO Members may cast votes.

### 3.7 Quota Management

The quota system shall be structured as follows:

| Category | Sub-Type | Managed By | Notes |
|---|---|---|---|
| **LEDET Quota** | — | Secretary / Executive | Reserve-level quota, visible to all members |
| **PLO Quota** | Game Capture / Selling | Secretary / Executive | Collective PLO quota; members may purchase at Secretary-set prices |
| **PLO Quota** | Hunting | Secretary / Executive | Split per member by ownership %; members log hunted amounts |

Individual PLO Hunting Quota rules:

- Allocated automatically based on ownership percentage by the Secretary or Executive
- Each member logs hunted quantities against their allocation
- Members may flag their quota (or portions thereof) as open-to-buy
- Members may exchange quota between their own individual allocations
- Members may buy or sell quota between each other
- Members may purchase from the collective PLO Game Capture/Selling quota at prices set by the Secretary
- All quota prices are set and maintained by the Secretary

### 3.8 Game Count

The Secretary shall be able to add game count entries. Each entry shall capture:

- Date of count
- Species name
- Count number
- Name of person who conducted the count
- Optional notes / comments

All members (including Associates) shall be able to view all historical game count records.

### 3.9 Document Repository

The application shall provide a centralised document repository with the following characteristics:

- Main PLO Members and the Secretary may upload documents
- All members (including Associates) may view and download documents
- Each document record shall capture: file name, uploader, upload date, and optional category/description
- Files shall be stored in Cloudflare R2
- No file type or size restrictions shall be enforced at MVP

### 3.10 Constitution Repository & AI Assistant

- The PLO constitution shall be stored as a dedicated, versioned document within the platform
- All members (including Associates) may view and download the constitution
- An AI assistant powered by Cloudflare AI shall be available to all members
- The AI assistant shall be scoped exclusively to the content of the PLO constitution
- Members may ask natural language questions and receive contextually relevant answers drawn from the constitution

### 3.11 Financial Accounts & Records

- Financial accounts and records shall be accessible only to users holding the Executive PLO Member or Secretary role
- The module shall allow creation and management of financial account entries and associated records
- > ⚠️ **[ASSUMPTION]** The specific fields, categories, and structure of financial records will be defined in a subsequent requirements session

### 3.12 Audit Log

- All write actions performed by Secretary and Executive PLO Member roles shall be recorded in an audit log
- Each audit log entry shall capture: user, role(s) active at time of action, action type, affected record, timestamp
- The audit log shall be viewable by the Secretary
- Audit log entries shall not be editable or deletable by any user

### 3.13 Non-Functional Requirements

| Requirement | Specification |
|---|---|
| **Availability** | 99% uptime, 24 hours a day, 7 days a week |
| **Concurrent Users** | Designed to support up to 20 concurrent users |
| **Response Time** | All pages and interactions must respond within 2 seconds under normal load |
| **App Type** | Progressive Web App (PWA) — installable on desktop and mobile browsers |
| **Multi-language** | English only — no localisation required at MVP |
| **Accessibility** | No formal accessibility standard required at MVP |
| **Session Management** | No session timeout required |
| **Data Residency** | Cloudflare edge infrastructure — no specific regional data residency requirement stated |

---

## 4. Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend Framework** | SvelteKit | Full-stack web framework — UI rendering, routing, server-side logic |
| **UI Components** | DaisyUI + Tailwind CSS | Component library and utility-first CSS styling |
| **Backend / Runtime** | Cloudflare Workers | Edge-deployed serverless runtime for all backend logic |
| **Database** | Cloudflare D1 | SQLite-based edge database for all structured application data |
| **ORM** | Drizzle ORM | Type-safe database schema management and query building |
| **File Storage** | Cloudflare R2 | Object storage for all uploaded documents and files |
| **AI / Constitution Agent** | Cloudflare AI | LLM inference for the constitution-scoped AI assistant |
| **Authentication** | Better Auth | Username and password authentication, session management |
| **Unit Testing** | Vitest | Unit and integration test runner |
| **End-to-End Testing** | Playwright | Browser-based end-to-end test automation |
| **Hosting / Infrastructure** | Cloudflare | Full edge deployment — Workers, D1, R2, AI all on Cloudflare platform |
| **App Delivery** | PWA | Progressive Web App — installable, offline-capable on desktop and mobile |

---

## 5. Data Entities

| Entity | Key Fields | Managed By |
|---|---|---|
| **Users** | ID, name, email, password hash, roles[], status | Secretary |
| **Land Portions** | ID, user_id, portion size, ownership %, vote allocation | Secretary |
| **Calendar Entries** | ID, user_id, start date, end date, purpose, notes | Secretary / Main PLO Member |
| **Voting Polls** | ID, title, description, status, created_by, created_at | Secretary |
| **Votes** | ID, poll_id, user_id, vote (Agree/Disagree/Abstain), voted_at | Main PLO / Executive PLO Member |
| **Quotas** | ID, category (LEDET/PLO), sub-type, species, total allocation, hunted, open_to_buy, price | Secretary / Executive PLO Member |
| **Quota Allocations** | ID, quota_id, user_id, allocated_amount, hunted_amount | Secretary / Executive PLO Member |
| **Game Counts** | ID, date, species, count, conducted_by, notes | Secretary |
| **Documents** | ID, file_name, r2_key, uploader_id, upload_date, description | Secretary / Main PLO Member |
| **Constitution** | ID, version, r2_key, uploaded_by, upload_date | Secretary |
| **Financial Records** | ID, account, amount, description, date, created_by | Secretary / Executive PLO Member |
| **Audit Log** | ID, user_id, role_at_time, action_type, record_id, record_type, timestamp | System (auto-generated) |

---

## 6. Assumptions & Dependencies

> All items below must be confirmed with the client or relevant stakeholder before this document is moved to **IN REVIEW** status.

- ⚠️ **[ASSUMPTION]** The PLO constitution document will be provided in digital format (PDF or Word) by the client prior to development of the AI assistant module
- ⚠️ **[ASSUMPTION]** The specific fields, categories, workflow, and reporting requirements for the Financial Accounts module will be defined and confirmed in a subsequent requirements session before that module is developed
- ⚠️ **[ASSUMPTION]** Vote weighting is calculated directly from each member's ownership percentage as recorded in their land portion record
- ⚠️ **[ASSUMPTION]** Quota allocation calculations (hunting quota per member) are performed manually by the Secretary based on ownership percentages — no automated allocation engine is required at MVP
- ⚠️ **[ASSUMPTION]** The application will be accessed primarily via modern web browsers (Chrome, Firefox, Safari, Edge) on desktop and mobile devices
- ⚠️ **[ASSUMPTION]** Cloudflare AI will be used in a Retrieval-Augmented Generation (RAG) pattern, with the constitution document chunked and indexed for query — the exact AI model and RAG implementation will be confirmed during technical design
- ⚠️ **[ASSUMPTION]** All PLO members have access to a device and internet connection capable of running a modern browser
- ⚠️ **[ASSUMPTION]** The initial user accounts (approximately 8 members) will be created by the Secretary during onboarding — no bulk import tool is required
- ⚠️ **[ASSUMPTION]** Associate Members are linked to a specific Main PLO Member and their access is revoked if the sponsoring Main PLO Member's account is deactivated
- ⚠️ **[ASSUMPTION]** The application will be English-only for the foreseeable future
- ⚠️ **[ASSUMPTION]** No formal data backup or disaster recovery SLA beyond Cloudflare's standard platform guarantees is required at this stage

---

## 7. Acceptance Criteria

The application shall be considered complete and ready for client acceptance when all of the following criteria are met:

- **User Management:** Secretary can create, edit, and deactivate user accounts. Stackable roles can be assigned and removed. Associate Members can only be added by a Main PLO Member.
- **Authentication:** Users can log in with username and password via Better Auth. Self-registration is disabled. Password reset is functional.
- **Dashboard:** All members see a dashboard on login displaying ownership breakdown, quota summary, open-to-buy listings, upcoming calendar entries, active polls, latest game count, and recent documents.
- **Land Portions:** Secretary can create and update portion records. Ownership % and vote allocation are correctly displayed per member.
- **Calendar:** Main PLO Members and Secretary can create calendar entries. All members can view the shared calendar.
- **Voting:** Secretary can create polls with pre-loaded topics. Main PLO and Executive members can vote Agree/Disagree/Abstain. Results display correctly weighted by ownership. Associates cannot vote.
- **Quota Management:** LEDET and PLO quotas are correctly categorised. Hunting quotas are allocated per member. Members can log hunted amounts, flag open-to-buy, and exchange/buy/sell quota. Collective PLO quota purchase at Secretary-set prices is functional.
- **Game Count:** Secretary can add game count entries. All members can view historical game counts.
- **Document Repository:** Main PLO Members and Secretary can upload documents. All members can view and download documents. Files are stored in Cloudflare R2.
- **Constitution & AI:** Constitution is accessible to all members. AI assistant responds accurately to natural language questions scoped to the constitution content.
- **Financial Module:** Executive PLO Members and Secretary can create and view financial records. No other roles can access this module.
- **Audit Log:** All Secretary and Executive-level write actions are logged with user, role, action, record reference, and timestamp. Log is viewable by Secretary and is immutable.
- **Performance:** All pages load and respond within 2 seconds under normal load with up to 20 concurrent users.
- **PWA:** Application is installable as a PWA on desktop and mobile browsers. Core functionality is accessible after installation.
- **Availability:** Application achieves 99% uptime on Cloudflare infrastructure.

---

> ⚠️ **Note:** All items marked [ASSUMPTION] must be confirmed with the client or relevant stakeholder before this document is moved to **IN REVIEW** status.
