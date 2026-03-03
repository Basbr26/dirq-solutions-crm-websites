-- SECURITY DEFINER functions for storing OAuth tokens.
-- These bypass RLS entirely (runs as DB owner) but are still secure
-- because they derive the user identity from auth.uid() — never from
-- caller-supplied parameters.

-- ── Google Calendar ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.save_google_calendar_token(
  p_access_token     TEXT,
  p_expires_at       TIMESTAMPTZ
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid   UUID;
  v_email TEXT;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

  INSERT INTO public.profiles (id, email, role, google_access_token, google_token_expires_at, updated_at)
  VALUES (v_uid, v_email, 'SUPPORT', p_access_token, p_expires_at, NOW())
  ON CONFLICT (id) DO UPDATE SET
    google_access_token     = EXCLUDED.google_access_token,
    google_token_expires_at = EXCLUDED.google_token_expires_at,
    updated_at              = EXCLUDED.updated_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_google_calendar_token(TEXT, TIMESTAMPTZ) TO authenticated;

-- ── Gmail ────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.save_gmail_token(
  p_access_token TEXT,
  p_expires_at   TIMESTAMPTZ
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid   UUID;
  v_email TEXT;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

  INSERT INTO public.profiles (id, email, role, gmail_access_token, gmail_token_expires_at, updated_at)
  VALUES (v_uid, v_email, 'SUPPORT', p_access_token, p_expires_at, NOW())
  ON CONFLICT (id) DO UPDATE SET
    gmail_access_token     = EXCLUDED.gmail_access_token,
    gmail_token_expires_at = EXCLUDED.gmail_token_expires_at,
    updated_at             = EXCLUDED.updated_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_gmail_token(TEXT, TIMESTAMPTZ) TO authenticated;
