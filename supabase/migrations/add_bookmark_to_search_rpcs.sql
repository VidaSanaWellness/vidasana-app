-- Migration: Add is_bookmarked to search_services and search_events RPCs
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. Update search_services to include is_bookmarked
-- ============================================

CREATE OR REPLACE FUNCTION public.search_services(
  search_query text DEFAULT NULL,
  target_lang text DEFAULT 'en',
  category_filter integer[] DEFAULT NULL,
  day_filter text[] DEFAULT NULL,
  user_lat double precision DEFAULT NULL,
  user_lng double precision DEFAULT NULL,
  radius_meters double precision DEFAULT NULL,
  sort_by text DEFAULT 'relevance',
  page_offset integer DEFAULT 0,
  page_limit integer DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  price numeric,
  images text[],
  lat double precision,
  lng double precision,
  dist_meters double precision,
  provider jsonb,
  created_at timestamp with time zone,
  total_count bigint,
  is_bookmarked boolean  -- NEW FIELD
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_point geography;
BEGIN
  -- Create user location point if coordinates provided
  IF user_lat IS NOT NULL AND user_lng IS NOT NULL THEN
    user_point := ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography;
  END IF;

  RETURN QUERY
  WITH filtered_services AS (
    SELECT 
      s.id,
      s.price,
      s.images,
      s.location,
      s.created_at,
      s.provider as provider_id,
      st.title,
      st.description,
      -- Calculate distance if user location provided
      CASE 
        WHEN user_point IS NOT NULL 
        THEN ST_Distance(s.location::geography, user_point)
        ELSE NULL 
      END as distance
    FROM services s
    INNER JOIN service_translations st ON s.id = st.service_id
    WHERE s.active = true
      AND st.lang_code = target_lang
      -- Category filter
      AND (category_filter IS NULL OR s.category = ANY(category_filter))
      -- Day filter
      AND (day_filter IS NULL OR s.week_day && day_filter::public.week_day[])
      -- Radius filter
      AND (
        user_point IS NULL 
        OR radius_meters IS NULL 
        OR ST_Distance(s.location::geography, user_point) <= radius_meters
      )
      -- Search query filter
      AND (
        search_query IS NULL 
        OR st.title ILIKE '%' || search_query || '%'
        OR st.description ILIKE '%' || search_query || '%'
      )
  )
  SELECT 
    fs.id,
    fs.title,
    fs.description,
    fs.price,
    fs.images,
    ST_Y(fs.location::geometry) as lat,
    ST_X(fs.location::geometry) as lng,
    fs.distance as dist_meters,
    jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'image', p.image
    ) as provider,
    fs.created_at,
    COUNT(*) OVER() as total_count,
    COALESCE(b.id IS NOT NULL, false) as is_bookmarked  -- NEW FIELD
  FROM filtered_services fs
  INNER JOIN profile p ON fs.provider_id = p.id
  LEFT JOIN bookmark b ON fs.id = b.service AND b.user = auth.uid()  -- NEW JOIN
  ORDER BY 
    CASE 
      WHEN sort_by = 'price_asc' THEN fs.price
      WHEN sort_by = 'price_desc' THEN -fs.price
      WHEN sort_by = 'newest' THEN EXTRACT(EPOCH FROM fs.created_at)
      WHEN sort_by = 'distance' AND fs.distance IS NOT NULL THEN fs.distance
      ELSE 0
    END
  LIMIT page_limit
  OFFSET page_offset;
END;
$$;

-- ============================================
-- 2. Update search_events to include is_bookmarked
-- ============================================

CREATE OR REPLACE FUNCTION public.search_events(
  search_query text DEFAULT NULL,
  target_lang text DEFAULT 'en',
  category_filter integer[] DEFAULT NULL,
  date_from timestamp with time zone DEFAULT NULL,
  date_to timestamp with time zone DEFAULT NULL,
  user_lat double precision DEFAULT NULL,
  user_lng double precision DEFAULT NULL,
  radius_meters double precision DEFAULT NULL,
  sort_by text DEFAULT 'relevance',
  page_offset integer DEFAULT 0,
  page_limit integer DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  price numeric,
  images text[],
  lat double precision,
  lng double precision,
  dist_meters double precision,
  provider string,
  provider_name text,
  category integer,
  category_name text,
  start_at timestamp with time zone,
  end_at timestamp with time zone,
  book_till timestamp with time zone,
  active boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  is_bookmarked boolean  -- NEW FIELD
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_point geography;
BEGIN
  -- Create user location point if coordinates provided
  IF user_lat IS NOT NULL AND user_lng IS NOT NULL THEN
    user_point := ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography;
  END IF;

  RETURN QUERY
  WITH filtered_events AS (
    SELECT 
      e.id,
      e.images,
      e.location,
      e.created_at,
      e.updated_at,
      e.provider as provider_id,
      e.category as category_id,
      e.start_at,
      e.end_at,
      e.book_till,
      e.active,
      et.title,
      et.description,
      -- Get minimum ticket price
      (SELECT MIN(price) FROM event_ticket_types WHERE event_id = e.id) as price,
      -- Calculate distance if user location provided
      CASE 
        WHEN user_point IS NOT NULL 
        THEN ST_Distance(e.location::geography, user_point)
        ELSE NULL 
      END as distance
    FROM events e
    INNER JOIN event_translations et ON e.id = et.event_id
    WHERE e.active = true
      AND et.lang_code = target_lang
      -- Category filter
      AND (category_filter IS NULL OR e.category = ANY(category_filter))
      -- Date range filter
      AND (date_from IS NULL OR e.start_at >= date_from)
      AND (date_to IS NULL OR e.start_at <= date_to)
      -- Radius filter
      AND (
        user_point IS NULL 
        OR radius_meters IS NULL 
        OR ST_Distance(e.location::geography, user_point) <= radius_meters
      )
      -- Search query filter
      AND (
        search_query IS NULL 
        OR et.title ILIKE '%' || search_query || '%'
        OR et.description ILIKE '%' || search_query || '%'
      )
  )
  SELECT 
    fe.id,
    fe.title,
    fe.description,
    fe.price,
    fe.images,
    ST_Y(fe.location::geometry) as lat,
    ST_X(fe.location::geometry) as lng,
    fe.distance as dist_meters,
    fe.provider_id as provider,
    p.name as provider_name,
    fe.category_id as category,
    c.name as category_name,
    fe.start_at,
    fe.end_at,
    fe.book_till,
    fe.active,
    fe.created_at,
    fe.updated_at,
    COALESCE(eb.id IS NOT NULL, false) as is_bookmarked  -- NEW FIELD
  FROM filtered_events fe
  INNER JOIN profile p ON fe.provider_id = p.id
  INNER JOIN categories c ON fe.category_id = c.id
  LEFT JOIN event_bookmarks eb ON fe.id = eb.event AND eb.user = auth.uid()  -- NEW JOIN
  ORDER BY 
    CASE 
      WHEN sort_by = 'price_asc' THEN fe.price
      WHEN sort_by = 'price_desc' THEN -fe.price
      WHEN sort_by = 'newest' THEN EXTRACT(EPOCH FROM fe.created_at)
      WHEN sort_by = 'distance' AND fe.distance IS NOT NULL THEN fe.distance
      ELSE EXTRACT(EPOCH FROM fe.start_at)
    END
  LIMIT page_limit
  OFFSET page_offset;
END;
$$;

-- ============================================
-- Grant necessary permissions
-- ============================================

GRANT EXECUTE ON FUNCTION public.search_services TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_events TO authenticated;
