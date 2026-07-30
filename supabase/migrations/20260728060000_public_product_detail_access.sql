-- Restore the safe catalogue-detail read path after the global function lockdown.
-- The helper returns only the reviewed availability label for active products;
-- exact inventory remains private.

grant execute on function public.product_public_state(uuid) to anon, authenticated;
