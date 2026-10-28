import { app } from './app';
import { prisma } from './services/db.service';

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Verify database connection
    await prisma.$connect();
    console.log('✓ Successfully connected to PostgreSQL database.');

    app.listen(PORT, () => {
      console.log(`🚀 Gold Loan Portal API listening on http://localhost:${PORT}`);
      console.log(`📡 Endpoints available under /api/v1/*`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
