# Usage Limits for Optimization APIs

## Current State (from investigation)

- **`profiles` table already exists** in Supabase with RLS enabled. Schema: `id` (uuid, FK to auth.users), `email`, `name`, `avatar_url`, `created_at`, `updated_at`.
- **RLS policies already exist**: "Users can view own profile" (SELECT), "Users can update own profile" (UPDATE), "Users can insert own profile" (INSERT).
- **Triggers already exist**: `on_profiles_updated` calls `handle_updated_at()`, and `handle_new_user()` auto-creates a profile row on auth.users insert.
- **Neither API route** (`/api/optimize-cover`, `/api/optimize-name`) currently checks authentication or tracks usage.
- **Error handling** in `sourcing-client.tsx` catches errors from both functions and displays them via `toast.error()`.

---

## Phase 1: Database Migration (Supabase)

### 1.1 Add usage columns to existing `profiles` table
- [ ] Run migration via `apply_migration` to ALTER the existing `public.profiles` table:
  ```sql
  ALTER TABLE public.profiles
    ADD COLUMN plan text NOT NULL DEFAULT 'free'
      CONSTRAINT profiles_plan_check CHECK (plan IN ('free', 'basic', 'pro')),
    ADD COLUMN cover_generations_used integer NOT NULL DEFAULT 0,
    ADD COLUMN cover_generations_limit integer NOT NULL DEFAULT 1000,
    ADD COLUMN name_optimizations_used integer NOT NULL DEFAULT 0,
    ADD COLUMN name_optimizations_limit integer NOT NULL DEFAULT 10000,
    ADD COLUMN usage_reset_at timestamptz NOT NULL DEFAULT now();
  ```
- [ ] Backfill existing rows (there is 1 existing profile row):
  ```sql
  UPDATE public.profiles
  SET plan = 'free',
      cover_generations_used = 0,
      cover_generations_limit = 1000,
      name_optimizations_used = 0,
      name_optimizations_limit = 10000,
      usage_reset_at = now()
  WHERE plan IS NULL;
  ```
  (The NOT NULL + DEFAULT handles this automatically for existing rows, so backfill may not be needed. Verify after migration.)

### 1.2 Create RPC function for atomic usage check + increment
- [ ] Create a Postgres function `check_and_increment_usage` via `apply_migration`:
  ```sql
  CREATE OR REPLACE FUNCTION public.check_and_increment_usage(
    p_user_id uuid,
    p_feature text  -- 'cover_generation' or 'name_optimization'
  )
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  DECLARE
    v_profile public.profiles%ROWTYPE;
    v_used integer;
    v_limit integer;
    v_used_col text;
    v_limit_col text;
  BEGIN
    -- Determine columns based on feature
    IF p_feature = 'cover_generation' THEN
      v_used_col := 'cover_generations_used';
      v_limit_col := 'cover_generations_limit';
    ELSIF p_feature = 'name_optimization' THEN
      v_used_col := 'name_optimizations_used';
      v_limit_col := 'name_optimizations_limit';
    ELSE
      RETURN jsonb_build_object('allowed', false, 'error', 'Invalid feature');
    END IF;

    -- Lock the row for atomic update
    SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('allowed', false, 'error', 'Profile not found');
    END IF;

    -- Reset counters if usage_reset_at is older than 1 month
    IF v_profile.usage_reset_at < now() - interval '1 month' THEN
      UPDATE public.profiles
      SET cover_generations_used = 0,
          name_optimizations_used = 0,
          usage_reset_at = now()
      WHERE id = p_user_id;

      -- Re-read after reset
      SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;
    END IF;

    -- Get current values via dynamic column access
    IF p_feature = 'cover_generation' THEN
      v_used := v_profile.cover_generations_used;
      v_limit := v_profile.cover_generations_limit;
    ELSE
      v_used := v_profile.name_optimizations_used;
      v_limit := v_profile.name_optimizations_limit;
    END IF;

    -- Check limit
    IF v_used >= v_limit THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'used', v_used,
        'limit', v_limit
      );
    END IF;

    -- Increment
    IF p_feature = 'cover_generation' THEN
      UPDATE public.profiles
      SET cover_generations_used = cover_generations_used + 1
      WHERE id = p_user_id;
    ELSE
      UPDATE public.profiles
      SET name_optimizations_used = name_optimizations_used + 1
      WHERE id = p_user_id;
    END IF;

    RETURN jsonb_build_object(
      'allowed', true,
      'used', v_used + 1,
      'limit', v_limit
    );
  END;
  $$;
  ```
