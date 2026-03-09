-- ================================================================
-- Agency E-Commerce Boilerplate — Ultimate Seed Data
-- ================================================================
-- Run via: supabase db reset  (applies migration then seed)
-- Password for ALL test users: password123
-- ================================================================

-- ── 1. AUTH USERS ─────────────────────────────────────────────────
-- We insert directly into auth.users + auth.identities so
-- signInWithPassword works for each seed user.

-- Admin 1: Nagy Istvan (super admin)
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, raw_app_meta_data, aud, role,
  created_at, updated_at, confirmation_token, recovery_token,
  email_change, email_change_token_new, email_change_token_current, reauthentication_token, phone_change, phone_change_token
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000000',
  'admin@agency.test',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"full_name": "Nagy István"}'::jsonb,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  'authenticated', 'authenticated',
  now() - interval '90 days', now(),
  '', '',
  '', '', '', '', '', ''
);
INSERT INTO auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111',
  'admin@agency.test',
  'email',
  '{"sub": "11111111-1111-1111-1111-111111111111", "email": "admin@agency.test"}'::jsonb,
  now(), now() - interval '90 days', now()
);

-- Admin 2: Szabo Anna (admin #2)
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, raw_app_meta_data, aud, role,
  created_at, updated_at, confirmation_token, recovery_token,
  email_change, email_change_token_new, email_change_token_current, reauthentication_token, phone_change, phone_change_token
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  '00000000-0000-0000-0000-000000000000',
  'admin2@agency.test',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"full_name": "Szabó Anna"}'::jsonb,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  'authenticated', 'authenticated',
  now() - interval '60 days', now(),
  '', '',
  '', '', '', '', '', ''
);
INSERT INTO auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  '22222222-2222-2222-2222-222222222222',
  'admin2@agency.test',
  'email',
  '{"sub": "22222222-2222-2222-2222-222222222222", "email": "admin2@agency.test"}'::jsonb,
  now(), now() - interval '60 days', now()
);

-- Agency Viewer: Toth Peter
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, raw_app_meta_data, aud, role,
  created_at, updated_at, confirmation_token, recovery_token,
  email_change, email_change_token_new, email_change_token_current, reauthentication_token, phone_change, phone_change_token
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  '00000000-0000-0000-0000-000000000000',
  'viewer@agency.test',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"full_name": "Tóth Péter"}'::jsonb,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  'authenticated', 'authenticated',
  now() - interval '45 days', now(),
  '', '',
  '', '', '', '', '', ''
);
INSERT INTO auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  '33333333-3333-3333-3333-333333333333',
  'viewer@agency.test',
  'email',
  '{"sub": "33333333-3333-3333-3333-333333333333", "email": "viewer@agency.test"}'::jsonb,
  now(), now() - interval '45 days', now()
);

-- Customer 1: Kovacs Maria (active customer with many orders)
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, raw_app_meta_data, aud, role,
  created_at, updated_at, confirmation_token, recovery_token,
  email_change, email_change_token_new, email_change_token_current, reauthentication_token, phone_change, phone_change_token
) VALUES (
  '44444444-4444-4444-4444-444444444444',
  '00000000-0000-0000-0000-000000000000',
  'customer1@test.hu',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"full_name": "Kovács Mária"}'::jsonb,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  'authenticated', 'authenticated',
  now() - interval '60 days', now(),
  '', '',
  '', '', '', '', '', ''
);
INSERT INTO auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  '44444444-4444-4444-4444-444444444444',
  'customer1@test.hu',
  'email',
  '{"sub": "44444444-4444-4444-4444-444444444444", "email": "customer1@test.hu"}'::jsonb,
  now(), now() - interval '60 days', now()
);

-- Customer 2: Kiss Janos (a few orders, some cancelled)
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, raw_app_meta_data, aud, role,
  created_at, updated_at, confirmation_token, recovery_token,
  email_change, email_change_token_new, email_change_token_current, reauthentication_token, phone_change, phone_change_token
) VALUES (
  '55555555-5555-5555-5555-555555555555',
  '00000000-0000-0000-0000-000000000000',
  'customer2@test.hu',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"full_name": "Kiss János"}'::jsonb,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  'authenticated', 'authenticated',
  now() - interval '30 days', now(),
  '', '',
  '', '', '', '', '', ''
);
INSERT INTO auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  '55555555-5555-5555-5555-555555555555',
  'customer2@test.hu',
  'email',
  '{"sub": "55555555-5555-5555-5555-555555555555", "email": "customer2@test.hu"}'::jsonb,
  now(), now() - interval '30 days', now()
);

-- Customer 3: Horvath Eva (brand new customer, no orders)
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, raw_app_meta_data, aud, role,
  created_at, updated_at, confirmation_token, recovery_token,
  email_change, email_change_token_new, email_change_token_current, reauthentication_token, phone_change, phone_change_token
) VALUES (
  '66666666-6666-6666-6666-666666666666',
  '00000000-0000-0000-0000-000000000000',
  'customer3@test.hu',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"full_name": "Horváth Éva"}'::jsonb,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  'authenticated', 'authenticated',
  now() - interval '3 days', now(),
  '', '',
  '', '', '', '', '', ''
);
INSERT INTO auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  '66666666-6666-6666-6666-666666666666',
  'customer3@test.hu',
  'email',
  '{"sub": "66666666-6666-6666-6666-666666666666", "email": "customer3@test.hu"}'::jsonb,
  now(), now() - interval '3 days', now()
);

-- Customer 4: Varga Balazs (refund history)
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, raw_app_meta_data, aud, role,
  created_at, updated_at, confirmation_token, recovery_token,
  email_change, email_change_token_new, email_change_token_current, reauthentication_token, phone_change, phone_change_token
) VALUES (
  '77777777-7777-7777-7777-777777777777',
  '00000000-0000-0000-0000-000000000000',
  'customer4@test.hu',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"full_name": "Varga Balázs"}'::jsonb,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  'authenticated', 'authenticated',
  now() - interval '20 days', now(),
  '', '',
  '', '', '', '', '', ''
);
INSERT INTO auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  '77777777-7777-7777-7777-777777777777',
  'customer4@test.hu',
  'email',
  '{"sub": "77777777-7777-7777-7777-777777777777", "email": "customer4@test.hu"}'::jsonb,
  now(), now() - interval '20 days', now()
);

-- Customer 5: Molnar Kata (VIP, many completed orders)
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, raw_app_meta_data, aud, role,
  created_at, updated_at, confirmation_token, recovery_token,
  email_change, email_change_token_new, email_change_token_current, reauthentication_token, phone_change, phone_change_token
) VALUES (
  '88888888-8888-8888-8888-888888888888',
  '00000000-0000-0000-0000-000000000000',
  'customer5@test.hu',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"full_name": "Molnár Kata"}'::jsonb,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  'authenticated', 'authenticated',
  now() - interval '85 days', now(),
  '', '',
  '', '', '', '', '', ''
);
INSERT INTO auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  '88888888-8888-8888-8888-888888888888',
  'customer5@test.hu',
  'email',
  '{"sub": "88888888-8888-8888-8888-888888888888", "email": "customer5@test.hu"}'::jsonb,
  now(), now() - interval '85 days', now()
);

-- ── 2. PROFILES (with roles) ──────────────────────────────────────
-- The handle_new_user trigger creates 'customer' profiles for each,
-- but we override roles for admin/agency_viewer.

