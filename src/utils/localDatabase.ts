// Local database service that loads data from JSON files
// This replaces the remote API calls with local data

// Get facility name dynamically from types_full and localization
function getFacilityNameFromId(facilityTypeId: number): string {
  // First check the types_full for the type_name_id
  const typeFull = typesFull?.find((t: any) => t.type_id === facilityTypeId);
  if (typeFull?.type_name_id) {
    const loc = localization.find(l => l.loc_id === typeFull.type_name_id);
    if (loc?.text) {
      return loc.text;
    }
  }
  return `Facility ${facilityTypeId}`;
}

// Facility name and category mappings - ordered by size (portable -> S -> M -> L)
// These are fallback categories only - names are now dynamic
const getFacilityInfo = (typeId: number): { name: string; category: string; sortOrder: number } => {
  // Always try to get the name dynamically first
  const dynamicName = getFacilityNameFromId(typeId);
  
  // Known category mappings (for sorting)
  const categories: Record<number, { category: string; sortOrder: number }> = {
    87162: { category: 'Printers', sortOrder: 1 },
    87119: { category: 'Printers', sortOrder: 2 },
    88067: { category: 'Printers', sortOrder: 3 },
    87120: { category: 'Printers', sortOrder: 4 },
    87161: { category: 'Refineries', sortOrder: 5 },
    88063: { category: 'Refineries', sortOrder: 6 },
    88064: { category: 'Refineries', sortOrder: 7 },
    88069: { category: 'Shipyards', sortOrder: 8 },
    88070: { category: 'Shipyards', sortOrder: 9 },
    88071: { category: 'Shipyards', sortOrder: 10 },
    88068: { category: 'Assembler', sortOrder: 11 },
    91978: { category: 'Nursery', sortOrder: 12 }
  };
  
  const known = categories[typeId];
  if (known) {
    return { name: dynamicName, category: known.category, sortOrder: known.sortOrder };
  }
  
  // Use dynamic name for unknown facilities
  return { name: dynamicName, category: 'Other', sortOrder: 99 };
};

// Data interfaces
interface IndustryFacility {
  facility_type_id: number;
  facility_name: string;
  input_capacity: number;
  output_capacity: number;
}

interface IndustryFacilityBlueprint {
  facility_type_id: number;
  blueprint_id: number;
}

interface IndustryBlueprint {
  blueprint_id: number;
  primary_type_id: number;
  run_time: number;
}

interface IndustryBlueprintInput {
  id: number;
  blueprint_id: number;
  type_id: number;
  quantity: number;
}

interface IndustryBlueprintOutput {
  id: number;
  blueprint_id: number;
  type_id: number;
  quantity: number;
}

interface TypeInfo {
  type_id: number;
  type_name_id: number;
  icon_id: number | null;
  base_price: number;
}

interface Localization {
  loc_id: number;
  text: string;
}

interface Icon {
  icon_id: number;
  icon_file: string;
}

// Cached data
let facilities: IndustryFacility[] = [];
let facilityBlueprints: IndustryFacilityBlueprint[] = [];
let blueprints: IndustryBlueprint[] = [];
let blueprintInputs: IndustryBlueprintInput[] = [];
let blueprintOutputs: IndustryBlueprintOutput[] = [];
let types: TypeInfo[] = [];
let localization: Localization[] = [];
let icons: Icon[] = [];
let typesFull: TypeFull[] = [];
let isLoaded = false;

// Load all data from JSON files
export async function loadLocalDatabase(): Promise<void> {
  if (isLoaded) return;

  console.log('Loading local database...');
  
  const [
    facilitiesData,
    facilityBlueprintsData,
    blueprintsData,
    inputsData,
    outputsData,
    typesData,
    localizationData,
    iconsData,
    typesFullData,
    dogmaAttrsData
  ] = await Promise.all([
    fetch('/data/industry_facilities.json').then(r => r.json()),
    fetch('/data/industry_facility_blueprints.json').then(r => r.json()),
    fetch('/data/industry_blueprints.json').then(r => r.json()),
    fetch('/data/industry_blueprint_inputs.json').then(r => r.json()),
    fetch('/data/industry_blueprint_outputs.json').then(r => r.json()),
    fetch('/data/types.json').then(r => r.json()),
    fetch('/data/localization.json').then(r => r.json()),
    fetch('/data/icons.json').then(r => r.json()),
    fetch('/data/types_full.json').then(r => r.json()),
    fetch('/data/dogma_attributes.json').then(r => r.json())
  ]);

  facilities = facilitiesData;
  facilityBlueprints = facilityBlueprintsData;
  blueprints = blueprintsData;
  blueprintInputs = inputsData;
  blueprintOutputs = outputsData;
  types = typesData;
  localization = localizationData;
  icons = iconsData;
  typesFull = typesFullData;
  dogmaAttributes = dogmaAttrsData;
  
  isLoaded = true;
  console.log('Local database loaded!');
}

