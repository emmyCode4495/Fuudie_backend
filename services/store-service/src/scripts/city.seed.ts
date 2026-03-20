/**
 * Seed script — initial Fuudie operating cities
 * Usage:  npx ts-node src/scripts/city.seed.ts
 */

import mongoose from 'mongoose';
import { config } from '../config';
import { City } from '../models/city.model';

const SEED_CITIES = [
  {
    name: 'Lagos',
    slug: 'lagos',
    country: 'Nigeria',
    state: 'Lagos State',
    coordinates: { latitude: 6.5244, longitude: 3.3792 },
  },
  {
    name: 'Abuja',
    slug: 'abuja',
    country: 'Nigeria',
    state: 'FCT',
    coordinates: { latitude: 9.0765, longitude: 7.3986 },
  },
  {
    name: 'Port Harcourt',
    slug: 'port-harcourt',
    country: 'Nigeria',
    state: 'Rivers State',
    coordinates: { latitude: 4.8156, longitude: 7.0498 },
  },
  {
    name: 'Ibadan',
    slug: 'ibadan',
    country: 'Nigeria',
    state: 'Oyo State',
    coordinates: { latitude: 7.3775, longitude: 3.9470 },
  },
];

const seed = async () => {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('✅  Connected to MongoDB');

    let created = 0;
    let skipped = 0;

    for (const data of SEED_CITIES) {
      const exists = await City.findOne({ slug: data.slug });
      if (exists) {
        console.log(`⏭️   Skipped (already exists): ${data.name}`);
        skipped++;
        continue;
      }
      await City.create(data);
      console.log(`🌱  Created: ${data.name}, ${data.state}`);
      created++;
    }

    console.log(`\nSeed complete — ${created} created, ${skipped} skipped.`);
  } catch (err) {
    console.error('❌  Seed failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

seed();
