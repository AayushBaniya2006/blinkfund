---
description: Bootstrap the project with custom configuration, database schemas, and admin pages based on your specific SaaS idea.
argument-hint: [project name]
---

# Indie Kit Project Bootstrapper

You are an expert software architect and developer. Your task is to bootstrap a new SaaS project from this boilerplate based on the user's requirements.

## Phase 1: Information Gathering (Interactive)

**Step 1.1**: Check if the user provided a project name in the arguments.
-   If NOT, ask: "What is the name of your new SaaS project?"
-   If YES, proceed.

**Step 1.2**: Ask for a brief description.
-   "Could you give me a one-sentence description of what [Project Name] does?"

**Step 1.3**: Ask for Key User Flows / Entities.
-   "What are the core entities or resources in your app? (e.g., for a course platform: 'Courses', 'Lessons', 'Quizzes'. For a project manager: 'Projects', 'Tickets')."
-   *Note: Ask the user to list 2-3 main entities.*

**Step 1.4**: Ask about Credits.
-   "Does your app use a credit system (e.g., for AI usage)? If yes, what should we call the credit units? (e.g. 'image_generation', 'tokens'). If not, we can skip this."

## Phase 2: Execution Plan

Once you have the answers, announce the plan: "Great! I'm now going to bootstrap [Project Name]. Here is the plan:"
1.  Update Config (`lib/config.ts` & `lib/credits/config.ts`).
2.  Create Database Schemas (`db/schema/*.ts`).
3.  Create Admin Forms & APIs (`app/super-admin/`).
4.  Customize Landing Page (`app/(website-layout)/page.tsx`).

**Confirm with the user: "Shall I proceed?"**

## Phase 3: Implementation

After confirmation, execute the following changes. **Do not ask for permission for each file, just do it.**

### 1. Configuration
-   **`src/lib/config.ts`**: Update `projectName`, `description`, and `keywords`.
-   **`src/lib/credits/config.ts`**: If credits are used, update `creditTypeSchema` and `creditsConfig` with the user's types.

### 2. Database Schema
-   For each entity identified in Step 1.3, create a file `src/db/schema/[entity-name].ts`.
-   Use `drizzle-orm/pg-core` (pgTable, text, timestamp, uuid) and `zod`.
-   **Reference**: Look at `src/db/schema/plans.ts` for style.
-   Ensure columns include `id` (uuid default random), `createdAt`, `updatedAt`, and relevant fields for the entity.

### 3. Super Admin Interface
For each new entity, create the management UI and API.

-   **Directory**: `src/app/super-admin/[entity-plural]/`
-   **List Page**: `src/app/super-admin/[entity-plural]/page.tsx`
    -   Use `useSWR` to fetch data from `/api/super-admin/[entity-plural]`.
    -   Display a `Table` with key fields.
    -   Add a "Create" button.
-   **Create/Edit Pages**: `src/app/super-admin/[entity-plural]/create/page.tsx` and `[id]/edit/page.tsx`
    -   Use `react-hook-form` and `zod`.
-   **API Route**: `src/app/api/super-admin/[entity-plural]/route.ts`
    -   GET: List items (with pagination/search).
    -   POST: Create item.
-   **API Route**: `src/app/api/super-admin/[entity-plural]/[id]/route.ts`
    -   PATCH: Update item.
    -   DELETE: Remove item.

### 4. Landing Page & Layout
-   **`src/app/(website-layout)/page.tsx`**:
    -   Replace the current content.
    -   Create a compelling landing page using components from `src/components/sections/` (Hero, Features, etc.).
    -   Tailor the copy to the Project Description.
-   **`src/app/(website-layout)/layout.tsx`**:
    -   Update metadata if not already covered by `config.ts`.
    -   Ensure Header/Footer look correct.

## Completion
Once finished, report back:
"✅ Project [Project Name] has been bootstrapped!
- Config updated.
- Schemas created: [List schemas].
- Admin pages created: [List paths].
- Landing page customized.

Don't forget to run `npx drizzle-kit push` to update your database!"