// Get type name from type_id
function getTypeName(typeId: number): string {
  const type = types.find(t => t.type_id === typeId);
  if (!type) return `Item ${typeId}`;
  
  const loc = localization.find(l => l.loc_id === type.type_name_id);
  return loc?.text || `Item ${typeId}`;
}

// Get icon file for a type
function getIconFile(typeId: number): string | null {
  const type = types.find(t => t.type_id === typeId);
  if (!type?.icon_id) return null;
  
  const icon = icons.find(i => i.icon_id === type.icon_id);
  return icon?.icon_file || null;
}

// Get icon file by icon_id
function getIconFileById(iconId: number): string | null {
  const icon = icons.find(i => i.icon_id === iconId);
  return icon?.icon_file || null;
}

// API: Get all facilities
export function getFacilities() {
  const result = facilities.map(f => {
    const info = getFacilityInfo(f.facility_type_id);
    const blueprintCount = facilityBlueprints.filter(
      fb => fb.facility_type_id === f.facility_type_id
    ).length;
    
    return {
      facility_type_id: f.facility_type_id,
      facility_name: info.name,
      facility_category: info.category,
      input_capacity: f.input_capacity,
      output_capacity: f.output_capacity,
      blueprint_count: blueprintCount,
      sort_order: info.sortOrder
    };
  }).sort((a, b) => a.sort_order - b.sort_order);

  return result;
}

// API: Get blueprints for a facility
export function getBlueprintsByFacility(facilityTypeId: number) {
  const facilityBPs = facilityBlueprints.filter(
    fb => fb.facility_type_id === facilityTypeId
  );

  return facilityBPs.map(fb => {
    const bp = blueprints.find(b => b.blueprint_id === fb.blueprint_id);
    if (!bp) return null;

    const typeName = getTypeName(bp.primary_type_id);
    const iconFile = getIconFile(bp.primary_type_id);

    return {
      blueprint_id: bp.blueprint_id,
      primary_type_id: bp.primary_type_id,
      primary_type_name: typeName,
      run_time: bp.run_time,
      icon_id: null,
      icon_file: iconFile
    };
  }).filter(Boolean);
}

// API: Get blueprint details
export function getBlueprintDetails(blueprintId: number) {
  const bp = blueprints.find(b => b.blueprint_id === blueprintId);
  if (!bp) return null;

  const inputs = blueprintInputs.filter(i => i.blueprint_id === blueprintId);
  const outputs = blueprintOutputs.filter(o => o.blueprint_id === blueprintId);

  return {
    blueprint_id: bp.blueprint_id,
    primary_type_id: bp.primary_type_id,
    primary_type_name: getTypeName(bp.primary_type_id),
    run_time: bp.run_time,
    max_input_capacity: 0, // Not available in local data
    inputs: inputs.map(i => ({
      type_id: i.type_id,
      type_name: getTypeName(i.type_id),
      quantity: i.quantity,
      icon_id: null,
      icon_file: getIconFile(i.type_id)
    })),
    outputs: outputs.map(o => ({
      type_id: o.type_id,
      type_name: getTypeName(o.type_id),
      quantity: o.quantity,
      icon_id: null,
      icon_file: getIconFile(o.type_id)
    }))
  };
}

// API: Get blueprints by type
export function getBlueprintsByType(typeId: number) {
  const typeBPs = blueprints.filter(b => b.primary_type_id === typeId);

  return typeBPs.map(bp => {
    // Find facilities that have this blueprint
    const facilityBPs = facilityBlueprints.filter(
      fb => fb.blueprint_id === bp.blueprint_id
    );

    return facilityBPs.map(fb => {
      const info = getFacilityInfo(fb.facility_type_id);
      return {
        blueprint_id: bp.blueprint_id,
        primary_type_id: bp.primary_type_id,
        primary_type_name: getTypeName(bp.primary_type_id),
        facility_type_id: fb.facility_type_id,
        facility_name: info.name,
        run_time: bp.run_time,
        icon_id: null,
        icon_file: getIconFile(bp.primary_type_id)
      };
    });
  }).flat();
}

