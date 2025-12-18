# Recursive Blueprint Material Expansion - Implementation Plan

## Overview
Add recursive material expansion to the Blueprint Calculator, allowing users to click on any input material to see what blueprints can produce it, select which assembly to use, and dynamically recalculate quantities down the tree.

## Test Case
**Maul** - Produced in Shipyard L (for testing and validation)

---

## 1. Data Structures

### Enhanced Material Interface
```typescript
interface RecursiveMaterial {
  // Base material info
  type_id: number;
  type_name: string;
  quantity: number;
  icon_id: number | null;
  icon_file: string | null;

  // Recursive tree state
  depth: number;
  isExpanded: boolean;
  isBaseMaterial: boolean; // No blueprints can produce this (raw ore)

  // Blueprint selection
  selectedBlueprintId: number | null;
  selectedFacilityId: number | null;
  selectedFacilityName: string | null;
  availableBlueprints: BlueprintOption[];

  // Recursive children
  children: RecursiveMaterial[];

  // Calculation metadata
  parentQuantity: number; // For recalculation when parent changes
  blueprintOutputQuantity: number; // How many this blueprint produces per run
  runsNeeded: number; // Math.ceil(quantity / blueprintOutputQuantity)
}

interface BlueprintOption {
  blueprint_id: number;
  facility_type_id: number;
  facility_name: string;
  run_time: number;
  output_quantity: number; // How many of the target item this blueprint produces
}
```

### Material Tree State
```typescript
interface MaterialTreeState {
  // Map of type_id -> expansion state
  expandedMaterials: Set<number>;

  // Map of type_id -> selected blueprint_id
  blueprintSelections: Map<number, number>;

  // Root materials from the selected blueprint
  rootMaterials: RecursiveMaterial[];
}
```

---

## 2. New Hooks

### Hook 1: Fetch blueprints that produce a material
```typescript
// File: src/hooks/useBlueprints.ts

export function useBlueprintsByType(typeId: number | null) {
  const [blueprints, setBlueprints] = useState<BlueprintOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!typeId) {
      setBlueprints([]);
      return;
    }

    const fetchBlueprints = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          `${API_URL}/api/industry/types/${typeId}/blueprints`
        );
        if (!response.ok) throw new Error('Failed to fetch blueprints');
        const data = await response.json();

        // Transform to BlueprintOption format
        const options = data.map((bp: any) => ({
          blueprint_id: bp.blueprint_id,
          facility_type_id: bp.facility_type_id,
          facility_name: bp.facility_name,
          run_time: bp.run_time,
          output_quantity: 1 // Need to get from blueprint details
        }));

        setBlueprints(options);
        setError(null);
      } catch (err) {
        console.error('Error fetching blueprints by type:', err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBlueprints();
  }, [typeId]);

  return { blueprints, isLoading, error };
}
```

### Hook 2: Fetch material efficiency tree (for optimal blueprint)
```typescript
export function useMaterialEfficiency(
  typeId: number | null,
  quantity: number,
  blueprintId?: number
) {
  const [efficiency, setEfficiency] = useState<EfficiencyResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!typeId || quantity <= 0) {
      setEfficiency(null);
      return;
    }

    const fetchEfficiency = async () => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams({
          quantity: quantity.toString(),
        });
        if (blueprintId) {
          params.append('blueprintId', blueprintId.toString());
        }

        const response = await fetch(
          `${API_URL}/api/industry/efficiency/${typeId}?${params}`
        );
        if (!response.ok) throw new Error('Failed to fetch efficiency');
        const data = await response.json();
        setEfficiency(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching efficiency:', err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchEfficiency();
  }, [typeId, quantity, blueprintId]);

  return { efficiency, isLoading, error };
}

export interface EfficiencyResult {
  type_id: number;
  type_name: string;
  quantity_needed: number;
  blueprint_id: number | null;
  facility_type_id: number | null;
  facility_name: string | null;
  run_time: number;
  total_production_time: number;
  total_base_materials: number;
  base_material_breakdown: { [typeId: number]: number };
  base_material_names: { [typeId: number]: string };
  children: EfficiencyResult[];
}
```

---

## 3. Component Architecture

