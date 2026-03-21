import dotenv from 'dotenv';
dotenv.config();

interface Config {
  port:         number;
  nodeEnv:      string;
  mongoUri:     string;
  corsOrigin:   string;
  serviceName:  string;

  // JWT (for decoding forwarded tokens from the gateway)
  jwtSecret:        string;
  jwtRefreshSecret: string;

  // Downstream service URLs
  userServiceUrl:       string;
  storeServiceUrl:      string;   // store-service — validates storeId, delivers fee/min order
  restaurantServiceUrl: string;   // restaurant-service — food menu item validation
  catalogServiceUrl:    string;   // catalog-service — product validation (grocery/pharmacy/shops)

  // Pricing
  taxRate:            number;   // e.g. 0.075 = 7.5% VAT
  serviceFeeRate:     number;   // e.g. 0.02  = 2% platform fee
}

export const config: Config = {
  port:        parseInt(process.env.PORT || '3003', 10),
  nodeEnv:     process.env.NODE_ENV     || 'development',
  mongoUri:    process.env.MONGO_URI    || 'mongodb://localhost:27017/fuudie-order-service',
  corsOrigin:  process.env.CORS_ORIGIN  || '*',
  serviceName: 'order-service',

  jwtSecret:        process.env.JWT_SECRET         || 'change_me_in_production',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'change_me_in_production_refresh',

  userServiceUrl:       process.env.USER_SERVICE_URL       || 'http://localhost:3001',
  storeServiceUrl:      process.env.STORE_SERVICE_URL      || 'http://localhost:3004',
  restaurantServiceUrl: process.env.RESTAURANT_SERVICE_URL || 'http://localhost:3002',
  catalogServiceUrl:    process.env.CATALOG_SERVICE_URL    || 'http://localhost:3005',

  taxRate:        parseFloat(process.env.TAX_RATE         || '0.075'),
  serviceFeeRate: parseFloat(process.env.SERVICE_FEE_RATE || '0.02'),
};