UPDATE public.profiles SET role = 'admin',           full_name = 'Nagy István',   phone = '+36 30 111 1111' WHERE id = '11111111-1111-1111-1111-111111111111';
UPDATE public.profiles SET role = 'admin',           full_name = 'Szabó Anna',    phone = '+36 30 222 2222' WHERE id = '22222222-2222-2222-2222-222222222222';
UPDATE public.profiles SET role = 'agency_viewer',   full_name = 'Tóth Péter',    phone = '+36 30 333 3333' WHERE id = '33333333-3333-3333-3333-333333333333';
UPDATE public.profiles SET                           full_name = 'Kovács Mária',  phone = '+36 20 444 4444' WHERE id = '44444444-4444-4444-4444-444444444444';
UPDATE public.profiles SET                           full_name = 'Kiss János',    phone = '+36 70 555 5555' WHERE id = '55555555-5555-5555-5555-555555555555';
UPDATE public.profiles SET                           full_name = 'Horváth Éva',   phone = '+36 20 666 6666' WHERE id = '66666666-6666-6666-6666-666666666666';
UPDATE public.profiles SET                           full_name = 'Varga Balázs',  phone = '+36 30 777 7777' WHERE id = '77777777-7777-7777-7777-777777777777';
UPDATE public.profiles SET                           full_name = 'Molnár Kata',   phone = '+36 70 888 8888' WHERE id = '88888888-8888-8888-8888-888888888888';

-- ── 3. CATEGORIES ─────────────────────────────────────────────────
-- Top-level categories
INSERT INTO public.categories (id, slug, name, parent_id, sort_order, is_active) VALUES
  ('c0000001-0000-0000-0000-000000000001', 'ruhazat',          'Ruházat',          NULL, 1, true),
  ('c0000001-0000-0000-0000-000000000002', 'cipo',             'Cipő',             NULL, 2, true),
  ('c0000001-0000-0000-0000-000000000003', 'kiegeszitok',      'Kiegészítők',      NULL, 3, true),
  ('c0000001-0000-0000-0000-000000000004', 'otthon',           'Otthon & Lakás',   NULL, 4, true),
  ('c0000001-0000-0000-0000-000000000005', 'elektronika',      'Elektronika',      NULL, 5, true),
  ('c0000001-0000-0000-0000-000000000006', 'kiárusitas',       'Kiárusítás',       NULL, 6, true),
  ('c0000001-0000-0000-0000-000000000007', 'inaktiv-kategoria','Inaktív kategória', NULL, 99, false);

-- Subcategories under Ruházat
INSERT INTO public.categories (id, slug, name, parent_id, sort_order, is_active) VALUES
  ('c0000002-0000-0000-0000-000000000001', 'polok',    'Pólók',     'c0000001-0000-0000-0000-000000000001', 1, true),
  ('c0000002-0000-0000-0000-000000000002', 'puloverek','Pulóverek', 'c0000001-0000-0000-0000-000000000001', 2, true),
  ('c0000002-0000-0000-0000-000000000003', 'nadragok', 'Nadrágok',  'c0000001-0000-0000-0000-000000000001', 3, true),
  ('c0000002-0000-0000-0000-000000000004', 'kabatok',  'Kabátok',   'c0000001-0000-0000-0000-000000000001', 4, true);

-- Subcategories under Cipő
INSERT INTO public.categories (id, slug, name, parent_id, sort_order, is_active) VALUES
  ('c0000002-0000-0000-0000-000000000005', 'sportcipo',  'Sportcipő',  'c0000001-0000-0000-0000-000000000002', 1, true),
  ('c0000002-0000-0000-0000-000000000006', 'elegans-cipo','Elegáns cipő','c0000001-0000-0000-0000-000000000002', 2, true);

-- Subcategories under Kiegészítők
INSERT INTO public.categories (id, slug, name, parent_id, sort_order, is_active) VALUES
  ('c0000002-0000-0000-0000-000000000007', 'taskak',  'Táskák',  'c0000001-0000-0000-0000-000000000003', 1, true),
  ('c0000002-0000-0000-0000-000000000008', 'orak',    'Órák',    'c0000001-0000-0000-0000-000000000003', 2, true),
  ('c0000002-0000-0000-0000-000000000009', 'ekszerek','Ékszerek', 'c0000001-0000-0000-0000-000000000003', 3, true);

-- Subcategories under Otthon
INSERT INTO public.categories (id, slug, name, parent_id, sort_order, is_active) VALUES
  ('c0000002-0000-0000-0000-000000000010', 'textilek', 'Textílek', 'c0000001-0000-0000-0000-000000000004', 1, true),
  ('c0000002-0000-0000-0000-000000000011', 'dekoracio','Dekoráció', 'c0000001-0000-0000-0000-000000000004', 2, true);

-- ── 4. PRODUCTS ───────────────────────────────────────────────────
-- 15 products across categories, various prices, some with compare_at_price