- [ ] Grant execute permission to `authenticated` role:
  ```sql
  GRANT EXECUTE ON FUNCTION public.check_and_increment_usage(uuid, text) TO authenticated;
  ```

### 1.3 Verify migration
- [ ] Run `execute_sql` to confirm columns exist: `SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'profiles' AND table_schema = 'public' ORDER BY ordinal_position;`
- [ ] Run `execute_sql` to confirm RPC works: `SELECT public.check_and_increment_usage('<existing-user-uuid>', 'name_optimization');`
- [ ] Run `get_advisors` (security) to check for any new RLS warnings.

---

## Phase 2: Server-Side Usage Helper

### 2.1 Create `src/lib/supabase/usage.ts`
- [ ] Create new file: `/Users/vadimchoi/Documents/leviosa/leviosa-frontend/src/lib/supabase/usage.ts`
- [ ] Export types:
  ```typescript
  export type UsageFeature = 'cover_generation' | 'name_optimization';

  export interface UsageCheckResult {
    allowed: boolean;
    used: number;
    limit: number;
    error?: string;
  }
  ```
- [ ] Export function `checkAndIncrementUsage(supabase: SupabaseClient, userId: string, feature: UsageFeature): Promise<UsageCheckResult>`:
  - Calls `supabase.rpc('check_and_increment_usage', { p_user_id: userId, p_feature: feature })`
  - Parses the jsonb response into `UsageCheckResult`
  - Handles Supabase errors gracefully (returns `{ allowed: false, used: 0, limit: 0, error: message }`)

---

## Phase 3: Update API Routes

### 3.1 Update `/api/optimize-name/route.ts`
**File**: `/Users/vadimchoi/Documents/leviosa/leviosa-frontend/src/app/api/optimize-name/route.ts`

- [ ] Import `createClient` from `@/lib/supabase/server`
- [ ] Import `checkAndIncrementUsage` from `@/lib/supabase/usage`
- [ ] At the top of the POST handler (after body validation), add:
  1. Create Supabase server client: `const supabase = await createClient()`
  2. Get user: `const { data: { user }, error } = await supabase.auth.getUser()`
  3. If no user or error, return `NextResponse.json({ error: 'Authentication required' }, { status: 401 })`
  4. Call `checkAndIncrementUsage(supabase, user.id, 'name_optimization')`
  5. If not allowed, return `NextResponse.json({ error: 'Usage limit reached', used: result.used, limit: result.limit }, { status: 429 })`
  6. Proceed with existing Gemini call if allowed

### 3.2 Update `/api/optimize-cover/route.ts`
**File**: `/Users/vadimchoi/Documents/leviosa/leviosa-frontend/src/app/api/optimize-cover/route.ts`

- [ ] Same pattern as 3.1 but with `'cover_generation'` as the feature
- [ ] Import `createClient` from `@/lib/supabase/server`
- [ ] Import `checkAndIncrementUsage` from `@/lib/supabase/usage`
- [ ] Add auth check + usage check before the Replicate API call

---

## Phase 4: Frontend Error Handling

### 4.1 Add usage limit types
**File**: `/Users/vadimchoi/Documents/leviosa/leviosa-frontend/src/types/usage.ts` (new file)

- [ ] Define types:
  ```typescript
  export interface UsageLimitError {
    error: string;
    used: number;
    limit: number;
  }

  export interface UsageInfo {
    used: number;
    limit: number;
    feature: 'cover_generation' | 'name_optimization';
  }
  ```

