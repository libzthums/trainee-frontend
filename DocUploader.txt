const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("../db/sql");

// Multer setup for file upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { fileTypes } = req.body;
    
    // Validate fileTypes
    if (!fileTypes || fileTypes.length !== req.files.length) {
      return cb(new Error("Mismatch between files and file types."), null);
    }
    
    const fileType = fileTypes[req.files.indexOf(file)];
    let dirPath;

    // Determine the directory based on the fileType
    switch (fileType) {
      case "pr":
        dirPath = path.join("uploads", "ServicePRDocument");
        break;
      case "po":
        dirPath = path.join("uploads", "ServicePODocument");
        break;
      case "contract":
        dirPath = path.join("uploads", "ServiceDocument");
        break;
      default:
        return cb(new Error("Invalid file type."), null);
    }

    // Create directory if it doesn't exist
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    cb(null, dirPath); // Save file in the appropriate directory based on fileType
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
  }
});

const upload = multer({ storage: storage }); // Initialize multer

// POST route for file upload
router.post("/", upload.array("files", 10), async (req, res) => {
  try {
    // Ensure that files and fileTypes are present
    if (!req.files || req.files.length === 0) {
      return res.status(400).send("No files uploaded.");
    }

    const { fileTypes } = req.body;  // Extract file types from the request body

    if (!fileTypes || fileTypes.length !== req.files.length) {
      return res.status(400).send("Mismatch between files and file types.");
    }

    // Extract file details and insert them into the correct table in MSSQL
    const files = req.files.map((file, index) => ({
      fileName: file.filename,
      filePath: file.path,
      fileType: fileTypes[index]  // Associate each file with its file type
    }));

    // Insert file metadata into MSSQL based on file type
    for (let file of files) {
      let tableName;
      
      switch (file.fileType) {
        case "pr":
          tableName = "ServicePRDocument";
          break;
        case "po":
          tableName = "ServicePODocument";
          break;
        case "contract":
          tableName = "ServiceDocument";
          break;
        default:
          return res.status(400).send("Invalid file type provided.");
      }

      // MSSQL Insert query using parameterized query to prevent SQL injection
      const query = `
        INSERT INTO ${tableName} (DocName, DocPath)
        VALUES (@FileName, @FilePath)
      `;
      
      await db.request()
        .input('FileName', db.NVarChar, file.fileName)
        .input('FilePath', db.NVarChar, file.filePath)
        .query(query); // Use your existing db instance to execute the query
    }

    res.status(200).send("Files uploaded successfully.");
  } catch (error) {
    console.error("Error uploading files:", error);
    res.status(500).send("Error uploading files.");
  }
});

module.exports = router;