// Check if running in local mode
export function isLocalMode(): boolean {
  // @ts-ignore - VITE_USE_LOCAL_DATA is set in .env
  return import.meta.env.VITE_USE_LOCAL_DATA === 'true';
}

// ============================================
// FITTING DATA - Ships and Modules
// ============================================

// Types with full data (including extra_data JSON)
interface TypeFull {
  type_id: number;
  type_name_id: number;
  icon_id: number | null;
  base_price: number;
  extra_data: string | null;
  published: number;
}

// Dogma attribute
interface DogmaAttribute {
  type_id: number;
  attribute_id: number;
  value: number;
}

let dogmaAttributes: DogmaAttribute[] = [];

// Ship group definitions
const SHIP_GROUPS: Record<number, string> = {
  25: 'SMALL',
  26: 'MEDIUM',
  27: 'LARGE',
  29: 'CAPSULE',
  31: 'SPECIALIZED',
  237: 'FRIGATES',
  419: 'HEAVY',
  420: 'TADES'
};

// Ship size mapping
const SHIP_SIZE_MAP: Record<number, 'S' | 'M' | 'L'> = {
  25: 'S', 29: 'S', 237: 'S',
  31: 'M', 26: 'M',
  419: 'L', 27: 'L', 420: 'L'
};

// Slot type mappings by groupID
const SLOT_TYPE_MAP: Record<number, string> = {
  55: 'high', 1986: 'high', 4765: 'high', 4767: 'high', 4805: 'high', 4806: 'high',
  39: 'mid', 46: 'mid', 52: 'mid', 62: 'mid', 63: 'mid', 65: 'mid', 77: 'mid',
  326: 'mid', 1699: 'mid', 1701: 'mid',
  765: 'low', 1199: 'low', 4747: 'low', 4834: 'low', 4888: 'low',
  4619: 'engine', 4741: 'engine'
};

// Module group IDs
const MODULE_GROUP_IDS = [39, 46, 52, 55, 62, 63, 65, 77, 326, 765, 1199, 1699, 1701, 1986, 4619, 4741, 4747, 4765, 4767, 4805, 4806, 4834, 4888];

// Attribute ID to name mapping - for ships
const SHIP_ATTR_MAP: Record<number, string> = {
  48: 'cpu', 11: 'powergrid', 482: 'capacitor', 4: 'mass', 55: 'capacitorRecharge',
  552: 'signatureRadius', 37: 'maxVelocity', 192: 'maxLockedTargets', 564: 'scanResolution',
  271: 'emDamageResonance', 272: 'explosiveDamageResonance', 273: 'kineticDamageResonance',
  274: 'thermalDamageResonance', 263: 'shieldCapacity', 265: 'armorHP', 9: 'hullHP',
  12: 'lowSlots', 13: 'midSlots', 14: 'hiSlots', 5652: 'engineSlots'
};

// Attribute ID to name mapping - for modules
const MODULE_ATTR_MAP: Record<number, string> = {
  6: 'activationCost',
  11: 'powergridBonus',
  30: 'power',
  50: 'cpu',
  55: 'capacitorRecharge',  // For engines - capacitor recharge in GJ/s
  72: 'shieldCapacity',
  73: 'duration',
  84: 'armorRepairAmount',
  97: 'speedMultiplier',
  128: 'chargeSize',
  134: 'shieldRechargeRateMultiplier',
  216: 'capacitorNeedMultiplier',  // Multiplier to module capacitor usage
  5619: 'rechargePenalty',  // Direct reduction to engine recharge (GJ/s)
  604: 'chargeGroup1',
  984: 'emResistanceBonus',
  985: 'explosiveResistanceBonus',
  986: 'kineticResistanceBonus',
  987: 'thermalResistanceBonus',
  1159: 'armorHP',
  1271: 'maxGroupFitted',
  1298: 'canFitShipGroup01',
  1299: 'canFitShipGroup02',
  1300: 'canFitShipGroup03',
  1301: 'canFitShipGroup04',
  1795: 'reloadTime'
};

