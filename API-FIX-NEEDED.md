# API Fix Required for Blueprint Lookup

## Issue
The `/api/industry/types/:typeId/blueprints` endpoint currently searches by `primary_type_id`, which doesn't work correctly for refineries because:

- **Refineries**: `primary_type_id` = INPUT material (e.g., Silica Grains)
- **Other assemblies**: `primary_type_id` = OUTPUT material (e.g., Reinforced Alloys)

This causes refinery blueprints to not be found when searching for materials they produce.

## Example Problem
When searching for blueprints that produce "Feldspar Crystal Shards" (type_id: 88235):
- Current API: Returns empty `[]`
- Should return: Refinery M blueprint that refines Silica Grains → Feldspar Crystal Shards

## Solution
Change the endpoint to search the `industry_blueprint_outputs` table only.

## Code Change Needed

**File**: `packages/api/src/routes/industry.ts`

**Replace the `/api/industry/types/:typeId/blueprints` endpoint with:**

```typescript
/**
 * GET /api/industry/types/:typeId/blueprints
 * Get all blueprints that can produce a specific type/product
 * Searches only industry_blueprint_outputs table
 */
router.get('/types/:typeId/blueprints', (req, res) => {
  try {
    const typeId = parseInt(req.params.typeId, 10);

    if (isNaN(typeId)) {
      return res.status(400).json({ error: 'Invalid type ID' });
    }

    // Search for blueprints by looking at outputs only
    const query = `
      SELECT DISTINCT
        ib.blueprint_id,
        ib.primary_type_id,
        ib.run_time,
        ifb.facility_type_id,
        ibo.type_id as output_type_id,
        ibo.quantity as output_quantity,
        t.icon_id,
        i.icon_file
      FROM industry_blueprint_outputs ibo
      JOIN industry_blueprints ib ON ibo.blueprint_id = ib.blueprint_id
      JOIN industry_facility_blueprints ifb ON ib.blueprint_id = ifb.blueprint_id
      LEFT JOIN types t ON ibo.type_id = t.type_id
      LEFT JOIN icons i ON t.icon_id = i.icon_id
      WHERE ibo.type_id = ?
      ORDER BY ib.run_time, ib.blueprint_id
    `;

    const blueprints = db.prepare(query).all(typeId) as any[];

    const result = blueprints.map(bp => {
      const facilityInfo = getFacilityInfo(bp.facility_type_id);
      return {
        blueprint_id: bp.blueprint_id,
        primary_type_id: bp.output_type_id,
        primary_type_name: getTypeName(bp.output_type_id),
        run_time: bp.run_time,
        facility_type_id: bp.facility_type_id,
        facility_name: facilityInfo.name,
        icon_id: bp.icon_id,
        icon_file: bp.icon_file,
        output_quantity: bp.output_quantity
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching blueprints for type:', error);
    res.status(500).json({ error: 'Failed to fetch blueprints for type' });
  }
});
```

## Testing After Fix

Test with these type IDs to verify refinery blueprints are found:

```bash
# Feldspar Crystal Shards (should return Refinery M blueprint)
curl http://34.244.217.49/api/industry/types/88235/blueprints

# Nickel-Iron Veins (should return Refinery M blueprint)
curl http://34.244.217.49/api/industry/types/77801/blueprints

# Silica Grains (should return empty - this is a base material)
curl http://34.244.217.49/api/industry/types/89259/blueprints
```

## Deploy Instructions

1. Apply the code change to the API server
2. Restart the API service
3. Test the endpoints above
4. The recursive blueprint feature in WOLF-Website will then work correctly

## Impact

This fix ensures that when users expand materials in the Blueprint Calculator:
- Refinery options appear correctly (e.g., Silica Grains → Feldspar Crystal Shards)
- Full recursive material trees show all production paths
- Base materials are correctly identified (no blueprints in outputs table)
