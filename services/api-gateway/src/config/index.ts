// import dotenv from 'dotenv';

// dotenv.config();

// interface Config {
//   port: number;
//   nodeEnv: string;
//   userServiceUrl: string;
//   restaurantServiceUrl: string;
//   orderServiceUrl: string;
//   corsOrigin: string;
//   jwtSecret: string;
//   rateLimitWindowMs: number;
//   rateLimitMaxRequests: number;
// }

// export const config: Config = {
//   port: parseInt(process.env.PORT || '3000', 10),
//   nodeEnv: process.env.NODE_ENV || 'development',
//   userServiceUrl: process.env.USER_SERVICE_URL || 'http://localhost:3001',
//   restaurantServiceUrl: process.env.RESTAURANT_SERVICE_URL || 'http://localhost:3002',
//   orderServiceUrl: process.env.ORDER_SERVICE_URL || 'http://localhost:3003',
//   corsOrigin: process.env.CORS_ORIGIN || '*',
//   jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
//   rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
//   rateLimitMaxRequests: 100,
// };

import dotenv from 'dotenv';
dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  // Services
  userServiceUrl: string;
  restaurantServiceUrl: string;
  orderServiceUrl: string;
  storeServiceUrl: string;
  catalogServiceUrl: string;
  // Security
  corsOrigin: string;
  jwtSecret: string;
  // Rate limiting
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  // Services
  userServiceUrl:       process.env.USER_SERVICE_URL        || 'http://localhost:3001',
  restaurantServiceUrl: process.env.RESTAURANT_SERVICE_URL  || 'http://localhost:3002',
  orderServiceUrl:      process.env.ORDER_SERVICE_URL       || 'http://localhost:3003',
  storeServiceUrl:      process.env.STORE_SERVICE_URL       || 'http://localhost:3004',
  catalogServiceUrl:    process.env.CATALOG_SERVICE_URL     || 'http://localhost:3005',
  // Security
  corsOrigin: process.env.CORS_ORIGIN || '*',
  jwtSecret:  process.env.JWT_SECRET  || 'your-secret-key',
  // Rate limiting
  rateLimitWindowMs:   15 * 60 * 1000,
  rateLimitMaxRequests: 100,
};