function getDogmaAttributes(typeId: number, isModule: boolean = false): Record<string, number> {
  const attrs = dogmaAttributes.filter(a => a.type_id === typeId);
  const result: Record<string, number> = {};
  const attrMap = isModule ? MODULE_ATTR_MAP : SHIP_ATTR_MAP;
  
  attrs.forEach(attr => {
    const name = attrMap[attr.attribute_id];
    if (name) result[name] = attr.value;
  });
  return result;
}

function getShipByTypeId(typeId: number): any {
  const type = typesFull.find(t => t.type_id === typeId);
  if (!type?.extra_data) return null;
  
  try {
    const extraData = JSON.parse(type.extra_data);
    return extraData;
  } catch {
    return null;
  }
}

// Get all ships
export function getAllShips() {
  const ships = typesFull
    .filter(t => t.extra_data && t.published === 1)
    .map(t => {
      try {
        const extraData = JSON.parse(t.extra_data!);
        return {
          typeId: t.type_id,
          typeName: getTypeName(t.type_id),
          groupId: extraData.groupID,
          extraData
        };
      } catch {
        return null;
      }
    })
    .filter((s): s is NonNullable<typeof s> => s !== null && s.groupId !== undefined && s.groupId in SHIP_GROUPS)
    .map(ship => {
      const dogma = getDogmaAttributes(ship.typeId);
      const shipSize = SHIP_SIZE_MAP[ship.groupId] || 'S';
      if (!dogma.engineSlots || dogma.engineSlots === 0) {
        dogma.engineSlots = 1;
      }
      return {
        typeId: ship.typeId,
        typeName: ship.typeName,
        groupId: ship.groupId,
        shipSize,
        ...dogma
      };
    })
    .sort((a, b) => a.groupId - b.groupId);

  return ships;
}

// Get all modules
export function getAllModules() {
  const modules = typesFull
    .filter(t => t.extra_data && t.published === 1)
    .map(t => {
      try {
        const extraData = JSON.parse(t.extra_data!);
        return {
          typeId: t.type_id,
          typeName: getTypeName(t.type_id),
          groupId: extraData.groupID,
          extraData
        };
      } catch {
        return null;
      }
    })
    .filter((m): m is NonNullable<typeof m> => m !== null && m.groupId !== undefined && MODULE_GROUP_IDS.includes(m.groupId))
    .map(m => {
      const dogma = getDogmaAttributes(m.typeId, true);
      const slotType = SLOT_TYPE_MAP[m.groupId] || 'unknown';
      
      // Detect ship size compatibility from name (e.g., "Module Name (S)")
      let shipSize: 'S' | 'M' | 'L' | undefined;
      if (m.typeName.includes('(S)')) shipSize = 'S';
      else if (m.typeName.includes('(M)')) shipSize = 'M';
      else if (m.typeName.includes('(L)')) shipSize = 'L';
      
      return {
        typeId: m.typeId,
        typeName: m.typeName,
        groupId: m.groupId,
        slotType,
        ...(shipSize && { shipSize }),
        ...dogma
      };
    });

  return modules;
}

// Get modules by slot type
export function getModulesBySlotType(slotType: string) {
  const allModules = getAllModules();
  if (slotType === 'all' || !slotType) return allModules;
  return allModules.filter(m => m.slotType === slotType);
}

// ============================================
// PRODUCTION CALCULATOR - Offline Implementation
// ============================================

