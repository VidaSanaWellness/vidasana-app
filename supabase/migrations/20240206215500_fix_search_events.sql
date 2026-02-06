-- Drop potentially conflicting overloads to resolve PGRST203 error
-- Variation 1: double precision radius
DROP FUNCTION IF EXISTS search_events(text, text, integer[], timestamp with time zone, timestamp with time zone, double precision, double precision, double precision, text, integer, integer);
-- Variation 2: integer radius
DROP FUNCTION IF EXISTS search_events(text, text, integer[], timestamp with time zone, timestamp with time zone, double precision, double precision, integer, text, integer, integer);

-- Re-create the function correctly with fully qualified column names AND explicit type casts
CREATE OR REPLACE FUNCTION search_events(
  search_query text DEFAULT NULL::text,
  target_lang text DEFAULT 'en'::text,
  category_filter integer[] DEFAULT NULL::integer[],
  date_from timestamp with time zone DEFAULT NULL::timestamp with time zone,
  date_to timestamp with time zone DEFAULT NULL::timestamp with time zone,
  user_lat double precision DEFAULT NULL::double precision,
  user_lng double precision DEFAULT NULL::double precision,
  radius_meters double precision DEFAULT NULL::double precision,
  sort_by text DEFAULT 'relevance'::text,
  page_offset integer DEFAULT 0,
  page_limit integer DEFAULT 10
) RETURNS TABLE(
  id uuid,
  title text,
  description text,
  price double precision,
  images text[],
  start_at timestamp with time zone,
  end_at timestamp with time zone,
  book_till timestamp with time zone,
  provider json,
  category_id bigint, 
  category_name text,
  lat double precision,
  lng double precision,
  dist_meters double precision,
  avg_rating double precision,
  total_reviews bigint
)
LANGUAGE plpgsql
AS $$
DECLARE
  min_lat float;
  max_lat float;
  min_lng float;
  max_lng float;
BEGIN
  -- 1. Calculate Bounding Box
  IF user_lat IS NOT NULL AND user_lng IS NOT NULL AND radius_meters IS NOT NULL THEN
    min_lat := user_lat - (radius_meters / 111320);
    max_lat := user_lat + (radius_meters / 111320);
    min_lng := user_lng - (radius_meters / (111320 * cos(radians(user_lat))));
    max_lng := user_lng + (radius_meters / (111320 * cos(radians(user_lat))));
  END IF;
  RETURN QUERY
  WITH event_ratings AS (
    SELECT 
      er.event_id,
      COALESCE(AVG(er.rating), 0)::double precision as avg_val, -- Explicit cast
      COUNT(er.id) as count_val
    FROM event_reviews er
    GROUP BY er.event_id
  ),
  base_events AS (
    SELECT
      e.id,
      e.start_at,
      e.end_at,
      e.book_till,
      e.created_at,
      e.images,
      e.category,
      -- Use ::geometry cast safe logic
      st_y(e.location::geometry) as lat,
      st_x(e.location::geometry) as lng,
      
      -- Translations
      COALESCE(
        (SELECT et.title FROM event_translations et WHERE et.event_id = e.id AND et.lang_code = target_lang LIMIT 1),
        (SELECT et.title FROM event_translations et WHERE et.event_id = e.id AND et.lang_code = 'en' LIMIT 1),
        'Untitled Event'
      ) as title,
      COALESCE(
        (SELECT et.description FROM event_translations et WHERE et.event_id = e.id AND et.lang_code = target_lang LIMIT 1),
        (SELECT et.description FROM event_translations et WHERE et.event_id = e.id AND et.lang_code = 'en' LIMIT 1),
        ''
      ) as description,
      -- Provider details
      p.name as provider_name,
      p.image as provider_image,
      
      -- Price (Explicit cast to double precision)
      (SELECT MIN(ett.price) FROM event_ticket_types ett WHERE ett.event_id = e.id)::double precision as lowest_price
    FROM events e
    LEFT JOIN profile p ON e.provider = p.id
    WHERE e.delete = false
      AND e.start_at > now() -- Only show future events
      AND (search_query IS NULL OR 
           (
             to_tsvector('english', 
               COALESCE((SELECT et_t.title FROM event_translations et_t WHERE et_t.event_id = e.id AND et_t.lang_code = 'en'), '') || ' ' ||
               COALESCE((SELECT et_d.description FROM event_translations et_d WHERE et_d.event_id = e.id AND et_d.lang_code = 'en'), '')
             ) @@ plainto_tsquery('english', search_query)
           )
      )
      AND (category_filter IS NULL OR e.category = ANY(category_filter))
      AND (date_from IS NULL OR e.start_at >= date_from)
      AND (date_to IS NULL OR e.start_at <= date_to)
  )
  SELECT
    be.id,
    be.title,
    be.description,
    be.lowest_price as price,
    be.images,
    be.start_at,
    be.end_at,
    be.book_till,
    json_build_object(
      'name', COALESCE(be.provider_name, 'Unknown Provider'),
      'image', be.provider_image
    ) as provider,
    be.category as category_id,
    c.name as category_name,
    be.lat,
    be.lng,
    -- Distance Calc
    CASE
      WHEN user_lat IS NOT NULL AND user_lng IS NOT NULL THEN
        ST_DistanceSphere(ST_MakePoint(be.lng, be.lat), ST_MakePoint(user_lng, user_lat))
      ELSE NULL
    END as dist_meters,
    COALESCE(er.avg_val, 0) as avg_rating,
    COALESCE(er.count_val, 0) as total_reviews
  FROM base_events be
  LEFT JOIN categories c ON be.category = c.id
  LEFT JOIN event_ratings er ON be.id = er.event_id
  WHERE (radius_meters IS NULL OR 
         ST_DistanceSphere(ST_MakePoint(be.lng, be.lat), ST_MakePoint(user_lng, user_lat)) <= radius_meters)
  ORDER BY
    CASE WHEN sort_by = 'price_asc' THEN be.lowest_price END ASC,
    CASE WHEN sort_by = 'price_desc' THEN be.lowest_price END DESC,
    CASE WHEN sort_by = 'newest' THEN be.created_at END DESC,
    CASE WHEN sort_by = 'relevance' AND user_lat IS NOT NULL THEN 
       ST_DistanceSphere(ST_MakePoint(be.lng, be.lat), ST_MakePoint(user_lng, user_lat))
    END ASC,
    be.created_at DESC
  LIMIT page_limit OFFSET page_offset;
END;
$$;
