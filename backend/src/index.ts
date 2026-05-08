import 'reflect-metadata';
import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import { createServer } from 'http';
import { config } from 'dotenv';
import { Server } from 'socket.io';
import morgan from 'morgan';
import cors from 'cors';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import { GameEngine } from './services/game-engine.service.js';
import { logger } from './utils/logger.js';
import { createRoundsRouter } from './routes/rounds.js';
import leaderboardRouter from './routes/leaderboard.js';
import historyRouter from './routes/history.js';
import adminRouter from './routes/admin.js';
import gameAdminRouter from './routes/game-admin.js';
import authRouter from './routes/auth.js';
import freeBetsRouter from './routes/free-bets.js';
import usersRouter from './routes/users.js';
import auditLogsRouter from './routes/audit-logs.js';
import verifyRouter from './routes/verify.js';
import { AppDataSource } from './config/database.js';

config();

const app: Express = express();
const port = process.env.PORT || 3001;

// Build CORS origins dynamically
const corsOrigins: (string | RegExp)[] = [
  'https://aviator-sand.vercel.app',
  'http://localhost:3000',
  'https://aviator.farcast.app'
];

// Add ngrok URLs from environment or hardcoded
if (process.env.NGROK_URL) {
  corsOrigins.push(process.env.NGROK_URL);
}
corsOrigins.push(/^https:\/\/.*\.ngrok(?:-free)?\.app$/);

// Middleware
app.use(cors({
  origin: corsOrigins as (string | RegExp)[],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Secret', 'x-admin-secret'],
  credentials: true,
  exposedHeaders: ['Content-Type']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ message: 'Aviator Backend API is running' });
});

// GameEngine setup
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: corsOrigins as (string | RegExp)[],
    methods: ['GET', 'POST'],
    credentials: true
  }
});
const gameEngine = new GameEngine(io);

// Routes with dependency injection
app.use('/api/auth', authRouter);
app.use('/api/verify', verifyRouter);
app.use('/api/rounds', createRoundsRouter(gameEngine));
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/history', historyRouter);
app.use('/api/admin', adminRouter);
app.use('/api/admin/game', gameAdminRouter);
app.use('/api/audit-logs', auditLogsRouter);
app.use('/api/free-bets', freeBetsRouter);
app.use('/api/users', usersRouter);

io.on('connection', (socket) => {
  logger.info('New WebSocket connection');

  socket.on('message', (message: string) => {
    logger.info(`Received: ${message}`);
    // Echo the message back to the client
    socket.emit(`Server received: ${message}`);
  });

  socket.on('close', () => {
    logger.info('Client disconnected');
  });
});

// Initialize DB and start server
(async () => {
  try {
    await AppDataSource.initialize();
    logger.info('Database connected');
    // Start game engine
    logger.info('Database connected');
    // Start game engine
    await gameEngine.start();
    server.listen(port, () => {
      logger.info(`Server is running on http://localhost:${port}`);
    });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.stack || err.message : JSON.stringify(err);
    logger.error(`Failed to initialize database: ${errorMessage}`);
    if (String(errorMessage).includes('does not exist')) {
      logger.error('Database not found.', errorMessage);
    }
    process.exit(1);
  }
})();

// 404 handler for unhandled routes
app.use(notFoundHandler);

app.use(errorHandler);

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Uncaught Exception: ${err.message}`, {
    stack: err.stack,
  });
  res.status(500).json({ error: 'Something went wrong!' });
  next();
});

process.on('unhandledRejection', (reason: Error) => {
  logger.error(`Unhandled Rejection: ${reason?.message || reason}`, {
    stack: reason?.stack,
  });
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err: Error) => {
  logger.error(`Uncaught Exception: ${err.message}`, {
    stack: err.stack,
  });
  server.close(() => process.exit(1));
});

export default app;
