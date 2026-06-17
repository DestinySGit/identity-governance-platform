GRANT EXECUTE ON FUNCTION public.write_audit_log TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_reviewer_or_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role TO authenticated;
