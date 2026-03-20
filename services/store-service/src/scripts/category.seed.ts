import mongoose from 'mongoose';
import { config } from '../config';
import { Category } from '../models/category.model';

const SEED_CATEGORIES = [
  {
    name: 'Food', slug: 'food',
    description: 'Restaurants, fast food, local eateries, and any establishment that prepares and serves ready-to-eat meals. Choose this if your store primarily sells cooked or prepared food.',
    icon: '🍔', displayOrder: 1,
  },
  {
    name: 'Groceries', slug: 'groceries',
    description: 'Supermarkets, mini-marts, and stores that sell raw ingredients, packaged food items, beverages, and everyday household consumables.',
    icon: '🛒', displayOrder: 2,
  },
  {
    name: 'Shops', slug: 'shops',
    description: 'General retail stores selling non-food products such as clothing, electronics, accessories, home goods, and lifestyle products.',
    icon: '🛍️', displayOrder: 3,
  },
  {
    name: 'Pharmacy & Beauty', slug: 'pharmacy-beauty',
    description: 'Pharmacies, chemists, health stores, cosmetics, and beauty supply shops. Choose this if your store sells medications, health supplements, skincare, or beauty products.',
    icon: '💊', displayOrder: 4,
  },
  {
    name: 'Package Delivery', slug: 'package-delivery',
    description: 'Courier and logistics services that handle pickup and delivery of parcels between locations.',
    icon: '📦', displayOrder: 5, isActive: false,
  },
];

const seed = async () => {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('✅  Connected to MongoDB');
    let created = 0, skipped = 0;
    for (const cat of SEED_CATEGORIES) {
      const exists = await Category.findOne({ slug: cat.slug });
      if (exists) { console.log(`⏭️   Skipping "${cat.name}" — already exists`); skipped++; continue; }
      await Category.create(cat);
      console.log(`✅  Created: ${cat.name}`);
      created++;
    }
    console.log(`\n🌱  Done — ${created} created, ${skipped} skipped`);
    process.exit(0);
  } catch (err) {
    console.error('❌  Seed failed:', err);
    process.exit(1);
  }
};
seed();