// Asteroid/ore group IDs for base material detection
// Includes traditional EVE Online asteroid groups and EVE Frontier specific groups
const ASTEROID_GROUP_IDS = [
  // Traditional EVE Online asteroid groups (427-600)
  427, 428, 429, 430, 431, 432, 433, 434, 435, 436, 437, 438, 439, 440, 441, 442, 443, 444, 445, 446, 447, 448, 449, 450, 451, 452, 453, 454, 455, 456, 457, 458, 459, 460, 461, 462, 463, 464, 465, 466, 467, 468, 469, 470, 471, 472, 473, 474, 475, 476, 477, 478, 479, 480, 481, 482, 483, 484, 485, 486, 487, 488, 489, 490, 491, 492, 493, 494, 495, 496, 497, 498, 499, 500, 501, 502, 503, 504, 505, 506, 507, 508, 509, 510, 511, 512, 513, 514, 515, 516, 517, 518, 519, 520, 521, 522, 523, 524, 525, 526, 527, 528, 529, 530, 531, 532, 533, 534, 535, 536, 537, 538, 539, 540, 541, 542, 543, 544, 545, 546, 547, 548, 549, 550, 551, 552, 553, 554, 555, 556, 557, 558, 559, 560, 561, 562, 563, 564, 565, 566, 567, 568, 569, 570, 571, 572, 573, 574, 575, 576, 577, 578, 579, 580, 581, 582, 583, 584, 585, 586, 587, 588, 589, 590, 591, 592, 593, 594, 595, 596, 597, 598, 599, 600,
  // EVE Frontier specific asteroid/mineral groups
  18,    // Raw minerals
  5012,  // Feldspar group
  1950, 1955, 1975, // Other resource groups
  1088, // Additional resource types
];

interface ProductionNode {
  type_id: number;
  type_name: string;
  quantity_needed: number;
  quantity_produced: number;
  excess_quantity: number;
  quantity_from_excess_pool: number;
  blueprint_id: number | null;
  facility_type_id: number | null;
  facility_name: string | null;
  runs_required: number;
  time_seconds: number;
  total_production_time: number;
  total_base_materials: number;
  base_material_breakdown: { [typeId: number]: number };
  base_material_names: { [typeId: number]: string };
  byproducts: Array<{ type_id: number; type_name: string; quantity: number }>;
  alternative_blueprints: number;
  inputs: ProductionNode[];
  is_base_material: boolean;
}

// Extended type with group info from types_full
interface TypeFullWithGroup extends TypeFull {
  groupID?: number;
}

// Check if a type is a base material (asteroid/ore)
function isBaseMaterial(typeId: number): boolean {
  const type = (typesFull as TypeFullWithGroup[] | undefined)?.find(t => t.type_id === typeId);
  if (!type?.extra_data) return false;
  
  try {
    const extraData = JSON.parse(type.extra_data);
    if (extraData.groupID && ASTEROID_GROUP_IDS.includes(extraData.groupID)) {
      return true;
    }
  } catch {
    // Not parseable
  }
  
  // Also check for common asteroid/ore type names as fallback
  const typeName = getTypeName(typeId).toLowerCase();
  const oreIndicators = [
    'asteroid', 'ore', 'veldspar', 'scordite', 'pyroxeres', 'crokite', 'bistot', 'arkonor', 
    'omber', 'kernite', 'jaspet', 'hemorphite', 'hedbergite', 'gneiss', 'dark ochre', 
    'cobaltite', 'eratite', 'aordite', 'monazite', 'xenotime', 'mercoxit', 
    'copper', 'iron', 'silver', 'gold', 'aluminum', 'silicon', 'platinum', 'uranium', 'thorium', 
    'zydrine', 'megacyte', 'morphicite', 'nocticite', 
    'crystal', 'sheet', 'block', 'ingot', 'bar', 'grain', 'shard', 'sulfite', 'troidite',
    'tritanium', 'pyerite', 'mexallon', 'isogen', 'nocxium', 'zydrine', 'megacyte',
    'material', 'compound', 'element', 'mineral', 'resource'
  ];
  return oreIndicators.some(indicator => typeName.includes(indicator));
}

// Type IDs for materials that take 1000x longer to collect (should be penalized in efficiency calculation)
// Both Salvaged Materials and Mummified Clone
const SLOW_MATERIAL_TYPE_IDS = new Set([
  88764, // Salvaged Materials
  88765, // Mummified Clone
]);

// Check if a blueprint uses slow materials (that take 1000x longer to collect)
function blueprintUsesSlowMaterials(bpId: number): boolean {
  const inputs = blueprintInputs.filter(i => i.blueprint_id === bpId);
  return inputs.some(input => SLOW_MATERIAL_TYPE_IDS.has(input.type_id));
}

