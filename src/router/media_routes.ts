// mediaRouter.ts
import express from 'express';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();

// Serve static files from the working directory
router.use(express.static(__dirname));

// Endpoint to list all files in the working directory
router.get('/list', async (req, res) => {
  try {
    // Read the contents of the working directory
    const files = await fs.readdir(__dirname);

    // Filter out directories (if any) and return only files
    const fileList = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(__dirname, file);
        const stats = await fs.stat(filePath);
        return stats.isFile() ? file : null;
      })
    );

    // Remove null values (directories) from the list
    const filteredFileList = fileList.filter((file) => file !== null);

    res.json({ files: filteredFileList });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ error: 'Unable to list files' });
  }
});

export default router;