import { Request, Response, NextFunction } from 'express';
import { City } from '../models/city.model';

// ── GET /cities ───────────────────────────────────────────────────────────────
// Public. Returns all active cities.
export const getAllCities = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { country } = req.query;
    const filter: Record<string, unknown> = { isActive: true };
    if (country) filter.country = { $regex: new RegExp(country as string, 'i') };

    const cities = await City.find(filter).sort({ name: 1 }).lean();
    res.json({ success: true, count: cities.length, data: cities });
  } catch (err) {
    next(err);
  }
};

// ── GET /cities/all  (admin) ──────────────────────────────────────────────────
export const getAllCitiesAdmin = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const cities = await City.find().sort({ name: 1 }).lean();
    res.json({ success: true, count: cities.length, data: cities });
  } catch (err) {
    next(err);
  }
};

// ── GET /cities/:id ───────────────────────────────────────────────────────────
export const getCityById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const city = await City.findById(req.params.id).lean();
    if (!city) {
      res.status(404).json({ success: false, message: 'City not found' });
      return;
    }
    res.json({ success: true, data: city });
  } catch (err) {
    next(err);
  }
};

// ── GET /cities/slug/:slug ────────────────────────────────────────────────────
export const getCityBySlug = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const city = await City.findOne({ slug: req.params.slug }).lean();
    if (!city) {
      res.status(404).json({ success: false, message: 'City not found' });
      return;
    }
    res.json({ success: true, data: city });
  } catch (err) {
    next(err);
  }
};

// ── GET /cities/:id/categories ────────────────────────────────────────────────
// Returns all active categories available in a city.
// All cities share the same global category list, so this just returns
// active categories with the store count for that city attached.
export const getCityCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const city = await City.findById(req.params.id);
    if (!city) {
      res.status(404).json({ success: false, message: 'City not found' });
      return;
    }

    const { Category } = await import('../models/category.model');
    const { Store }    = await import('../models/store.model');

    const categories = await Category.find({ isActive: true }).sort({ displayOrder: 1 }).lean();

    // Attach per-city store counts to each category
    const enriched = await Promise.all(
      categories.map(async (cat) => {
        const storeCount = await Store.countDocuments({
          city: city._id,
          category: cat._id,
          status: 'active',
        });
        return { ...cat, storeCount };
      })
    );

    res.json({ success: true, cityId: city._id, cityName: city.name, data: enriched });
  } catch (err) {
    next(err);
  }
};

// ── POST /cities  (admin) ─────────────────────────────────────────────────────
export const createCity = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, country, state, coordinates, coverImage } = req.body;

    const exists = await City.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (exists) {
      res.status(409).json({ success: false, message: 'A city with this name already exists' });
      return;
    }

    const city = await City.create({ name, country, state, coordinates, coverImage });
    res.status(201).json({ success: true, message: 'City created', data: city });
  } catch (err) {
    next(err);
  }
};

// ── PUT /cities/:id  (admin) ──────────────────────────────────────────────────
export const updateCity = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, country, state, coordinates, coverImage, isActive } = req.body;

    const city = await City.findById(req.params.id);
    if (!city) {
      res.status(404).json({ success: false, message: 'City not found' });
      return;
    }

    if (name && name !== city.name) {
      const duplicate = await City.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: city._id },
      });
      if (duplicate) {
        res.status(409).json({ success: false, message: 'Another city already uses this name' });
        return;
      }
      city.name = name;
    }

    if (country     !== undefined) city.country     = country;
    if (state       !== undefined) city.state       = state;
    if (coverImage  !== undefined) city.coverImage  = coverImage;
    if (isActive    !== undefined) city.isActive    = isActive;
    if (coordinates !== undefined) city.coordinates = coordinates;

    await city.save();
    res.json({ success: true, message: 'City updated', data: city });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /cities/:id  (admin) ───────────────────────────────────────────────
export const deleteCity = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { Store } = await import('../models/store.model');
    const storeCount = await Store.countDocuments({ city: req.params.id });
    if (storeCount > 0) {
      res.status(409).json({
        success: false,
        message: `Cannot delete: ${storeCount} store(s) are operating in this city`,
      });
      return;
    }

    const city = await City.findByIdAndDelete(req.params.id);
    if (!city) {
      res.status(404).json({ success: false, message: 'City not found' });
      return;
    }

    res.json({ success: true, message: 'City deleted' });
  } catch (err) {
    next(err);
  }
};
