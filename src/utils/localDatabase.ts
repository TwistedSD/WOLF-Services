// Local database service that loads data from JSON files
// This replaces the remote API calls with local data

// Facility name and category mappings - ordered by size (portable -> S -> M -> L)
const getFacilityInfo = (typeId: number): { name: string; category: string; sortOrder: number } => {
  const facilities: Record<number, { name: string; category: string; sortOrder: number }> = {
    // Printers - ordered by size
    87162: { name: 'Portable Printer', category: 'Printers', sortOrder: 1 },
    87119: { name: 'Printer S', category: 'Printers', sortOrder: 2 },
    88067: { name: 'Printer M', category: 'Printers', sortOrder: 3 },
    87120: { name: 'Printer L', category: 'Printers', sortOrder: 4 },

    // Refineries - ordered by size
    87161: { name: 'Portable Refinery', category: 'Refineries', sortOrder: 5 },
    88063: { name: 'Refinery M', category: 'Refineries', sortOrder: 6 },
    88064: { name: 'Refinery L', category: 'Refineries', sortOrder: 7 },

    // Shipyards - ordered by size
    88069: { name: 'Shipyard S', category: 'Shipyards', sortOrder: 8 },
    88070: { name: 'Shipyard M', category: 'Shipyards', sortOrder: 9 },
    88071: { name: 'Shipyard L', category: 'Shipyards', sortOrder: 10 },

    // Assembler
    88068: { name: 'Assembler', category: 'Assembler', sortOrder: 11 }
  };
  return facilities[typeId] || { name: `Facility ${typeId}`, category: 'Other', sortOrder: 99 };
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

let typesFull: TypeFull[] = [];
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
  48: 'cpu', 11: 'powergrid', 482: 'capacitor', 4: 'mass', 479: 'capacitorRecharge',
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
  72: 'shieldCapacity',
  73: 'duration',
  84: 'armorRepairAmount',
  97: 'speedMultiplier',
  128: 'chargeSize',
  134: 'shieldRechargeRateMultiplier',
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
