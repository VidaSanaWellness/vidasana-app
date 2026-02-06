-- Drop the existing function first (required when changing return type)
drop function IF exists search_map_items (double precision, double precision, integer);

-- Create updated function to return additional fields for bottom sheet
create or replace function search_map_items (
  user_lat double precision,
  user_lng double precision,
  radius_meters integer
) RETURNS table (
  id uuid,
  lat double precision,
  lng double precision,
  type text,
  title text,
  images text[],
  price numeric,
  provider_name text,
  rating numeric,
  distance double precision
) LANGUAGE plpgsql as $$
DECLARE
  user_point geography;
BEGIN
  -- Create geography point if coords provided
  IF user_lat IS NOT NULL AND user_lng IS NOT NULL THEN
    user_point := st_setsrid(st_point(user_lng, user_lat), 4326)::geography;
  END IF;
  RETURN QUERY
  -- 1. Search Services
  SELECT
    s.id,
    ST_Y(s.location::geometry)::double precision as lat,
    ST_X(s.location::geometry)::double precision as lng,
    'service'::text as type,
    (
      SELECT st.title 
      FROM public.service_translations st 
      WHERE st.service_id = s.id 
      AND st.lang_code = 'en'
      LIMIT 1
    ) as title,
    s.images,
    s.price,
    p.name as provider_name,
    COALESCE(
      (SELECT AVG(sr.rating) FROM service_reviews sr WHERE sr.service_id = s.id),
      0
    )::numeric as rating,
    CASE 
      WHEN user_point IS NOT NULL THEN 
        st_distance(s.location::geometry::geography, user_point)
      ELSE NULL
    END as distance
  FROM public.services s
  LEFT JOIN profile p ON s.provider = p.id
  WHERE
    s.active = true
    AND s.location IS NOT NULL
    AND (
      radius_meters IS NULL
      OR user_point IS NULL
      OR st_dwithin(s.location::geometry::geography, user_point, radius_meters)
    )
  UNION ALL
  -- 2. Search Events
  SELECT
    e.id,
    ST_Y(e.location::geometry)::double precision as lat,
    ST_X(e.location::geometry)::double precision as lng,
    'event'::text as type,
    (
      SELECT et.title 
      FROM public.event_translations et 
      WHERE et.event_id = e.id 
      AND et.lang_code = 'en'
      LIMIT 1
    ) as title,
    e.images,
    (
      SELECT MIN(ett.price) 
      FROM event_ticket_types ett 
      WHERE ett.event_id = e.id
    )::numeric as price,
    p.name as provider_name,
    COALESCE(
      (SELECT AVG(er.rating) FROM event_reviews er WHERE er.event_id = e.id),
      0
    )::numeric as rating,
    CASE 
      WHEN user_point IS NOT NULL THEN 
        st_distance(e.location::geometry::geography, user_point)
      ELSE NULL
    END as distance
  FROM public.events e
  LEFT JOIN profile p ON e.provider = p.id
  WHERE
    e.delete = false
    AND e.location IS NOT NULL
    AND e.end_at >= now()
    AND (
      radius_meters IS NULL
      OR user_point IS NULL
      OR st_dwithin(e.location::geometry::geography, user_point, radius_meters)
    );
END;
$$;
