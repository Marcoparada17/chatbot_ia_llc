import express, { Application } from 'express';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import routes from './router/routes';
import { testConnection } from './db/db';
import cors from 'cors'; // Import CORS middleware

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;
app.use(cors()); // Enable CORS for all routes and origins

// Middleware
app.use(bodyParser.json());

// Use Routes
app.use('/', routes);

// Start the server
testConnection().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
});