### 4.2 Update `sourcing-api.ts` to detect 429 responses
**File**: `/Users/vadimchoi/Documents/leviosa/leviosa-frontend/src/lib/sourcing-api.ts`

- [ ] In `optimizeName()`: before the generic error handling, check for `response.status === 429`:
  ```typescript
  if (response.status === 429) {
    const data = await response.json().catch(() => ({}));
    throw new SourcingApiError(
      `Name optimization limit reached (${data.used ?? '?'}/${data.limit ?? '?'} used this month)`,
      429,
    );
  }
  ```
- [ ] In `optimizeCover()`: same 429 check:
  ```typescript
  if (response.status === 429) {
    const data = await response.json().catch(() => ({}));
    throw new SourcingApiError(
      `Cover generation limit reached (${data.used ?? '?'}/${data.limit ?? '?'} used this month)`,
      429,
    );
  }
  ```
- [ ] In both functions: also check for `response.status === 401` and throw a clear auth error:
  ```typescript
  if (response.status === 401) {
    throw new SourcingApiError('Login required to use this feature', 401);
  }
  ```

### 4.3 Update `sourcing-client.tsx` error handling (optional enhancement)
**File**: `/Users/vadimchoi/Documents/leviosa/leviosa-frontend/src/app/(app)/sourcing/sourcing-client.tsx`

- [ ] In `handleSingleNameOpt` catch block: check if `err instanceof SourcingApiError && err.status === 429`, show `toast.warning()` instead of `toast.error()` with a more user-friendly message
- [ ] In `handleSingleCoverOpt` catch block: same 429 detection pattern
- [ ] In batch optimization handlers (`handleBatchNameOptimize`, `handleBatchCoverOptimize`): if a 429 is encountered, stop the batch early and show a warning toast with the limit info

---

## Phase 5: Testing

### 5.1 Unit test for `usage.ts`
**File**: `/Users/vadimchoi/Documents/leviosa/leviosa-frontend/src/lib/supabase/__tests__/usage.test.ts` (new file)

- [ ] Test: returns `{ allowed: true, used, limit }` when RPC succeeds with allowed=true
- [ ] Test: returns `{ allowed: false, used, limit }` when RPC returns allowed=false (over limit)
- [ ] Test: returns error result when RPC call fails
- [ ] Test: handles monthly reset scenario (this is handled by the DB function, so just verify the return shape)

### 5.2 Integration smoke test for API routes
- [ ] Manually test `/api/optimize-name` without auth -> expect 401
- [ ] Manually test `/api/optimize-name` with valid auth -> expect normal response
- [ ] Verify usage counter increments in Supabase dashboard after each call

### 5.3 Build verification
- [ ] Run `bun run build` to confirm no TypeScript errors
- [ ] Run `bun run lint` to confirm no lint errors
- [ ] Run `bun run test` to confirm existing tests still pass

---

## Plan Tiers Reference

| Plan  | Cover Generations/mo | Name Optimizations/mo |
|-------|---------------------:|-----------------------:|
| free  |               1,000 |                10,000 |
| basic |              10,000 |               100,000 |
| pro   |              50,000 |               500,000 |

---

## File Change Summary

| File | Action | Description |
|------|--------|-------------|
| Supabase `profiles` table | ALTER | Add plan, usage columns, check constraint |
| Supabase RPC function | CREATE | `check_and_increment_usage` for atomic check+increment |
| `src/lib/supabase/usage.ts` | CREATE | Server-side usage check helper |
| `src/types/usage.ts` | CREATE | UsageLimitError, UsageInfo types |
| `src/app/api/optimize-name/route.ts` | MODIFY | Add auth + usage check before Gemini call |
| `src/app/api/optimize-cover/route.ts` | MODIFY | Add auth + usage check before Replicate call |
| `src/lib/sourcing-api.ts` | MODIFY | Handle 401 and 429 responses in optimizeName/optimizeCover |
| `src/app/(app)/sourcing/sourcing-client.tsx` | MODIFY | Better UX for 429 errors (warning toast, batch stop) |
| `src/lib/supabase/__tests__/usage.test.ts` | CREATE | Unit tests for usage helper |
