import { app } from './app.js';
import { env } from './config/env.js';
import { initDatabase } from './config/database.js';
import { logger } from './config/logger.js';
import { seedDatabase } from '../prisma/seed.js';

async function bootstrap() {
  try {
    await initDatabase();
    await seedDatabase();

    app.listen(env.PORT, () => {
      logger.info(
        {
          port: env.PORT,
          apiPrefix: env.API_PREFIX,
          env: env.NODE_ENV,
        },
        'Servidor Backend do Playbook de Vendas Quest em execução.'
      );
    });
  } catch (err) {
    logger.fatal({ err }, 'Falha crítica ao iniciar o servidor Backend.');
    process.exit(1);
  }
}

bootstrap();

