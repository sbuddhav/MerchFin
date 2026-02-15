import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Try multiple paths to find .env (tsx changes __dirname behavior)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import authRoutes from './routes/auth.routes';
import hierarchyRoutes from './routes/hierarchy.routes';
import measuresRoutes from './routes/measures.routes';
import timePeriodsRoutes from './routes/timePeriods.routes';
import gridDataRoutes from './routes/gridData.routes';
import usersRoutes from './routes/users.routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/hierarchy', hierarchyRoutes);
app.use('/api/measures', measuresRoutes);
app.use('/api/time-periods', timePeriodsRoutes);
app.use('/api/grid', gridDataRoutes);
app.use('/api/users', usersRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const clientDistPath = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    } else {
      next();
    }
  });
}

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`MerchFin server running on port ${PORT}`);
});

export default app;
