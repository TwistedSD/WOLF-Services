const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');

// Database path - user can override with environment variable
// Default looks for database in: ../../data/frontier.db (relative to WOLF-Website folder)
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../WOLF-API/data/frontier.db');
const outputDir = path.join(__dirname, '../public/data');

console.log('Database path:', DB_PATH);
console.log('Exporting data to:', outputDir);

const db = new Database(DB_PATH, { readonly: true });

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Export industry_facilities
console.log('Exporting industry_facilities...');
const facilities = db.prepare('SELECT * FROM industry_facilities').all();
fs.writeFileSync(
  path.join(outputDir, 'industry_facilities.json'),
  JSON.stringify(facilities, null, 2)
);
console.log(`  Exported ${facilities.length} facilities`);

// Export industry_facility_blueprints
console.log('Exporting industry_facility_blueprints...');
const facilityBlueprints = db.prepare('SELECT * FROM industry_facility_blueprints').all();
fs.writeFileSync(
  path.join(outputDir, 'industry_facility_blueprints.json'),
  JSON.stringify(facilityBlueprints, null, 2)
);
console.log(`  Exported ${facilityBlueprints.length} facility blueprints`);

// Export industry_blueprints
console.log('Exporting industry_blueprints...');
const blueprints = db.prepare('SELECT * FROM industry_blueprints').all();
fs.writeFileSync(
  path.join(outputDir, 'industry_blueprints.json'),
  JSON.stringify(blueprints, null, 2)
);
console.log(`  Exported ${blueprints.length} blueprints`);

// Export industry_blueprint_inputs
console.log('Exporting industry_blueprint_inputs...');
const materials = db.prepare('SELECT * FROM industry_blueprint_inputs').all();
fs.writeFileSync(
  path.join(outputDir, 'industry_blueprint_inputs.json'),
  JSON.stringify(materials, null, 2)
);
console.log(`  Exported ${materials.length} materials`);

// Export industry_blueprint_outputs
console.log('Exporting industry_blueprint_outputs...');
const products = db.prepare('SELECT * FROM industry_blueprint_outputs').all();
fs.writeFileSync(
  path.join(outputDir, 'industry_blueprint_outputs.json'),
  JSON.stringify(products, null, 2)
);
console.log(`  Exported ${products.length} products`);

// Export types (basic - for industry data)
console.log('Exporting types...');
const types = db.prepare('SELECT type_id, type_name_id, icon_id, base_price FROM types').all();
fs.writeFileSync(
  path.join(outputDir, 'types.json'),
  JSON.stringify(types, null, 2)
);
console.log(`  Exported ${types.length} types`);

// Export types (full with extra_data for fitting)
console.log('Exporting types (full)...');
const typesFull = db.prepare('SELECT type_id, type_name_id, icon_id, base_price, extra_data FROM types').all();
fs.writeFileSync(
  path.join(outputDir, 'types_full.json'),
  JSON.stringify(typesFull, null, 2)
);
console.log(`  Exported ${typesFull.length} types (full)`);

// Export dogma_attributes
console.log('Exporting dogma_attributes...');
const dogmaAttrs = db.prepare('SELECT * FROM dogma_attributes').all();
fs.writeFileSync(
  path.join(outputDir, 'dogma_attributes.json'),
  JSON.stringify(dogmaAttrs, null, 2)
);
console.log(`  Exported ${dogmaAttrs.length} dogma attributes`);

// Export localization
console.log('Exporting localization...');
const localization = db.prepare('SELECT * FROM localization').all();
fs.writeFileSync(
  path.join(outputDir, 'localization.json'),
  JSON.stringify(localization, null, 2)
);
console.log(`  Exported ${localization.length} localization entries`);

// Export icons
console.log('Exporting icons...');
const icons = db.prepare('SELECT * FROM icons').all();
fs.writeFileSync(
  path.join(outputDir, 'icons.json'),
  JSON.stringify(icons, null, 2)
);
console.log(`  Exported ${icons.length} icons`);

console.log('Done exporting data!');