### New Component: RecursiveMaterialRow
```typescript
// File: src/components/blueprints/RecursiveMaterialRow.tsx

interface RecursiveMaterialRowProps {
  material: RecursiveMaterial;
  depth: number;
  onExpand: (typeId: number) => void;
  onBlueprintChange: (typeId: number, blueprintId: number) => void;
  isLoading?: boolean;
}

export const RecursiveMaterialRow: React.FC<RecursiveMaterialRowProps> = ({
  material,
  depth,
  onExpand,
  onBlueprintChange,
  isLoading = false
}) => {
  const indent = depth * 24; // 24px per level
  const canExpand = !material.isBaseMaterial && !material.isExpanded;
  const isExpanded = material.isExpanded;

  return (
    <div style={{ marginLeft: `${indent}px` }}>
      {/* Material Header */}
      <div className="flex items-center gap-2 py-2 px-3 border-b"
           style={{ borderColor: "var(--background-lighter)" }}>

        {/* Expand/Collapse Button */}
        {!material.isBaseMaterial && (
          <button
            onClick={() => onExpand(material.type_id)}
            className="w-5 h-5 flex items-center justify-center text-primary hover:bg-background-lighter rounded"
          >
            {isLoading ? '...' : isExpanded ? '−' : '+'}
          </button>
        )}

        {/* Material Name */}
        <span className="flex-1 text-sm text-foreground">
          {material.type_name}
        </span>

        {/* Blueprint/Facility Selector (if expanded) */}
        {isExpanded && material.availableBlueprints.length > 0 && (
          <select
            value={material.selectedBlueprintId || ''}
            onChange={(e) => onBlueprintChange(material.type_id, parseInt(e.target.value))}
            className="text-xs px-2 py-1 rounded border bg-background text-foreground"
            style={{ borderColor: "var(--primary)" }}
          >
            {material.availableBlueprints.map(bp => (
              <option key={bp.blueprint_id} value={bp.blueprint_id}>
                {bp.facility_name}
              </option>
            ))}
          </select>
        )}

        {/* Quantity */}
        <span className="text-xs text-foreground-muted w-20 text-right">
          {material.quantity.toLocaleString()}
        </span>
      </div>

      {/* Recursive Children */}
      {isExpanded && material.children.map((child, idx) => (
        <RecursiveMaterialRow
          key={`${child.type_id}-${idx}`}
          material={child}
          depth={depth + 1}
          onExpand={onExpand}
          onBlueprintChange={onBlueprintChange}
        />
      ))}
    </div>
  );
};
```

### Integration into BlueprintsTab
Update the Input Materials section to use RecursiveMaterialRow instead of MaterialRow.

---

## 4. State Management Logic

### Managing Material Tree State
```typescript
// In BlueprintsTab component

const [materialTree, setMaterialTree] = useState<RecursiveMaterial[]>([]);
const [expandedMaterials, setExpandedMaterials] = useState<Set<number>>(new Set());
const [blueprintSelections, setBlueprintSelections] = useState<Map<number, number>>(new Map());

// Initialize tree from blueprint details
useEffect(() => {
  if (!details) return;

  const initialTree = details.inputs.map(input => ({
    type_id: input.type_id,
    type_name: input.type_name,
    quantity: input.quantity,
    icon_id: input.icon_id,
    icon_file: input.icon_file,
    depth: 0,
    isExpanded: false,
    isBaseMaterial: false, // Will be determined when expanded
    selectedBlueprintId: null,
    selectedFacilityId: null,
    selectedFacilityName: null,
    availableBlueprints: [],
    children: [],
    parentQuantity: input.quantity,
    blueprintOutputQuantity: 1,
    runsNeeded: input.quantity
  }));

  setMaterialTree(initialTree);
}, [details]);
```

