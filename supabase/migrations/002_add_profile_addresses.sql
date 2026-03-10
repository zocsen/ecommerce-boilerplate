-- Add saved address columns to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS default_shipping_address jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS default_billing_address jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS default_pickup_point jsonb DEFAULT '{}';

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.default_shipping_address IS 'Default home delivery address {name, street, city, zip, country}';
COMMENT ON COLUMN public.profiles.default_billing_address IS 'Default billing/invoice address {name, street, city, zip, country, company_name?, tax_number?}';
COMMENT ON COLUMN public.profiles.default_pickup_point IS 'Default pickup point {provider, point_id, point_label}';
