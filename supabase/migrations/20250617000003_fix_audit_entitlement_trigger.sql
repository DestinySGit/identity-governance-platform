-- Fix shared entitlement audit trigger: avoid direct NEW/OLD column refs across tables
CREATE OR REPLACE FUNCTION public.audit_entitlement_assignment()
RETURNS TRIGGER AS $$
DECLARE
  identity_val UUID;
  entitlement_val UUID;
  payload JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    identity_val := NEW.identity_id;
    IF TG_TABLE_NAME = 'identity_roles' THEN
      entitlement_val := (to_jsonb(NEW)->>'role_id')::uuid;
    ELSIF TG_TABLE_NAME = 'identity_groups' THEN
      entitlement_val := (to_jsonb(NEW)->>'group_id')::uuid;
    ELSIF TG_TABLE_NAME = 'identity_applications' THEN
      entitlement_val := (to_jsonb(NEW)->>'application_id')::uuid;
    END IF;
    payload := jsonb_build_object('identity_id', identity_val, 'entitlement_id', entitlement_val);
    PERFORM public.write_audit_log('entitlement.assigned', TG_TABLE_NAME, identity_val, payload);
  ELSIF TG_OP = 'DELETE' THEN
    identity_val := OLD.identity_id;
    IF TG_TABLE_NAME = 'identity_roles' THEN
      entitlement_val := (to_jsonb(OLD)->>'role_id')::uuid;
    ELSIF TG_TABLE_NAME = 'identity_groups' THEN
      entitlement_val := (to_jsonb(OLD)->>'group_id')::uuid;
    ELSIF TG_TABLE_NAME = 'identity_applications' THEN
      entitlement_val := (to_jsonb(OLD)->>'application_id')::uuid;
    END IF;
    payload := jsonb_build_object('identity_id', identity_val, 'entitlement_id', entitlement_val);
    PERFORM public.write_audit_log('entitlement.removed', TG_TABLE_NAME, identity_val, payload);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
