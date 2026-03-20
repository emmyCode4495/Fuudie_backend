/**
 * This seed creates default product sub-categories for each store type.
 * These are TEMPLATES — in production, store owners create their own
 * categories. This seed is useful for dev/demo environments.
 *
 * Run: npm run seed:categories
 */

import mongoose from 'mongoose';
import { config } from '../config';
import { ProductCategory } from '../models/product_category.model';

const DEMO_STORE_ID = 'demo-store-id'; // replace with a real storeId when running

const SEED_DATA: { storeCategory: 'groceries' | 'pharmacy' | 'shops'; categories: { name: string; description: string; displayOrder: number }[] }[] = [
  {
    storeCategory: 'groceries',
    categories: [
      { name: 'Fresh Produce',          description: 'Fruits, vegetables, and herbs',                                     displayOrder: 1 },
      { name: 'Dairy & Eggs',           description: 'Milk, cheese, butter, yoghurt, and eggs',                           displayOrder: 2 },
      { name: 'Bread & Bakery',         description: 'Bread, cakes, pastries, and baked goods',                           displayOrder: 3 },
      { name: 'Meat & Seafood',         description: 'Fresh and frozen meat, poultry, and seafood',                       displayOrder: 4 },
      { name: 'Beverages',              description: 'Water, soft drinks, juices, and energy drinks',                     displayOrder: 5 },
      { name: 'Snacks & Confectionery', description: 'Crisps, biscuits, chocolates, and sweets',                         displayOrder: 6 },
      { name: 'Household & Cleaning',   description: 'Cleaning products, detergents, and household essentials',           displayOrder: 7 },
      { name: 'Frozen Foods',           description: 'Ice cream, frozen meals, and frozen vegetables',                    displayOrder: 8 },
    ],
  },
  {
    storeCategory: 'pharmacy',
    categories: [
      { name: 'Prescription Medicines', description: 'Medications that require a valid prescription',                     displayOrder: 1 },
      { name: 'Over-the-Counter',       description: 'Pain relief, cold & flu, allergy, and digestive remedies',          displayOrder: 2 },
      { name: 'Vitamins & Supplements', description: 'Multivitamins, minerals, and dietary supplements',                  displayOrder: 3 },
      { name: 'Skincare',               description: 'Moisturisers, sunscreen, serums, and skin treatments',              displayOrder: 4 },
      { name: 'Hair Care',              description: 'Shampoos, conditioners, hair treatments, and styling products',     displayOrder: 5 },
      { name: 'Baby & Child Care',      description: 'Nappies, baby food, formula, and child health products',            displayOrder: 6 },
      { name: 'Medical Devices',        description: 'Blood pressure monitors, thermometers, and first-aid supplies',     displayOrder: 7 },
      { name: 'Cosmetics & Makeup',     description: 'Foundation, lipstick, mascara, and beauty accessories',             displayOrder: 8 },
    ],
  },
  {
    storeCategory: 'shops',
    categories: [
      { name: 'Clothing & Apparel',     description: 'Men, women, and children clothing and accessories',                 displayOrder: 1 },
      { name: 'Electronics',            description: 'Phones, accessories, gadgets, and small electronics',               displayOrder: 2 },
      { name: 'Home & Kitchen',         description: 'Cookware, appliances, home décor, and furniture accessories',       displayOrder: 3 },
      { name: 'Books & Stationery',     description: 'Books, notebooks, pens, and office supplies',                      displayOrder: 4 },
      { name: 'Sports & Fitness',       description: 'Sports equipment, activewear, and fitness accessories',             displayOrder: 5 },
      { name: 'Toys & Games',           description: 'Toys, board games, puzzles, and children activities',              displayOrder: 6 },
      { name: 'Bags & Luggage',         description: 'Handbags, backpacks, travel bags, and wallets',                    displayOrder: 7 },
    ],
  },
];

const seed = async () => {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('✅  Connected to MongoDB');

    let created = 0;
    let skipped = 0;

    for (const group of SEED_DATA) {
      console.log(`\n📦  ${group.storeCategory.toUpperCase()}`);
      for (const cat of group.categories) {
        const exists = await ProductCategory.findOne({
          name: cat.name,
          storeCategory: group.storeCategory,
          storeId: DEMO_STORE_ID,
        });

        if (exists) {
          console.log(`   ⏭️   Skipping "${cat.name}"`);
          skipped++;
          continue;
        }

        await ProductCategory.create({
          ...cat,
          storeCategory: group.storeCategory,
          storeId: DEMO_STORE_ID,
        });
        console.log(`   ✅  Created "${cat.name}"`);
        created++;
      }
    }

    console.log(`\n🌱  Seed complete — ${created} created, ${skipped} skipped`);
    process.exit(0);
  } catch (err) {
    console.error('❌  Seed failed:', err);
    process.exit(1);
  }
};

seed();