// Get all blueprints that can produce a given type (using only inputs/outputs tables)
function getBlueprintsForType(typeId: number): Array<{
  blueprint_id: number;
  run_time: number;
  facility_type_id: number;
  facility_name: string;
  output_quantity: number;
}> {
  // Find all blueprints that produce this type (as primary product OR byproduct)
  const outputEntries = blueprintOutputs.filter(o => o.type_id === typeId);
  
  if (outputEntries.length === 0) {
    return [];
  }
  
  const bpIdSet = new Set<number>();
  outputEntries.forEach(o => bpIdSet.add(o.blueprint_id));
  
  const result: Array<{
    blueprint_id: number;
    run_time: number;
    facility_type_id: number;
    facility_name: string;
    output_quantity: number;
  }> = [];
  
  for (const bpId of bpIdSet) {
    const bp = blueprints.find(b => b.blueprint_id === bpId);
    if (!bp) continue;
    
    const facilityBPs = facilityBlueprints.filter(fb => fb.blueprint_id === bpId);
    const outputs = blueprintOutputs.filter(o => o.blueprint_id === bpId);
    const outputForType = outputs.find(o => o.type_id === typeId);
    
    for (const fb of facilityBPs) {
      const info = getFacilityInfo(fb.facility_type_id);
      result.push({
        blueprint_id: bp.blueprint_id,
        run_time: bp.run_time,
        facility_type_id: fb.facility_type_id,
        facility_name: info.name,
        output_quantity: outputForType?.quantity || 1
      });
    }
  }
  
  return result;
}

// Get inputs for a blueprint
function getBlueprintInputs(bpId: number): Array<{ type_id: number; type_name: string; quantity: number }> {
  const inputs = blueprintInputs.filter(i => i.blueprint_id === bpId);
  return inputs.map(i => ({
    type_id: i.type_id,
    type_name: getTypeName(i.type_id),
    quantity: i.quantity
  }));
}

// Get outputs for a blueprint
function getBlueprintOutputsList(bpId: number): Array<{ type_id: number; type_name: string; quantity: number }> {
  const outputs = blueprintOutputs.filter(o => o.blueprint_id === bpId);
  return outputs.map(o => ({
    type_id: o.type_id,
    type_name: getTypeName(o.type_id),
    quantity: o.quantity
  }));
}

// Helper function to calculate base material cost for a single blueprint option
function calculateBlueprintEfficiency(
  bp: { blueprint_id: number; output_quantity: number },
  quantityNeeded: number,
  blueprintOverrides: { [typeId: number]: number },
  visited: Set<number>
): { baseMaterialCost: number; breakdown: { [typeId: number]: number }, names: { [typeId: number]: string } } {
  const outputQty = bp.output_quantity || 1;
  const runsNeeded = Math.ceil(quantityNeeded / outputQty);
  
  const inputs = getBlueprintInputs(bp.blueprint_id);
  
  let totalBaseMaterials = 0;
  const baseMaterialBreakdown: { [typeId: number]: number } = {};
  const baseMaterialNames: { [typeId: number]: string } = {};
  
  // Check if this blueprint uses slow materials (takes 1000x longer to collect)
  const usesSlowMaterials = blueprintUsesSlowMaterials(bp.blueprint_id);
  const slowPenalty = usesSlowMaterials ? 1000 : 1;
  
  for (const input of inputs) {
    const scaledQuantity = input.quantity * runsNeeded;
    
    // Recursively calculate for each input
    const inputBpOptions = getBlueprintsForType(input.type_id);
    
    if (inputBpOptions.length === 0) {
      // This is a base material
      // Apply penalty if this input is a slow material
      const inputPenalty = SLOW_MATERIAL_TYPE_IDS.has(input.type_id) ? 1000 : 1;
      const adjustedQuantity = scaledQuantity * inputPenalty;
      baseMaterialBreakdown[input.type_id] = (baseMaterialBreakdown[input.type_id] || 0) + adjustedQuantity;
      baseMaterialNames[input.type_id] = input.type_name;
      totalBaseMaterials += adjustedQuantity;
    } else {
      // Need to find the best option for this input
      const inputVisited = new Set(visited);
      if (inputVisited.has(input.type_id)) continue; // Avoid cycles
      inputVisited.add(input.type_id);
      
      // Calculate cost for each option and pick the best
      let bestCost = Infinity;
      let bestBreakdown: { [typeId: number]: number } = {};
      let bestNames: { [typeId: number]: string } = {};
      
      for (const inputBp of inputBpOptions) {
        const result = calculateBlueprintEfficiency(
          { blueprint_id: inputBp.blueprint_id, output_quantity: inputBp.output_quantity },
          scaledQuantity,
          blueprintOverrides,
          inputVisited
        );
        
        if (result.baseMaterialCost < bestCost) {
          bestCost = result.baseMaterialCost;
          bestBreakdown = result.breakdown;
          bestNames = result.names;
        }
      }
      
      // If no valid option found, treat as base material
      if (bestCost === Infinity) {
        const inputPenalty = SLOW_MATERIAL_TYPE_IDS.has(input.type_id) ? 1000 : 1;
        const adjustedQuantity = scaledQuantity * inputPenalty;
        baseMaterialBreakdown[input.type_id] = (baseMaterialBreakdown[input.type_id] || 0) + adjustedQuantity;
        baseMaterialNames[input.type_id] = input.type_name;
        totalBaseMaterials += adjustedQuantity;
      } else {
        // Add the best option's breakdown
        for (const [matId, qty] of Object.entries(bestBreakdown)) {
          const mid = parseInt(matId);
          baseMaterialBreakdown[mid] = (baseMaterialBreakdown[mid] || 0) + (qty as number);
        }
        Object.assign(baseMaterialNames, bestNames);
        totalBaseMaterials += bestCost;
      }
    }
  }
  
  // Apply the slow material penalty to the total
  const finalCost = totalBaseMaterials * slowPenalty;
  
  return { baseMaterialCost: finalCost, breakdown: baseMaterialBreakdown, names: baseMaterialNames };
}

