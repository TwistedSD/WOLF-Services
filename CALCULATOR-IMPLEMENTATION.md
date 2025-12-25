# Enhanced Blueprint Calculator Implementation

## Overview

Implemented an enhanced blueprint calculator for the WOLF Website that integrates with the new API features including excess material reuse, byproduct tracking, and blueprint comparison.

## New Components Created

### 1. `src/hooks/useEfficiency.ts`
New React hooks for the enhanced API endpoints:

**Exports:**
- `ProductionNode` interface - Complete production tree structure with excess reuse
- `Byproduct` interface - Byproduct tracking
- `useProductionCalculator()` - Main hook for calculating production requirements
  - Supports both GET (default) and POST (with blueprint overrides)
  - Returns full production tree with reuse information
- `useBlueprintOptions()` - Fetch available blueprints for a material type
- `useBlueprintComparison()` - Compare all blueprint options by efficiency

**Key Features:**
- Handles blueprint overrides via POST endpoint
- Tracks `quantity_from_excess_pool` for material reuse
- Includes byproducts and excess quantities
- Support for alternative blueprint selection

### 2. `src/components/blueprints/EnhancedMaterialRow.tsx`
Enhanced recursive material tree row component with visual indicators.

**Features:**
- ✅ Expand/collapse production tree nodes
- ✅ **BASE** badge for base materials (ores)
- ✅ **Green reuse badge** showing quantity from excess pool (with ↻ icon)
- ✅ **Blue byproduct badge** (+N BP) to show/hide byproducts
- ✅ Blueprint selector dropdown when alternatives exist
- ✅ Excess quantity display (+N next to total)
- ✅ Byproduct expansion panel with blue highlighting
- ✅ Recursive rendering with depth-based indentation (24px per level)

**Visual Indicators:**
- Base materials: Secondary color badge
- Reused materials: Green badge with recycling icon
- Byproducts available: Blue button/badge
- Excess materials: Shown in parentheses

### 3. `src/components/blueprints/ProductionSummary.tsx`
Collapsible summary panel showing aggregated production data.

**Sections:**
1. **Base Materials Required**
   - Lists all base ores needed
   - Shows total quantity
   - Displays "↓N from reuse" badge when materials were saved

2. **Excess Materials**
   - Shows leftover materials from overproduction
   - Aggregated by material type

3. **Byproducts Generated**
   - Lists all byproducts created during production
   - Shows which were reused (✓ Reused badge)
   - Aggregated totals

4. **Production Time**
   - Total production time (formatted as Xm Ys)
   - Base material time breakdown

**Features:**
- All sections collapsible
- Base materials and byproducts open by default
- Clean aggregation of duplicate materials
- Visual feedback for material reuse savings

### 4. `src/components/blueprints/CalculatorTab.tsx`
Main calculator tab component integrating all features.

**Layout:**
```
┌────────────┬──────────────┬────────────────────────┐
│ Assembly   │  Blueprints  │  Production Calculator │
│  Types     │              │                        │
│            │              │  ┌─ Header + Qty Input │
│  (Refinery)│  (Blueprint) │  ├─ Production Tree    │
│  (Factory) │  (List)      │  └─ Summary Panel      │
└────────────┴──────────────┴────────────────────────┘
```

**Features:**
- Three-column layout (same as existing BlueprintsTab)
- Quantity input field in header
- Real-time calculation on quantity change
- Blueprint override tracking
- Automatic recalculation when blueprints changed
- Error handling and loading states

## Integration Steps

### To Use the New Calculator:

1. **Import the new tab** in your main app:
```tsx
import { CalculatorTab } from "./components/blueprints/CalculatorTab";
```

2. **Add it to your tab navigation**:
```tsx
{activeTab === "calculator" && <CalculatorTab walletAddress={walletAddress} />}
```

3. **Ensure API URL is configured** in `.env`:
```
VITE_API_URL=https://api.ef-wolf.co.uk
```

## API Endpoints Used

### GET `/api/industry/efficiency/:typeId?quantity=N`
Returns full production tree with excess material reuse.

**Response:**
```json
{
  "type_id": 84182,
  "type_name": "Reinforced Alloys",
  "quantity_needed": 10,
  "quantity_produced": 14,
  "excess_quantity": 4,
  "quantity_from_excess_pool": 0,
  "blueprint_id": 88609,
  "runs_required": 1,
  "time_seconds": 4,
  "total_production_time": 142,
  "total_base_materials": 620,
  "base_material_breakdown": {"77800": 540, "77810": 80},
  "base_material_names": {"77800": "Feldspar Crystals", "77810": "Platinum-Palladium Matrix"},
  "byproducts": [],
  "alternative_blueprints": 4,
  "inputs": [...]
}
```

