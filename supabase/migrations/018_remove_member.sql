-- Migration 018: Creator can remove a partner from the household.
-- Security-definer RPC keeps RLS strict — only the creator can call this.
CREATE OR REPLACE FUNCTION public.remove_member(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hid UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT household_id INTO hid
    FROM public.household_members
    WHERE user_id = auth.uid() AND role = 'creator'
    LIMIT 1;

  IF hid IS NULL THEN
    RAISE EXCEPTION 'Only the creator can remove members';
  END IF;

  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Use leave_household to remove yourself';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_id = hid AND user_id = target_user_id
  ) THEN
    RAISE EXCEPTION 'Target user is not in your household';
  END IF;

  DELETE FROM public.household_members
    WHERE household_id = hid AND user_id = target_user_id;
END;
$$;