// Recursive function to build production tree
function buildProductionTree(
  typeId: number,
  quantityNeeded: number,
  blueprintOverrides: { [typeId: number]: number },
  depth: number = 0,
  visited: Set<number> = new Set()
): ProductionNode | null {
  // Prevent infinite loops
  if (visited.has(typeId)) {
    return null;
  }
  
  const typeName = getTypeName(typeId);
  
  // Get all possible blueprints for this type (blueprints that PRODUCE this type)
  const allBlueprints = getBlueprintsForType(typeId);
  
  // If no blueprints available, this is a base material (must be mined/purchased)
  if (allBlueprints.length === 0) {
    return {
      type_id: typeId,
      type_name: typeName,
      quantity_needed: quantityNeeded,
      quantity_produced: quantityNeeded,
      excess_quantity: 0,
      quantity_from_excess_pool: 0,
      total_base_materials: quantityNeeded,
      runs_required: 1,
      time_seconds: 0,
      total_production_time: 0,
      blueprint_id: null,
      facility_type_id: null,
      facility_name: null,
      base_material_breakdown: { [typeId]: quantityNeeded },
      base_material_names: { [typeId]: typeName },
      byproducts: [],
      alternative_blueprints: 0,
      inputs: [],
      is_base_material: true
    };
  }
  
  // Determine which blueprint to use - select the most efficient one
  let selectedBp = allBlueprints[0];
  
  // If user has explicitly selected a blueprint, use that
  if (blueprintOverrides[typeId]) {
    const override = allBlueprints.find(bp => bp.blueprint_id === blueprintOverrides[typeId]);
    if (override) selectedBp = override;
  } else if (allBlueprints.length > 1) {
    // Auto-select the most efficient blueprint based on base material cost
    let bestCost = Infinity;
    let bestBp = allBlueprints[0];
    const visitedCopy = new Set(visited);
    visitedCopy.add(typeId);
    
    for (const bp of allBlueprints) {
      const efficiency = calculateBlueprintEfficiency(
        { blueprint_id: bp.blueprint_id, output_quantity: bp.output_quantity },
        quantityNeeded,
        blueprintOverrides,
        visitedCopy
      );
      
      if (efficiency.baseMaterialCost < bestCost) {
        bestCost = efficiency.baseMaterialCost;
        bestBp = bp;
      }
    }
    selectedBp = bestBp;
  }
  
  const outputQty = selectedBp.output_quantity || 1;
  const runsNeeded = Math.ceil(quantityNeeded / outputQty);
  const quantityProduced = runsNeeded * outputQty;
  const excessQuantity = quantityProduced - quantityNeeded;
  
  // Get inputs for the selected blueprint
  const inputs = getBlueprintInputs(selectedBp.blueprint_id);
  const outputs = getBlueprintOutputsList(selectedBp.blueprint_id);
  
  // Calculate byproducts (outputs that aren't the primary output)
  const byproducts = outputs.filter(o => o.type_id !== typeId).map(o => ({
    type_id: o.type_id,
    type_name: o.type_name,
    quantity: o.quantity * runsNeeded
  }));
  
  // Recursively build input nodes
  const inputNodes: ProductionNode[] = [];
  const baseMaterialBreakdown: { [typeId: number]: number } = {};
  const baseMaterialNames: { [typeId: number]: string } = {};
  
  // Always recursively process inputs if there are any blueprints - 
  // we want to trace all the way down to raw materials
  if (inputs.length > 0) {
    visited.add(typeId);
    
    for (const input of inputs) {
      // Scale input quantity based on runs needed
      const scaledQuantity = input.quantity * runsNeeded;
      
      const childNode = buildProductionTree(
        input.type_id,
        scaledQuantity,
        blueprintOverrides,
        depth + 1,
        new Set(visited)
      );
      
      if (childNode) {
        inputNodes.push(childNode);
        
        // Aggregate base materials from children
        for (const [baseId, baseQty] of Object.entries(childNode.base_material_breakdown)) {
          const bid = parseInt(baseId);
          baseMaterialBreakdown[bid] = (baseMaterialBreakdown[bid] || 0) + (baseQty as number);
        }
        Object.assign(baseMaterialNames, childNode.base_material_names);
      }
    }
    
    visited.delete(typeId);
  } else {
    // No inputs - this is a raw material (could be an asteroid or bought material)
    baseMaterialBreakdown[typeId] = quantityNeeded;
    baseMaterialNames[typeId] = typeName;
  }
  
  return {
    type_id: typeId,
    type_name: typeName,
    quantity_needed: quantityNeeded,
    quantity_produced: quantityProduced,
    excess_quantity: excessQuantity,
    quantity_from_excess_pool: 0,
    total_base_materials: Object.values(baseMaterialBreakdown).reduce((a, b) => a + b, 0),
    runs_required: runsNeeded,
    time_seconds: selectedBp.run_time,
    total_production_time: selectedBp.run_time,
    blueprint_id: selectedBp.blueprint_id,
    facility_type_id: selectedBp.facility_type_id,
    facility_name: selectedBp.facility_name,
    base_material_breakdown: baseMaterialBreakdown,
    base_material_names: baseMaterialNames,
    byproducts: byproducts,
    alternative_blueprints: allBlueprints.length,
    inputs: inputNodes,
    is_base_material: inputNodes.length === 0
  };
}
export function calculateProduction(
  typeId: number,
  quantity: number,
  blueprintOverrides: { [typeId: number]: number } = {}
): ProductionNode | null {
  if (!typeId || quantity <= 0) return null;
  
  // Ensure database is loaded
  if (!isLoaded) {
    console.warn('Local database not loaded. Call loadLocalDatabase() first.');
    return null;
  }
  
  return buildProductionTree(typeId, quantity, blueprintOverrides);
}