### POST `/api/industry/efficiency/:typeId`
Same as GET but accepts blueprint overrides.

**Request Body:**
```json
{
  "quantity": 10,
  "blueprintOverrides": {
    "77801": 89352,
    "88235": 89348
  }
}
```

### GET `/api/industry/blueprints/:typeId/options`
Returns available blueprint options for a material type.

**Response:**
```json
[
  {"blueprint_id": 88770, "output_quantity": 1, "time_seconds": 2},
  {"blueprint_id": 88609, "output_quantity": 14, "time_seconds": 4}
]
```

### GET `/api/industry/blueprints/:typeId/compare?quantity=N`
Compares all blueprint options ranked by efficiency.

**Response:**
```json
[
  {
    "blueprint_id": 88771,
    "time_seconds": 4,
    "base_materials_required": 20,
    "base_material_breakdown": {"88764": 20},
    "efficiency_rank": 1
  }
]
```

## Key Features Implemented

### ✅ Excess Material Reuse Visualization
- Green badges show materials reused from byproducts/excess
- Quantity saved displayed prominently
- Tooltip explains where materials came from

### ✅ Byproduct Tracking
- Blue badges indicate byproducts generated
- Expandable panel shows all byproducts
- Visual indicator for which were reused

### ✅ Blueprint Alternatives
- Dropdown selector when multiple blueprints exist
- Automatic recalculation when changed
- Shows output quantity and time for each option

### ✅ Production Summary
- Aggregated base materials with savings indicator
- Excess materials tracking
- Byproduct summary with reuse status
- Production time breakdown

### ✅ Visual Hierarchy
- Depth-based indentation (24px per level)
- Color-coded badges (base=secondary, reuse=green, byproducts=blue)
- Expandable/collapsible tree structure
- Clean typography and spacing

## Example Usage

### Calculate Reinforced Alloys (10x)

1. Select "Refinery L" assembly type
2. Select "Reinforced Alloys" blueprint
3. Enter quantity: 10
4. View production tree showing:
   - 20 Silica Grains reused (green badge)
   - Total base materials: 620 (down from 640)
   - Byproducts generated
   - Production time: 2m 22s

### Change Blueprint for Sub-material

1. Expand "Nickel-Iron Veins" node
2. Click blueprint dropdown
3. Select alternative refinery blueprint
4. Tree automatically recalculates with new requirements

## Benefits

1. **Material Savings Visible** - Users see exactly how much they save via reuse
2. **Informed Decisions** - Blueprint comparison helps choose optimal path
3. **Complete Picture** - Byproducts, excess, and reuse all tracked
4. **Flexible Planning** - Override any blueprint in the chain
5. **Performance** - New API calculates entire tree in one request
6. **Accurate** - Reflects actual game mechanics with excess reuse

## Testing

To test locally:

1. Start the WOLF-API on http://localhost:3001
2. Update `.env`: `VITE_API_URL=http://localhost:3001`
3. Run the website: `npm run dev`
4. Navigate to Calculator tab
5. Test with Reinforced Alloys (type_id: 84182) to see reuse in action

## Migration from Old Blueprint Tab

The old `BlueprintsTab.tsx` can coexist with the new `CalculatorTab.tsx`. Users can:
- Use old tab for simple blueprint viewing
- Use new calculator tab for production planning with reuse

Or you can replace the old tab entirely by updating the import in `App.tsx`.

## Next Steps (Optional Enhancements)

1. **Comparison Modal** - Add side-by-side blueprint comparison view
2. **Export Feature** - Export shopping list as JSON/CSV
3. **Favorites** - Save common production chains
4. **Inventory Integration** - Account for existing materials
5. **Batch Calculator** - Calculate multiple items at once

---

## Files Created

- ✅ `src/hooks/useEfficiency.ts` - New API hooks
- ✅ `src/components/blueprints/EnhancedMaterialRow.tsx` - Tree row component
- ✅ `src/components/blueprints/ProductionSummary.tsx` - Summary panel
- ✅ `src/components/blueprints/CalculatorTab.tsx` - Main calculator tab

## Files Modified

- None (all new files to avoid breaking existing functionality)

## Ready for Production

All components are:
- TypeScript type-safe
- React hooks-based
- Styled with existing CSS variables
- Compatible with current theme system
- Error-handled with loading states
- Responsive and accessible
