import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { config } from './config';
import productRoutes from './routes/product.route';
import productCategoryRoutes from './routes/product_category.route';
import { ErrorMiddleware } from './middleware/error.middleware';

class Server {
  private app: Application;

  constructor() {
    this.app = express();
    this.connectDatabase();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private async connectDatabase(): Promise<void> {
    try {
      await mongoose.connect(config.mongoUri);
      console.log('✅ MongoDB connected successfully');
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      process.exit(1);
    }
  }

  private initializeMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors({ origin: config.corsOrigin, credentials: true }));
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    if (config.nodeEnv === 'development') {
      this.app.use(morgan('dev'));
    }

    this.app.get('/health', (_req, res) => {
      res.status(200).json({
        success: true,
        message: 'Catalog service is healthy',
        timestamp: new Date().toISOString(),
        service: config.serviceName,
      });
    });
  }

  private initializeRoutes(): void {
    this.app.use('/api/catalog/products',   productRoutes);
    this.app.use('/api/catalog/categories', productCategoryRoutes);

    this.app.get('/', (_req, res) => {
      res.status(200).json({
        success: true,
        message: 'Fuudie Catalog Service API',
        version: '1.0.0',
        supportedCategories: ['groceries', 'pharmacy', 'shops'],
        endpoints: {
          health:             '/health',
          products:           '/api/catalog/products',
          productsByStore:    '/api/catalog/products/store/:storeId',
          myProducts:         '/api/catalog/products/me/products',
          productStock:       '/api/catalog/products/:id/stock',
          orderUpdate:        '/api/catalog/products/internal/order-update',
          productCategories:  '/api/catalog/categories',
        },
      });
    });
  }

  private initializeErrorHandling(): void {
    this.app.use(ErrorMiddleware.notFound);
    this.app.use(ErrorMiddleware.handle);
  }

  public start(): void {
    const PORT = config.port;
    this.app.listen(PORT, () => {
      console.log(`
🚀 Catalog Service Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Port:        ${PORT}
🌍 Environment: ${config.nodeEnv}
🗄️  Database:   Connected
📦 Categories:  groceries | pharmacy | shops
📡 API:         http://localhost:${PORT}
🏥 Health:      http://localhost:${PORT}/health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);
    });

    process.on('SIGTERM', this.shutdown.bind(this));
    process.on('SIGINT',  this.shutdown.bind(this));
  }

  private async shutdown(): Promise<void> {
    console.log('\n🛑 Shutting down gracefully...');
    try {
      await mongoose.connection.close();
      console.log('✅ Database connection closed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  }
}

const server = new Server();
server.start();

export default Server;
