    DROP FUNCTION IF EXISTS upsertLeafletData(int[], text[], text[], text[], text[], text[], text[]);

    -- Returns a set of op,cartodb_id values where op means:
    --
    -- deleted: -1
    -- updated: 0
    -- inserted: 1
    --
    CREATE OR REPLACE FUNCTION upsertLeafletData(
    cartodb_ids integer[],
    geojsons text[],
    Vtype text[],
    Vcount text[],
    Vpermission text[],
    Vnotes text[],
    newSymbol text[])
    RETURNS TABLE(op int, cartodb_id int)

    LANGUAGE plpgsql SECURITY DEFINER
    RETURNS NULL ON NULL INPUT
    AS $$
    DECLARE
    sql text;
    BEGIN

    sql := 'WITH n(cartodb_id,the_geom, type, count, permission, notes, icon) AS (VALUES ';

    --Iterate over the values
    FOR i in 1 .. array_upper(geojsons, 1)
    LOOP
    IF i > 1 THEN sql := sql || ','; END IF;
    sql :=sql || '('||cartodb_ids[i]||','
    || 'ST_SetSRID(ST_GeomFromGeoJSON(NULLIF('''|| geojsons[i] ||''','''')),4326),'
    || 'CAST('''|| Vtype[i] ||''' AS text ),'
    || 'CAST('''|| Vcount[i] ||''' AS text ),'
    || 'CAST('''|| Vpermission[i] ||''' AS text ),'
    || 'CAST('''|| Vnotes[i] ||''' AS text ),'
    || 'CAST('''|| newSymbol[i] ||''' AS text )' || ')';
    END LOOP;

    sql := sql || '), do_update AS ('
    || 'UPDATE durango p '
--    || 'SET the_geom=n.the_geom, type=n.type FROM n WHERE p.cartodb_id = n.cartodb_id '
    || 'SET icon=n.icon FROM n WHERE p.cartodb_id = n.cartodb_id '
    || 'AND n.the_geom IS NOT NULL '
    || 'RETURNING p.cartodb_id ), do_delete AS ('
    || 'DELETE FROM durango p WHERE p.cartodb_id IN ('
    || 'SELECT n.cartodb_id FROM n WHERE cartodb_id >= 0 AND '
    || ' n.the_geom IS NULL ) RETURNING p.cartodb_id ), do_insert AS ('
    || 'INSERT INTO durango (the_geom, type, count, permission, notes, icon)'
    || 'SELECT n.the_geom, n.type, n.count, n.permission, n.notes, n.icon FROM n WHERE n.cartodb_id < 0 AND '
    || ' n.the_geom IS NOT NULL RETURNING cartodb_id ) '
    || 'SELECT 0,cartodb_id FROM do_update UNION ALL '
    || 'SELECT 1,cartodb_id FROM do_insert UNION ALL '
    || 'SELECT -1,cartodb_id FROM do_delete';

    RAISE DEBUG '%', sql;

    RETURN QUERY EXECUTE sql;

    END;
    $$;

    --Grant access to the public user
    GRANT EXECUTE ON FUNCTION upsertLeafletData(integer[],text[], text[], text[], text[], text[], text[]) TO publicuser;