### Handle Material Expansion
```typescript
const handleMaterialExpand = async (typeId: number) => {
  // Check if already expanded - toggle collapse
  if (expandedMaterials.has(typeId)) {
    setExpandedMaterials(prev => {
      const next = new Set(prev);
      next.delete(typeId);
      return next;
    });
    // Collapse in tree
    setMaterialTree(prev => collapseMaterial(prev, typeId));
    return;
  }

  // Fetch blueprints for this material
  const response = await fetch(`${API_URL}/api/industry/types/${typeId}/blueprints`);
  const blueprintOptions = await response.json();

  if (blueprintOptions.length === 0) {
    // Base material - no blueprints can make it
    setMaterialTree(prev => markAsBaseMaterial(prev, typeId));
    return;
  }

  // Fetch optimal blueprint using efficiency API
  const materialNode = findMaterialInTree(materialTree, typeId);
  if (!materialNode) return;

  const efficiencyResponse = await fetch(
    `${API_URL}/api/industry/efficiency/${typeId}?quantity=${materialNode.quantity}`
  );
  const efficiencyData = await efficiencyResponse.json();

  const optimalBlueprintId = efficiencyData.blueprint_id;

  // Expand material with optimal blueprint selected
  setExpandedMaterials(prev => new Set(prev).add(typeId));
  setBlueprintSelections(prev => new Map(prev).set(typeId, optimalBlueprintId));

  // Update tree with children from efficiency data
  setMaterialTree(prev => expandMaterial(prev, typeId, {
    availableBlueprints: blueprintOptions.map(bp => ({
      blueprint_id: bp.blueprint_id,
      facility_type_id: bp.facility_type_id,
      facility_name: bp.facility_name,
      run_time: bp.run_time,
      output_quantity: 1
    })),
    selectedBlueprintId: optimalBlueprintId,
    children: efficiencyData.children.map(child => transformToRecursiveMaterial(child, 1))
  }));
};
```

---

## 5. Quantity Recalculation Algorithm

### When Blueprint Selection Changes
```typescript
const handleBlueprintChange = async (typeId: number, newBlueprintId: number) => {
  // Update selection
  setBlueprintSelections(prev => new Map(prev).set(typeId, newBlueprintId));

  // Find the material in tree
  const materialNode = findMaterialInTree(materialTree, typeId);
  if (!materialNode) return;

  // Fetch new blueprint details to get inputs
  const response = await fetch(
    `${API_URL}/api/industry/blueprints/${newBlueprintId}`
  );
  const blueprintDetails = await response.json();

  // Calculate runs needed based on parent quantity
  const outputQty = blueprintDetails.outputs.find(
    (o: any) => o.type_id === typeId
  )?.quantity || 1;
  const runsNeeded = Math.ceil(materialNode.quantity / outputQty);

  // Calculate new child quantities
  const newChildren = blueprintDetails.inputs.map((input: any) => ({
    type_id: input.type_id,
    type_name: input.type_name,
    quantity: input.quantity * runsNeeded, // CASCADE QUANTITY
    icon_id: input.icon_id,
    icon_file: input.icon_file,
    depth: materialNode.depth + 1,
    isExpanded: false,
    isBaseMaterial: false,
    selectedBlueprintId: null,
    selectedFacilityId: null,
    selectedFacilityName: null,
    availableBlueprints: [],
    children: [],
    parentQuantity: input.quantity * runsNeeded,
    blueprintOutputQuantity: outputQty,
    runsNeeded
  }));

  // Update tree with new children
  setMaterialTree(prev => updateMaterialChildren(prev, typeId, newChildren));

  // RECURSIVELY recalculate children if they are expanded
  for (const child of newChildren) {
    if (expandedMaterials.has(child.type_id)) {
      const childBlueprintId = blueprintSelections.get(child.type_id);
      if (childBlueprintId) {
        await handleBlueprintChange(child.type_id, childBlueprintId);
      }
    }
  }
};
```

### Helper Functions
```typescript
// Recursively find material in tree
function findMaterialInTree(
  materials: RecursiveMaterial[],
  typeId: number
): RecursiveMaterial | null {
  for (const material of materials) {
    if (material.type_id === typeId) return material;
    const found = findMaterialInTree(material.children, typeId);
    if (found) return found;
  }
  return null;
}

// Recursively update material in tree
function updateMaterialInTree(
  materials: RecursiveMaterial[],
  typeId: number,
  updates: Partial<RecursiveMaterial>
): RecursiveMaterial[] {
  return materials.map(material => {
    if (material.type_id === typeId) {
      return { ...material, ...updates };
    }
    if (material.children.length > 0) {
      return {
        ...material,
        children: updateMaterialInTree(material.children, typeId, updates)
      };
    }
    return material;
  });
}
```

---

## 6. UI/UX Design

### Visual Hierarchy
- **Indentation**: 24px per depth level
- **Expand Icon**: `+` collapsed, `−` expanded, left-aligned
- **Material Name**: Left-aligned after icon
- **Facility Dropdown**: Center, only shown when expanded and has blueprints
- **Quantity**: Right-aligned, monospace font

### Styling
```typescript
// Match existing patterns from BlueprintsTab
style={{
  backgroundColor: "var(--background-light)",
  borderColor: "var(--primary)",
  color: "var(--foreground)"
}}

// Base materials - special styling
className="border-l-4 border-secondary"

// Loading state
{isLoading && <span className="text-foreground-muted">Loading...</span>}
```