// Get all blueprint options for a type (for the UI selector)
export function getBlueprintOptionsForType(typeId: number) {
  return getBlueprintsForType(typeId);
}

// Aggregate base materials from a production tree
export function aggregateBaseMaterials(node: ProductionNode): { breakdown: { [name: string]: number }, total: number } {
  const breakdown: { [name: string]: number } = {};
  let total = 0;
  
  for (const [typeId, qty] of Object.entries(node.base_material_breakdown)) {
    const tid = parseInt(typeId);
    const name = node.base_material_names[tid] || getTypeName(tid);
    breakdown[name] = (breakdown[name] || 0) + (qty as number);
    total += qty;
  }
  
  // Also aggregate from children
  for (const child of node.inputs) {
    const childAgg = aggregateBaseMaterials(child);
    for (const [name, qty] of Object.entries(childAgg.breakdown)) {
      breakdown[name] = (breakdown[name] || 0) + qty;
    }
  }
  
  return { breakdown, total };
}

// Collect all byproducts from a production tree
export function collectByproducts(node: ProductionNode): Map<string, number> {
  const byproducts = new Map<string, number>();
  
  const traverse = (n: ProductionNode) => {
    for (const bp of n.byproducts) {
      byproducts.set(bp.type_name, (byproducts.get(bp.type_name) || 0) + bp.quantity);
    }
    n.inputs.forEach(traverse);
  };
  
  traverse(node);
  return byproducts;
}