INSERT INTO public.products (id, slug, title, description, base_price, compare_at_price, main_image_url, image_urls, is_active, created_at) VALUES
  -- Ruházat > Pólók
  ('a0000001-0000-0000-0000-000000000001', 'premium-pamut-polo',
   'Prémium Pamut Póló', 'Kiváló minőségű, 100% organikus pamutból készült póló. Kényelmes szabás, tartós anyag. Elérhető több színben és méretben.',
   7990, 9990, 'https://picsum.photos/seed/polo1/800/1000', ARRAY['https://picsum.photos/seed/polo1a/800/1000','https://picsum.photos/seed/polo1b/800/1000'],
   true, now() - interval '80 days'),

  ('a0000001-0000-0000-0000-000000000002', 'minimalist-polo',
   'Minimál Design Póló', 'Letisztult, minimalista stílusú póló. Kiválóan kombinálható bármilyen outfit-hoz.',
   5990, NULL, 'https://picsum.photos/seed/polo2/800/1000', ARRAY['https://picsum.photos/seed/polo2a/800/1000'],
   true, now() - interval '70 days'),

  -- Ruházat > Pulóverek
  ('a0000001-0000-0000-0000-000000000003', 'merino-pulover',
   'Merinó Gyapjú Pulóver', 'Extra finom merinó gyapjúból készült pulóver. Könnyű, meleg, és nem szúr. Tökéletes átmeneti viselet.',
   24990, 29990, 'https://picsum.photos/seed/pulover1/800/1000', ARRAY['https://picsum.photos/seed/pulover1a/800/1000','https://picsum.photos/seed/pulover1b/800/1000'],
   true, now() - interval '60 days'),

  -- Ruházat > Nadrágok
  ('a0000001-0000-0000-0000-000000000004', 'slim-fit-chino',
   'Slim Fit Chino Nadrág', 'Modern szabású chino nadrág rugalmas anyagból. Irodába és hétköznapokra egyaránt tökéletes.',
   14990, NULL, 'https://picsum.photos/seed/chino1/800/1000', ARRAY['https://picsum.photos/seed/chino1a/800/1000'],
   true, now() - interval '55 days'),

  -- Ruházat > Kabátok
  ('a0000001-0000-0000-0000-000000000005', 'vizallo-parka',
   'Vízálló Parka Kabát', 'Vízálló, szélálló parka kabát bélelt kapucnival. Az őszi-téli szezon nélkülözhetetlen darabja.',
   39990, 49990, 'https://picsum.photos/seed/parka1/800/1000', ARRAY['https://picsum.photos/seed/parka1a/800/1000','https://picsum.photos/seed/parka1b/800/1000','https://picsum.photos/seed/parka1c/800/1000'],
   true, now() - interval '45 days'),

  -- Cipő > Sportcipő
  ('a0000001-0000-0000-0000-000000000006', 'futocipo-ultra',
   'FutóCipő Ultra', 'Könnyű futócipő fejlett csillapító technológiával. Lélegző felső rész, kiváló tapadás.',
   29990, NULL, 'https://picsum.photos/seed/shoe1/800/1000', ARRAY['https://picsum.photos/seed/shoe1a/800/1000','https://picsum.photos/seed/shoe1b/800/1000'],
   true, now() - interval '40 days'),

  -- Cipő > Elegáns
  ('a0000001-0000-0000-0000-000000000007', 'bor-felcipo',
   'Bőr Félcipő Klasszikus', 'Valódi bőrből készült klasszikus félcipő. Kézzel varrott talp, időtálló elegancia.',
   44990, 54990, 'https://picsum.photos/seed/shoe2/800/1000', ARRAY['https://picsum.photos/seed/shoe2a/800/1000'],
   true, now() - interval '35 days'),

  -- Kiegészítők > Táskák
  ('a0000001-0000-0000-0000-000000000008', 'bor-valltaska',
   'Bőr Válltáska', 'Valódi marhabőrből készült válltáska. Több rekeszes kialakítás, állítható vállpánt.',
   19990, NULL, 'https://picsum.photos/seed/bag1/800/1000', ARRAY['https://picsum.photos/seed/bag1a/800/1000','https://picsum.photos/seed/bag1b/800/1000'],
   true, now() - interval '30 days'),

  -- Kiegészítők > Órák
  ('a0000001-0000-0000-0000-000000000009', 'minimal-karocia',
   'Minimalista Karóra', 'Svájci szerkezet, szafírzafír üveg, valódi bőr szíj. Vízálló 50m-ig.',
   59990, 79990, 'https://picsum.photos/seed/watch1/800/1000', ARRAY['https://picsum.photos/seed/watch1a/800/1000'],
   true, now() - interval '25 days'),

  -- Kiegészítők > Ékszerek
  ('a0000001-0000-0000-0000-000000000010', 'ezust-nyaklanc',
   'Ezüst Nyaklánc', '925 sterling ezüst nyaklánc minimalista medállal. Hossz: 45 cm, állítható.',
   12990, 14990, 'https://picsum.photos/seed/necklace1/800/1000', ARRAY['https://picsum.photos/seed/necklace1a/800/1000'],
   true, now() - interval '20 days'),

  -- Otthon > Textílek
  ('a0000001-0000-0000-0000-000000000011', 'pamut-agynemu-szett',
   'Pamut Ágynemű Szett', '200 szálszámú egyiptomi pamut ágynemű szett. Tartalmaz: paplanhuzat, 2 párnahuzat, lepedő.',
   18990, 24990, 'https://picsum.photos/seed/bedding1/800/1000', ARRAY['https://picsum.photos/seed/bedding1a/800/1000','https://picsum.photos/seed/bedding1b/800/1000'],
   true, now() - interval '15 days'),

  -- Otthon > Dekoráció
  ('a0000001-0000-0000-0000-000000000012', 'keramia-vaza',
   'Kerámia Váza Kollekció', 'Kézzel készített kerámia váza. Egyedi, aszimmetrikus forma. Magasság: 25 cm.',
   8990, NULL, 'https://picsum.photos/seed/vase1/800/1000', ARRAY['https://picsum.photos/seed/vase1a/800/1000'],
   true, now() - interval '10 days'),

  -- Elektronika
  ('a0000001-0000-0000-0000-000000000013', 'bluetooth-fulhallgato',
   'Bluetooth Fülhallgató Pro', 'Aktív zajszűrős vezeték nélküli fülhallgató. 30 óra üzemidő, gyorstöltés.',
   34990, 44990, 'https://picsum.photos/seed/headphones1/800/1000', ARRAY['https://picsum.photos/seed/headphones1a/800/1000','https://picsum.photos/seed/headphones1b/800/1000'],
   true, now() - interval '5 days'),

  -- Kiárusítás (also in another category)
  ('a0000001-0000-0000-0000-000000000014', 'outlet-polo-csomag',
   'Outlet Póló Csomag (3 db)', 'Három darabos póló csomag akciós áron. Fekete, fehér, szürke.',
   9990, 23970, 'https://picsum.photos/seed/outletpolo/800/1000', ARRAY['https://picsum.photos/seed/outletpolo1a/800/1000'],
   true, now() - interval '2 days'),

  -- Inactive product (for testing admin)
  ('a0000001-0000-0000-0000-000000000015', 'inaktiv-teszt-termek',
   'Inaktív Teszt Termék', 'Ez a termék inaktív, csak az admin felületen látható. Tesztelési célokra.',
   99990, NULL, 'https://picsum.photos/seed/inactive1/800/1000', '{}',
   false, now() - interval '100 days');

-- ── 5. PRODUCT VARIANTS ───────────────────────────────────────────