### Color Coding
- **Regular materials**: Default text color
- **Base materials**: Secondary border accent
- **Expanded materials**: Slightly lighter background
- **Selected facility**: Primary color highlight in dropdown

---

## 7. Implementation Steps

### Step 1: Add New Hooks
- [ ] Add `useBlueprintsByType` to `useBlueprints.ts`
- [ ] Add `useMaterialEfficiency` to `useBlueprints.ts`
- [ ] Add `EfficiencyResult` interface

### Step 2: Create RecursiveMaterialRow Component
- [ ] Create new file `src/components/blueprints/RecursiveMaterialRow.tsx`
- [ ] Implement expand/collapse logic
- [ ] Add blueprint dropdown selector
- [ ] Add recursive children rendering

### Step 3: Update BlueprintsTab
- [ ] Add material tree state management
- [ ] Add `handleMaterialExpand` function
- [ ] Add `handleBlueprintChange` function
- [ ] Replace MaterialRow with RecursiveMaterialRow in Input Materials section
- [ ] Add helper functions for tree manipulation

### Step 4: Test with Maul
- [ ] Select Shipyard L
- [ ] Select Maul blueprint
- [ ] Click on input materials to expand
- [ ] Verify quantities cascade correctly
- [ ] Change facility selections and verify recalculation

### Step 5: Polish
- [ ] Add loading states
- [ ] Add error handling
- [ ] Optimize performance (memoization)
- [ ] Add tooltips/help text

---

## 8. Edge Cases to Handle

1. **Circular Dependencies**: Material A requires Material B which requires Material A
   - Solution: Track visited materials in expansion chain, prevent re-expansion

2. **No Blueprints Found**: Material is a base material
   - Solution: Mark as base material, show special badge, disable expansion

3. **Multiple Blueprints with Same Facility**: E.g., two different Refinery M blueprints
   - Solution: Show additional info in dropdown (run time, output quantity)

4. **API Errors**: Network failure or invalid blueprint
   - Solution: Show error state, allow retry

5. **Large Trees**: 10+ levels deep
   - Solution: Add max depth limit, show "..." for very deep levels

---

## 9. Performance Optimizations

1. **Memoization**: Use `useMemo` for tree calculations
2. **Lazy Loading**: Only fetch blueprints when material is expanded
3. **Debouncing**: Debounce blueprint change events to prevent rapid recalculations
4. **Virtual Scrolling**: If tree gets very large (100+ items)

---

## 10. API Response Examples

### GET /api/industry/types/87909/blueprints
```json
[
  {
    "blueprint_id": 88697,
    "primary_type_id": 87909,
    "primary_type_name": "Armor Patcher SKI-33",
    "run_time": 1,
    "facility_type_id": 87119,
    "facility_name": "Printer S",
    "icon_id": 2582406,
    "icon_file": "res:/ui/texture/icons/Frontier/KeepPixel64/kpatcher2.png"
  }
]
```

### GET /api/industry/efficiency/87909?quantity=10
```json
{
  "type_id": 87909,
  "type_name": "Armor Patcher SKI-33",
  "quantity_needed": 10,
  "blueprint_id": 88697,
  "facility_type_id": 87119,
  "facility_name": "Printer S",
  "run_time": 1,
  "total_production_time": 10,
  "total_base_materials": 150,
  "base_material_breakdown": {
    "78431": 50,
    "78432": 100
  },
  "base_material_names": {
    "78431": "Iron Ore",
    "78432": "Carbon Crystals"
  },
  "children": [
    {
      "type_id": 84210,
      "type_name": "Carbon Weave",
      "quantity_needed": 5,
      "blueprint_id": 88771,
      "facility_type_id": 88063,
      "facility_name": "Refinery M",
      "children": [...]
    }
  ]
}
```

---

## Summary

This implementation plan provides a complete recursive blueprint material expansion system that:
- ✅ Expands materials on click to show required sub-materials
- ✅ Shows dropdown to select which assembly/facility to use
- ✅ Defaults to API-optimal blueprint selection
- ✅ Cascades quantity recalculations recursively down the tree
- ✅ Matches existing visual design patterns
- ✅ Handles edge cases and errors gracefully

The plan leverages existing API endpoints and follows React best practices with hooks and component composition.
