import express, { Application } from 'express';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import bot_routes from './router/bot_routes';
import media_routes from './router/media_routes';
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
app.use('/', bot_routes);

// Serve static files from the working directory (/usr/src/app)
app.use('/media', media_routes);

// Start the server
testConnection().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
});