-- Premium Pamut Póló — sizes + colors
INSERT INTO public.product_variants (id, product_id, sku, option1_name, option1_value, option2_name, option2_value, price_override, stock_quantity, is_active) VALUES
  ('b0000001-0001-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'PPP-S-FEK', 'Méret', 'S',  'Szín', 'Fekete', NULL, 25, true),
  ('b0000001-0001-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001', 'PPP-M-FEK', 'Méret', 'M',  'Szín', 'Fekete', NULL, 30, true),
  ('b0000001-0001-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000001', 'PPP-L-FEK', 'Méret', 'L',  'Szín', 'Fekete', NULL, 20, true),
  ('b0000001-0001-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000001', 'PPP-XL-FEK','Méret', 'XL', 'Szín', 'Fekete', NULL, 15, true),
  ('b0000001-0001-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000001', 'PPP-S-FEH', 'Méret', 'S',  'Szín', 'Fehér',  NULL, 18, true),
  ('b0000001-0001-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000001', 'PPP-M-FEH', 'Méret', 'M',  'Szín', 'Fehér',  NULL, 22, true),
  ('b0000001-0001-0000-0000-000000000007', 'a0000001-0000-0000-0000-000000000001', 'PPP-L-FEH', 'Méret', 'L',  'Szín', 'Fehér',  NULL, 12, true),
  ('b0000001-0001-0000-0000-000000000008', 'a0000001-0000-0000-0000-000000000001', 'PPP-M-NAV', 'Méret', 'M',  'Szín', 'Navy',   NULL,  0, true); -- out of stock variant!

-- Minimál Design Póló — sizes only
INSERT INTO public.product_variants (id, product_id, sku, option1_name, option1_value, option2_name, option2_value, price_override, stock_quantity, is_active) VALUES
  ('b0000001-0002-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000002', 'MDP-S',  'Méret', 'S',  NULL, NULL, NULL, 40, true),
  ('b0000001-0002-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000002', 'MDP-M',  'Méret', 'M',  NULL, NULL, NULL, 35, true),
  ('b0000001-0002-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000002', 'MDP-L',  'Méret', 'L',  NULL, NULL, NULL, 28, true),
  ('b0000001-0002-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000002', 'MDP-XL', 'Méret', 'XL', NULL, NULL, NULL, 10, true);

-- Merinó Pulóver — sizes + colors
INSERT INTO public.product_variants (id, product_id, sku, option1_name, option1_value, option2_name, option2_value, price_override, stock_quantity, is_active) VALUES
  ('b0000001-0003-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000003', 'MER-S-SZUR', 'Méret', 'S',  'Szín', 'Szürke',  NULL, 10, true),
  ('b0000001-0003-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000003', 'MER-M-SZUR', 'Méret', 'M',  'Szín', 'Szürke',  NULL, 15, true),
  ('b0000001-0003-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000003', 'MER-L-SZUR', 'Méret', 'L',  'Szín', 'Szürke',  NULL, 12, true),
  ('b0000001-0003-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000003', 'MER-M-BOR',  'Méret', 'M',  'Szín', 'Bordó',   26990, 8, true),
  ('b0000001-0003-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000003', 'MER-L-BOR',  'Méret', 'L',  'Szín', 'Bordó',   26990, 5, true);

-- Slim Fit Chino — sizes + colors
INSERT INTO public.product_variants (id, product_id, sku, option1_name, option1_value, option2_name, option2_value, price_override, stock_quantity, is_active) VALUES
  ('b0000001-0004-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000004', 'SFC-30-BEZ', 'Méret', '30', 'Szín', 'Bézs',   NULL, 10, true),
  ('b0000001-0004-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000004', 'SFC-32-BEZ', 'Méret', '32', 'Szín', 'Bézs',   NULL, 14, true),
  ('b0000001-0004-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000004', 'SFC-34-BEZ', 'Méret', '34', 'Szín', 'Bézs',   NULL, 8, true),
  ('b0000001-0004-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000004', 'SFC-32-SOT', 'Méret', '32', 'Szín', 'Sötétkék',NULL, 11, true),
  ('b0000001-0004-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000004', 'SFC-34-SOT', 'Méret', '34', 'Szín', 'Sötétkék',NULL, 6, true);

-- Vízálló Parka — sizes
INSERT INTO public.product_variants (id, product_id, sku, option1_name, option1_value, option2_name, option2_value, price_override, stock_quantity, is_active) VALUES
  ('b0000001-0005-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000005', 'VPK-S',  'Méret', 'S',  NULL, NULL, NULL, 5, true),
  ('b0000001-0005-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000005', 'VPK-M',  'Méret', 'M',  NULL, NULL, NULL, 8, true),
  ('b0000001-0005-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000005', 'VPK-L',  'Méret', 'L',  NULL, NULL, NULL, 6, true),
  ('b0000001-0005-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000005', 'VPK-XL', 'Méret', 'XL', NULL, NULL, NULL, 3, true);

-- FutóCipő — sizes
INSERT INTO public.product_variants (id, product_id, sku, option1_name, option1_value, option2_name, option2_value, price_override, stock_quantity, is_active) VALUES
  ('b0000001-0006-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000006', 'FCU-40', 'Méret', '40', NULL, NULL, NULL, 7, true),
  ('b0000001-0006-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000006', 'FCU-41', 'Méret', '41', NULL, NULL, NULL, 10, true),
  ('b0000001-0006-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000006', 'FCU-42', 'Méret', '42', NULL, NULL, NULL, 12, true),
  ('b0000001-0006-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000006', 'FCU-43', 'Méret', '43', NULL, NULL, NULL, 9, true),
  ('b0000001-0006-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000006', 'FCU-44', 'Méret', '44', NULL, NULL, NULL, 4, true);

-- Bőr Félcipő — sizes
INSERT INTO public.product_variants (id, product_id, sku, option1_name, option1_value, option2_name, option2_value, price_override, stock_quantity, is_active) VALUES
  ('b0000001-0007-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000007', 'BFC-41', 'Méret', '41', NULL, NULL, NULL, 5, true),
  ('b0000001-0007-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000007', 'BFC-42', 'Méret', '42', NULL, NULL, NULL, 7, true),
  ('b0000001-0007-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000007', 'BFC-43', 'Méret', '43', NULL, NULL, NULL, 3, true);

-- Bőr Válltáska — single variant (one-size)
INSERT INTO public.product_variants (id, product_id, sku, option1_name, option1_value, option2_name, option2_value, price_override, stock_quantity, is_active) VALUES
  ('b0000001-0008-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000008', 'BVT-BRN', 'Szín', 'Barna',  NULL, NULL, NULL, 15, true),
  ('b0000001-0008-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000008', 'BVT-FEK', 'Szín', 'Fekete', NULL, NULL, NULL, 10, true);

-- Minimalista Karóra — strap colors
INSERT INTO public.product_variants (id, product_id, sku, option1_name, option1_value, option2_name, option2_value, price_override, stock_quantity, is_active) VALUES
  ('b0000001-0009-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000009', 'MKO-BRN', 'Szíj', 'Barna bőr',  NULL, NULL, NULL, 8, true),
  ('b0000001-0009-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000009', 'MKO-FEK', 'Szíj', 'Fekete bőr', NULL, NULL, NULL, 6, true),
  ('b0000001-0009-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000009', 'MKO-FEM', 'Szíj', 'Fém',        NULL, NULL, 64990, 3, true);

-- Ezüst Nyaklánc — chain lengths
INSERT INTO public.product_variants (id, product_id, sku, option1_name, option1_value, option2_name, option2_value, price_override, stock_quantity, is_active) VALUES
  ('b0000001-0010-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000010', 'ENY-40', 'Hossz', '40 cm', NULL, NULL, 11990, 20, true),
  ('b0000001-0010-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000010', 'ENY-45', 'Hossz', '45 cm', NULL, NULL, NULL,   25, true),
  ('b0000001-0010-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000010', 'ENY-50', 'Hossz', '50 cm', NULL, NULL, 13990, 18, true);

-- Pamut Ágynemű — sizes
INSERT INTO public.product_variants (id, product_id, sku, option1_name, option1_value, option2_name, option2_value, price_override, stock_quantity, is_active) VALUES
  ('b0000001-0011-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000011', 'PAS-EGY',  'Méret', 'Egyszemélyes', NULL, NULL, NULL,   12, true),
  ('b0000001-0011-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000011', 'PAS-FRAN', 'Méret', 'Francia',      NULL, NULL, 22990, 8, true),
  ('b0000001-0011-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000011', 'PAS-KET',  'Méret', 'Kétszemélyes', NULL, NULL, 24990, 6, true);

-- Kerámia Váza — single variant
INSERT INTO public.product_variants (id, product_id, sku, option1_name, option1_value, option2_name, option2_value, price_override, stock_quantity, is_active) VALUES
  ('b0000001-0012-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000012', 'KVK-FEH', 'Szín', 'Fehér', NULL, NULL, NULL,  20, true),
  ('b0000001-0012-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000012', 'KVK-TER', 'Szín', 'Terrakotta', NULL, NULL, 9990, 15, true);

-- Bluetooth Fülhallgató — colors
INSERT INTO public.product_variants (id, product_id, sku, option1_name, option1_value, option2_name, option2_value, price_override, stock_quantity, is_active) VALUES
  ('b0000001-0013-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000013', 'BFP-FEK', 'Szín', 'Fekete', NULL, NULL, NULL,  30, true),
  ('b0000001-0013-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000013', 'BFP-FEH', 'Szín', 'Fehér',  NULL, NULL, NULL,  25, true),
  ('b0000001-0013-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000013', 'BFP-KEK', 'Szín', 'Kék',    NULL, NULL, 36990, 10, true);

-- Outlet Póló Csomag — sizes
INSERT INTO public.product_variants (id, product_id, sku, option1_name, option1_value, option2_name, option2_value, price_override, stock_quantity, is_active) VALUES
  ('b0000001-0014-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000014', 'OPC-S',  'Méret', 'S',  NULL, NULL, NULL, 50, true),
  ('b0000001-0014-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000014', 'OPC-M',  'Méret', 'M',  NULL, NULL, NULL, 60, true),
  ('b0000001-0014-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000014', 'OPC-L',  'Méret', 'L',  NULL, NULL, NULL, 45, true),
  ('b0000001-0014-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000014', 'OPC-XL', 'Méret', 'XL', NULL, NULL, NULL, 30, true);

-- Inactive product variant
INSERT INTO public.product_variants (id, product_id, sku, option1_name, option1_value, option2_name, option2_value, price_override, stock_quantity, is_active) VALUES
  ('b0000001-0015-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000015', 'ITT-1', 'Méret', 'Egy méret', NULL, NULL, NULL, 100, false);

-- ── 6. PRODUCT_CATEGORIES (join table) ────────────────────────────

INSERT INTO public.product_categories (product_id, category_id) VALUES
  -- Pólók
  ('a0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001'), -- Ruházat
  ('a0000001-0000-0000-0000-000000000001', 'c0000002-0000-0000-0000-000000000001'), -- Pólók
  ('a0000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000001'),
  ('a0000001-0000-0000-0000-000000000002', 'c0000002-0000-0000-0000-000000000001'),
  -- Pulóverek
  ('a0000001-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000001'),
  ('a0000001-0000-0000-0000-000000000003', 'c0000002-0000-0000-0000-000000000002'),
  -- Nadrágok
  ('a0000001-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000001'),
  ('a0000001-0000-0000-0000-000000000004', 'c0000002-0000-0000-0000-000000000003'),
  -- Kabátok
  ('a0000001-0000-0000-0000-000000000005', 'c0000001-0000-0000-0000-000000000001'),
  ('a0000001-0000-0000-0000-000000000005', 'c0000002-0000-0000-0000-000000000004'),
  -- Sportcipő
  ('a0000001-0000-0000-0000-000000000006', 'c0000001-0000-0000-0000-000000000002'),
  ('a0000001-0000-0000-0000-000000000006', 'c0000002-0000-0000-0000-000000000005'),
  -- Elegáns cipő
  ('a0000001-0000-0000-0000-000000000007', 'c0000001-0000-0000-0000-000000000002'),
  ('a0000001-0000-0000-0000-000000000007', 'c0000002-0000-0000-0000-000000000006'),
  -- Válltáska
  ('a0000001-0000-0000-0000-000000000008', 'c0000001-0000-0000-0000-000000000003'),
  ('a0000001-0000-0000-0000-000000000008', 'c0000002-0000-0000-0000-000000000007'),
  -- Karóra
  ('a0000001-0000-0000-0000-000000000009', 'c0000001-0000-0000-0000-000000000003'),
  ('a0000001-0000-0000-0000-000000000009', 'c0000002-0000-0000-0000-000000000008'),
  -- Nyaklánc
  ('a0000001-0000-0000-0000-000000000010', 'c0000001-0000-0000-0000-000000000003'),
  ('a0000001-0000-0000-0000-000000000010', 'c0000002-0000-0000-0000-000000000009'),
  -- Ágynemű
  ('a0000001-0000-0000-0000-000000000011', 'c0000001-0000-0000-0000-000000000004'),
  ('a0000001-0000-0000-0000-000000000011', 'c0000002-0000-0000-0000-000000000010'),
  -- Váza
  ('a0000001-0000-0000-0000-000000000012', 'c0000001-0000-0000-0000-000000000004'),
  ('a0000001-0000-0000-0000-000000000012', 'c0000002-0000-0000-0000-000000000011'),
  -- Fülhallgató
  ('a0000001-0000-0000-0000-000000000013', 'c0000001-0000-0000-0000-000000000005'),
  -- Outlet Póló — two categories
  ('a0000001-0000-0000-0000-000000000014', 'c0000002-0000-0000-0000-000000000001'), -- Pólók
  ('a0000001-0000-0000-0000-000000000014', 'c0000001-0000-0000-0000-000000000006'), -- Kiárusítás
  -- Inactive product
  ('a0000001-0000-0000-0000-000000000015', 'c0000001-0000-0000-0000-000000000007');

-- ── 7. COUPONS ────────────────────────────────────────────────────

INSERT INTO public.coupons (id, code, discount_type, value, min_order_amount, max_uses, used_count, valid_from, valid_until, is_active) VALUES
  -- Active percentage coupon
  ('d0000001-0000-0000-0000-000000000001', 'TESZT10',   'percentage', 10,   5000,  NULL, 3,  now() - interval '30 days', now() + interval '365 days', true),
  -- Active fixed coupon
  ('d0000001-0000-0000-0000-000000000002', 'KEDV2000',  'fixed',      2000, 10000, 100,  12, now() - interval '14 days', now() + interval '180 days', true),
  -- High-value VIP coupon
  ('d0000001-0000-0000-0000-000000000003', 'VIP25',     'percentage', 25,   20000, 10,   1,  now() - interval '7 days',  now() + interval '90 days',  true),
  -- Expired coupon
  ('d0000001-0000-0000-0000-000000000004', 'LEJART',    'percentage', 15,   NULL,  NULL, 45, now() - interval '60 days', now() - interval '1 day',    true),
  -- Max usage reached
  ('d0000001-0000-0000-0000-000000000005', 'ELFOGYOTT', 'fixed',      3000, NULL,  5,    5,  now() - interval '20 days', now() + interval '60 days',  true),
  -- Inactive coupon
  ('d0000001-0000-0000-0000-000000000006', 'INAKTIV',   'percentage', 50,   NULL,  NULL, 0,  NULL, NULL, false),
  -- No min amount, no max uses, no expiry
  ('d0000001-0000-0000-0000-000000000007', 'SZABAD',    'fixed',      1000, NULL,  NULL, 8,  NULL, NULL, true),
  -- Future coupon (not yet valid)
  ('d0000001-0000-0000-0000-000000000008', 'JOVOBEN',   'percentage', 20,   15000, 50,   0,  now() + interval '30 days', now() + interval '120 days', true);


-- ── 8. ORDERS ─────────────────────────────────────────────────────
-- Various statuses across multiple customers + guest orders

-- Address helpers (JSON):
-- Budapest address
-- Debrecen address
-- Szeged address

-- ── Customer 1 (Kovács Mária) — 4 orders ─────────────────────────

-- Order 1: Paid, shipped (completed flow)
INSERT INTO public.orders (
  id, user_id, email, status, currency, subtotal_amount, shipping_fee, discount_total, total_amount,
  coupon_code, shipping_method, shipping_address, shipping_phone,
  billing_address, notes,
  barion_payment_id, barion_status, created_at, updated_at, paid_at, shipped_at
) VALUES (
  'e0000001-0000-0000-0000-000000000001',
  '44444444-4444-4444-4444-444444444444',
  'customer1@test.hu',
  'shipped', 'HUF', 32980, 1490, 0, 34470,
  NULL, 'home',
  '{"name":"Kovács Mária","street":"Váci utca 12.","city":"Budapest","zip":"1052","country":"Magyarország"}'::jsonb,
  '+36 20 444 4444',
  '{"name":"Kovács Mária","street":"Váci utca 12.","city":"Budapest","zip":"1052","country":"Magyarország"}'::jsonb,
  'Kérem csengetés nélkül hagyják az ajtó előtt.',
  'barion_pay_001', 'Succeeded',
  now() - interval '45 days', now() - interval '40 days', now() - interval '44 days', now() - interval '42 days'
);

-- Order 2: Paid, processing
INSERT INTO public.orders (
  id, user_id, email, status, currency, subtotal_amount, shipping_fee, discount_total, total_amount,
  coupon_code, shipping_method, shipping_address, shipping_phone,
  billing_address,
  barion_payment_id, barion_status, created_at, updated_at, paid_at
) VALUES (
  'e0000001-0000-0000-0000-000000000002',
  '44444444-4444-4444-4444-444444444444',
  'customer1@test.hu',
  'processing', 'HUF', 59990, 0, 5999, 53991,
  'TESZT10', 'home',
  '{"name":"Kovács Mária","street":"Váci utca 12.","city":"Budapest","zip":"1052","country":"Magyarország"}'::jsonb,
  '+36 20 444 4444',
  '{"name":"Kovács Mária","street":"Váci utca 12.","city":"Budapest","zip":"1052","country":"Magyarország"}'::jsonb,
  'barion_pay_002', 'Succeeded',
  now() - interval '10 days', now() - interval '9 days', now() - interval '10 days'
);

-- Order 3: Awaiting payment (abandoned checkout)
INSERT INTO public.orders (
  id, user_id, email, status, currency, subtotal_amount, shipping_fee, discount_total, total_amount,
  shipping_method, shipping_address, shipping_phone, billing_address,
  created_at, updated_at
) VALUES (
  'e0000001-0000-0000-0000-000000000003',
  '44444444-4444-4444-4444-444444444444',
  'customer1@test.hu',
  'awaiting_payment', 'HUF', 7990, 1490, 0, 9480,
  'home',
  '{"name":"Kovács Mária","street":"Váci utca 12.","city":"Budapest","zip":"1052","country":"Magyarország"}'::jsonb,
  '+36 20 444 4444',
  '{"name":"Kovács Mária","street":"Váci utca 12.","city":"Budapest","zip":"1052","country":"Magyarország"}'::jsonb,
  now() - interval '2 days', now() - interval '2 days'
);

-- Order 4: Pickup point order, paid
INSERT INTO public.orders (
  id, user_id, email, status, currency, subtotal_amount, shipping_fee, discount_total, total_amount,
  shipping_method, shipping_phone,
  pickup_point_provider, pickup_point_id, pickup_point_label,
  billing_address,
  barion_payment_id, barion_status, created_at, updated_at, paid_at
) VALUES (
  'e0000001-0000-0000-0000-000000000004',
  '44444444-4444-4444-4444-444444444444',
  'customer1@test.hu',
  'paid', 'HUF', 24990, 990, 0, 25980,
  'pickup', '+36 20 444 4444',
  'foxpost', 'FP-BP-0042', 'Foxpost — Budapest, Westend',
  '{"name":"Kovács Mária","street":"Váci utca 12.","city":"Budapest","zip":"1052","country":"Magyarország"}'::jsonb,
  'barion_pay_004', 'Succeeded',
  now() - interval '5 days', now() - interval '4 days', now() - interval '5 days'
);

-- ── Customer 2 (Kiss János) — 2 orders ────────────────────────────

-- Order 5: Cancelled
INSERT INTO public.orders (
  id, user_id, email, status, currency, subtotal_amount, shipping_fee, discount_total, total_amount,
  shipping_method, shipping_address, shipping_phone, billing_address,
  barion_payment_id, barion_status, created_at, updated_at
) VALUES (
  'e0000001-0000-0000-0000-000000000005',
  '55555555-5555-5555-5555-555555555555',
  'customer2@test.hu',
  'cancelled', 'HUF', 14990, 1490, 0, 16480,
  'home',
  '{"name":"Kiss János","street":"Kossuth tér 5.","city":"Debrecen","zip":"4024","country":"Magyarország"}'::jsonb,
  '+36 70 555 5555',
  '{"name":"Kiss János","street":"Kossuth tér 5.","city":"Debrecen","zip":"4024","country":"Magyarország"}'::jsonb,
  'barion_pay_005', 'Canceled',
  now() - interval '20 days', now() - interval '18 days'
);

-- Order 6: Paid, processing, with coupon
INSERT INTO public.orders (
  id, user_id, email, status, currency, subtotal_amount, shipping_fee, discount_total, total_amount,
  coupon_code, shipping_method, shipping_address, shipping_phone, billing_address,
  barion_payment_id, barion_status, created_at, updated_at, paid_at
) VALUES (
  'e0000001-0000-0000-0000-000000000006',
  '55555555-5555-5555-5555-555555555555',
  'customer2@test.hu',
  'processing', 'HUF', 44990, 1490, 2000, 44480,
  'KEDV2000', 'home',
  '{"name":"Kiss János","street":"Kossuth tér 5.","city":"Debrecen","zip":"4024","country":"Magyarország"}'::jsonb,
  '+36 70 555 5555',
  '{"name":"Kiss János","street":"Kossuth tér 5.","city":"Debrecen","zip":"4024","country":"Magyarország"}'::jsonb,
  'barion_pay_006', 'Succeeded',
  now() - interval '7 days', now() - interval '6 days', now() - interval '7 days'
);

-- ── Customer 4 (Varga Balázs) — 2 orders ─────────────────────────

-- Order 7: Refunded
INSERT INTO public.orders (
  id, user_id, email, status, currency, subtotal_amount, shipping_fee, discount_total, total_amount,
  shipping_method, shipping_address, shipping_phone, billing_address,
  barion_payment_id, barion_status, created_at, updated_at, paid_at
) VALUES (
  'e0000001-0000-0000-0000-000000000007',
  '77777777-7777-7777-7777-777777777777',
  'customer4@test.hu',
  'refunded', 'HUF', 29990, 1490, 0, 31480,
  'home',
  '{"name":"Varga Balázs","street":"Tisza Lajos krt. 88.","city":"Szeged","zip":"6720","country":"Magyarország"}'::jsonb,
  '+36 30 777 7777',
  '{"name":"Varga Balázs","street":"Tisza Lajos krt. 88.","city":"Szeged","zip":"6720","country":"Magyarország"}'::jsonb,
  'barion_pay_007', 'Succeeded',
  now() - interval '15 days', now() - interval '12 days', now() - interval '15 days'
);

-- Order 8: Draft (in-progress checkout)
INSERT INTO public.orders (
  id, user_id, email, status, currency, subtotal_amount, shipping_fee, discount_total, total_amount,
  shipping_method, billing_address,
  created_at, updated_at
) VALUES (
  'e0000001-0000-0000-0000-000000000008',
  '77777777-7777-7777-7777-777777777777',
  'customer4@test.hu',
  'draft', 'HUF', 8990, 1490, 0, 10480,
  'home',
  '{"name":"Varga Balázs","street":"Tisza Lajos krt. 88.","city":"Szeged","zip":"6720","country":"Magyarország"}'::jsonb,
  now() - interval '1 day', now() - interval '1 day'
);

-- ── Customer 5 (Molnár Kata) — 3 orders ──────────────────────────

-- Order 9: Shipped (old, completed)
INSERT INTO public.orders (
  id, user_id, email, status, currency, subtotal_amount, shipping_fee, discount_total, total_amount,
  shipping_method, shipping_address, shipping_phone, billing_address,
  barion_payment_id, barion_status, created_at, updated_at, paid_at, shipped_at
) VALUES (
  'e0000001-0000-0000-0000-000000000009',
  '88888888-8888-8888-8888-888888888888',
  'customer5@test.hu',
  'shipped', 'HUF', 79980, 0, 0, 79980,
  'home',
  '{"name":"Molnár Kata","street":"Andrássy út 60.","city":"Budapest","zip":"1062","country":"Magyarország"}'::jsonb,
  '+36 70 888 8888',
  '{"name":"Molnár Kata","street":"Andrássy út 60.","city":"Budapest","zip":"1062","country":"Magyarország"}'::jsonb,
  'barion_pay_009', 'Succeeded',
  now() - interval '70 days', now() - interval '65 days', now() - interval '70 days', now() - interval '67 days'
);

-- Order 10: Shipped (recent)
INSERT INTO public.orders (
  id, user_id, email, status, currency, subtotal_amount, shipping_fee, discount_total, total_amount,
  shipping_method, shipping_phone,
  pickup_point_provider, pickup_point_id, pickup_point_label,
  billing_address,
  barion_payment_id, barion_status, created_at, updated_at, paid_at, shipped_at
) VALUES (
  'e0000001-0000-0000-0000-000000000010',
  '88888888-8888-8888-8888-888888888888',
  'customer5@test.hu',
  'shipped', 'HUF', 34990, 690, 0, 35680,
  'pickup', '+36 70 888 8888',
  'gls_automata', 'GLS-BP-1234', 'GLS Automata — Budapest, Árkád',
  '{"name":"Molnár Kata","street":"Andrássy út 60.","city":"Budapest","zip":"1062","country":"Magyarország"}'::jsonb,
  'barion_pay_010', 'Succeeded',
  now() - interval '14 days', now() - interval '10 days', now() - interval '14 days', now() - interval '11 days'
);

-- Order 11: Paid, waiting to process
INSERT INTO public.orders (
  id, user_id, email, status, currency, subtotal_amount, shipping_fee, discount_total, total_amount,
  coupon_code, shipping_method, shipping_address, shipping_phone, billing_address,
  barion_payment_id, barion_status, created_at, updated_at, paid_at
) VALUES (
  'e0000001-0000-0000-0000-000000000011',
  '88888888-8888-8888-8888-888888888888',
  'customer5@test.hu',
  'paid', 'HUF', 18990, 0, 4748, 14242,
  'VIP25', 'home',
  '{"name":"Molnár Kata","street":"Andrássy út 60.","city":"Budapest","zip":"1062","country":"Magyarország"}'::jsonb,
  '+36 70 888 8888',
  '{"name":"Molnár Kata","street":"Andrássy út 60.","city":"Budapest","zip":"1062","country":"Magyarország"}'::jsonb,
  'barion_pay_011', 'Succeeded',
  now() - interval '3 days', now() - interval '3 days', now() - interval '3 days'
);

-- ── Guest order (no user_id) ──────────────────────────────────────
INSERT INTO public.orders (
  id, user_id, email, status, currency, subtotal_amount, shipping_fee, discount_total, total_amount,
  shipping_method, shipping_address, shipping_phone, billing_address,
  barion_payment_id, barion_status, created_at, updated_at, paid_at
) VALUES (
  'e0000001-0000-0000-0000-000000000012',
  NULL,
  'vendeg@gmail.com',
  'paid', 'HUF', 9990, 1490, 1000, 10480,
  'home',
  '{"name":"Vendég Felhasználó","street":"Petőfi utca 3.","city":"Győr","zip":"9021","country":"Magyarország"}'::jsonb,
  '+36 20 999 0000',
  '{"name":"Vendég Felhasználó","street":"Petőfi utca 3.","city":"Győr","zip":"9021","country":"Magyarország"}'::jsonb,
  'barion_pay_012', 'Succeeded',
  now() - interval '8 days', now() - interval '7 days', now() - interval '8 days'
);

-- ── 9. ORDER ITEMS ────────────────────────────────────────────────

-- Order 1 items (Customer 1, shipped)
INSERT INTO public.order_items (order_id, product_id, variant_id, title_snapshot, variant_snapshot, unit_price_snapshot, quantity, line_total) VALUES
  ('e0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'b0000001-0001-0000-0000-000000000002',
   'Prémium Pamut Póló', '{"Méret":"M","Szín":"Fekete"}'::jsonb, 7990, 2, 15980),
  ('e0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000004', 'b0000001-0004-0000-0000-000000000002',
   'Slim Fit Chino Nadrág', '{"Méret":"32","Szín":"Bézs"}'::jsonb, 14990, 1, 14990),
  ('e0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000002', 'b0000001-0002-0000-0000-000000000001',
   'Minimál Design Póló', '{"Méret":"S"}'::jsonb, 5990, 1, 5990);

-- Order 2 items (Customer 1, processing, expensive watch)
INSERT INTO public.order_items (order_id, product_id, variant_id, title_snapshot, variant_snapshot, unit_price_snapshot, quantity, line_total) VALUES
  ('e0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000009', 'b0000001-0009-0000-0000-000000000001',
   'Minimalista Karóra', '{"Szíj":"Barna bőr"}'::jsonb, 59990, 1, 59990);

-- Order 3 items (Customer 1, awaiting payment)
INSERT INTO public.order_items (order_id, product_id, variant_id, title_snapshot, variant_snapshot, unit_price_snapshot, quantity, line_total) VALUES
  ('e0000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000001', 'b0000001-0001-0000-0000-000000000005',
   'Prémium Pamut Póló', '{"Méret":"S","Szín":"Fehér"}'::jsonb, 7990, 1, 7990);

-- Order 4 items (Customer 1, pickup, paid)
INSERT INTO public.order_items (order_id, product_id, variant_id, title_snapshot, variant_snapshot, unit_price_snapshot, quantity, line_total) VALUES
  ('e0000001-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000003', 'b0000001-0003-0000-0000-000000000002',
   'Merinó Gyapjú Pulóver', '{"Méret":"M","Szín":"Szürke"}'::jsonb, 24990, 1, 24990);

-- Order 5 items (Customer 2, cancelled)
INSERT INTO public.order_items (order_id, product_id, variant_id, title_snapshot, variant_snapshot, unit_price_snapshot, quantity, line_total) VALUES
  ('e0000001-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000004', 'b0000001-0004-0000-0000-000000000004',
   'Slim Fit Chino Nadrág', '{"Méret":"32","Szín":"Sötétkék"}'::jsonb, 14990, 1, 14990);

-- Order 6 items (Customer 2, processing, shoes)
INSERT INTO public.order_items (order_id, product_id, variant_id, title_snapshot, variant_snapshot, unit_price_snapshot, quantity, line_total) VALUES
  ('e0000001-0000-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000007', 'b0000001-0007-0000-0000-000000000002',
   'Bőr Félcipő Klasszikus', '{"Méret":"42"}'::jsonb, 44990, 1, 44990);

-- Order 7 items (Customer 4, refunded)
INSERT INTO public.order_items (order_id, product_id, variant_id, title_snapshot, variant_snapshot, unit_price_snapshot, quantity, line_total) VALUES
  ('e0000001-0000-0000-0000-000000000007', 'a0000001-0000-0000-0000-000000000006', 'b0000001-0006-0000-0000-000000000003',
   'FutóCipő Ultra', '{"Méret":"42"}'::jsonb, 29990, 1, 29990);

-- Order 8 items (Customer 4, draft)
INSERT INTO public.order_items (order_id, product_id, variant_id, title_snapshot, variant_snapshot, unit_price_snapshot, quantity, line_total) VALUES
  ('e0000001-0000-0000-0000-000000000008', 'a0000001-0000-0000-0000-000000000012', 'b0000001-0012-0000-0000-000000000001',
   'Kerámia Váza Kollekció', '{"Szín":"Fehér"}'::jsonb, 8990, 1, 8990);

-- Order 9 items (Customer 5, shipped, old — big order)
INSERT INTO public.order_items (order_id, product_id, variant_id, title_snapshot, variant_snapshot, unit_price_snapshot, quantity, line_total) VALUES
  ('e0000001-0000-0000-0000-000000000009', 'a0000001-0000-0000-0000-000000000005', 'b0000001-0005-0000-0000-000000000002',
   'Vízálló Parka Kabát', '{"Méret":"M"}'::jsonb, 39990, 1, 39990),
  ('e0000001-0000-0000-0000-000000000009', 'a0000001-0000-0000-0000-000000000001', 'b0000001-0001-0000-0000-000000000006',
   'Prémium Pamut Póló', '{"Méret":"M","Szín":"Fehér"}'::jsonb, 7990, 5, 39950);

-- Order 10 items (Customer 5, shipped, recent)
INSERT INTO public.order_items (order_id, product_id, variant_id, title_snapshot, variant_snapshot, unit_price_snapshot, quantity, line_total) VALUES
  ('e0000001-0000-0000-0000-000000000010', 'a0000001-0000-0000-0000-000000000013', 'b0000001-0013-0000-0000-000000000001',
   'Bluetooth Fülhallgató Pro', '{"Szín":"Fekete"}'::jsonb, 34990, 1, 34990);

-- Order 11 items (Customer 5, paid VIP)
INSERT INTO public.order_items (order_id, product_id, variant_id, title_snapshot, variant_snapshot, unit_price_snapshot, quantity, line_total) VALUES
  ('e0000001-0000-0000-0000-000000000011', 'a0000001-0000-0000-0000-000000000011', 'b0000001-0011-0000-0000-000000000001',
   'Pamut Ágynemű Szett', '{"Méret":"Egyszemélyes"}'::jsonb, 18990, 1, 18990);

-- Order 12 items (Guest order)
INSERT INTO public.order_items (order_id, product_id, variant_id, title_snapshot, variant_snapshot, unit_price_snapshot, quantity, line_total) VALUES
  ('e0000001-0000-0000-0000-000000000012', 'a0000001-0000-0000-0000-000000000014', 'b0000001-0014-0000-0000-000000000002',
   'Outlet Póló Csomag (3 db)', '{"Méret":"M"}'::jsonb, 9990, 1, 9990);

-- ── 10. SUBSCRIBERS ───────────────────────────────────────────────

INSERT INTO public.subscribers (email, status, tags, source, created_at, unsubscribed_at) VALUES
  ('customer1@test.hu',       'subscribed',   ARRAY['vip','women'],           'checkout',     now() - interval '60 days', NULL),
  ('customer5@test.hu',       'subscribed',   ARRAY['vip','women','frequent'],'checkout',     now() - interval '85 days', NULL),
  ('customer2@test.hu',       'subscribed',   ARRAY['men'],                   'checkout',     now() - interval '30 days', NULL),
  ('vendeg@gmail.com',        'subscribed',   ARRAY['guest'],                 'checkout',     now() - interval '8 days',  NULL),
  ('hirlevel1@teszt.hu',      'subscribed',   ARRAY['newsletter'],            'footer_form',  now() - interval '50 days', NULL),
  ('hirlevel2@teszt.hu',      'subscribed',   ARRAY['newsletter'],            'footer_form',  now() - interval '40 days', NULL),
  ('hirlevel3@teszt.hu',      'subscribed',   ARRAY['newsletter','promo'],    'popup',        now() - interval '25 days', NULL),
  ('leiratkozott@teszt.hu',   'unsubscribed', ARRAY['newsletter'],            'footer_form',  now() - interval '60 days', now() - interval '10 days'),
  ('hirlevel4@teszt.hu',      'subscribed',   ARRAY['newsletter','men'],      'footer_form',  now() - interval '15 days', NULL),
  ('hirlevel5@teszt.hu',      'subscribed',   ARRAY['newsletter','women'],    'instagram',    now() - interval '5 days',  NULL);

-- ── 11. AUDIT LOGS ────────────────────────────────────────────────

INSERT INTO public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, metadata, created_at) VALUES
  ('11111111-1111-1111-1111-111111111111', 'admin', 'product.create', 'product', 'a0000001-0000-0000-0000-000000000001', '{"title":"Prémium Pamut Póló"}'::jsonb, now() - interval '80 days'),
  ('11111111-1111-1111-1111-111111111111', 'admin', 'product.create', 'product', 'a0000001-0000-0000-0000-000000000003', '{"title":"Merinó Gyapjú Pulóver"}'::jsonb, now() - interval '60 days'),
  ('22222222-2222-2222-2222-222222222222', 'admin', 'product.create', 'product', 'a0000001-0000-0000-0000-000000000005', '{"title":"Vízálló Parka Kabát"}'::jsonb, now() - interval '45 days'),
  ('11111111-1111-1111-1111-111111111111', 'admin', 'order.status_change', 'order', 'e0000001-0000-0000-0000-000000000001', '{"from":"paid","to":"shipped","tracking":"GLS-12345678"}'::jsonb, now() - interval '42 days'),
  ('22222222-2222-2222-2222-222222222222', 'admin', 'order.status_change', 'order', 'e0000001-0000-0000-0000-000000000005', '{"from":"awaiting_payment","to":"cancelled","reason":"Customer request"}'::jsonb, now() - interval '18 days'),
  ('11111111-1111-1111-1111-111111111111', 'admin', 'order.status_change', 'order', 'e0000001-0000-0000-0000-000000000007', '{"from":"paid","to":"refunded","reason":"Méret nem megfelelő"}'::jsonb, now() - interval '12 days'),
  ('11111111-1111-1111-1111-111111111111', 'admin', 'coupon.create', 'coupon', 'd0000001-0000-0000-0000-000000000001', '{"code":"TESZT10","type":"percentage","value":10}'::jsonb, now() - interval '30 days'),
  ('22222222-2222-2222-2222-222222222222', 'admin', 'coupon.create', 'coupon', 'd0000001-0000-0000-0000-000000000003', '{"code":"VIP25","type":"percentage","value":25}'::jsonb, now() - interval '7 days'),
  ('11111111-1111-1111-1111-111111111111', 'admin', 'product.update', 'product', 'a0000001-0000-0000-0000-000000000009', '{"field":"base_price","from":54990,"to":59990}'::jsonb, now() - interval '5 days'),
  ('33333333-3333-3333-3333-333333333333', 'agency_viewer', 'admin.login', 'system', NULL, '{"ip":"192.168.1.100"}'::jsonb, now() - interval '3 days'),
  ('11111111-1111-1111-1111-111111111111', 'admin', 'subscriber.tag', 'subscriber', NULL, '{"email":"customer1@test.hu","tags":["vip","women"]}'::jsonb, now() - interval '2 days'),
  ('22222222-2222-2222-2222-222222222222', 'admin', 'order.status_change', 'order', 'e0000001-0000-0000-0000-000000000009', '{"from":"processing","to":"shipped","tracking":"MPL-87654321"}'::jsonb, now() - interval '65 days');

-- ================================================================
-- Seed complete.
-- All test users password: password123
-- ================================================================
