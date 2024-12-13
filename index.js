// Required modules
const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Initialize environment variables
dotenv.config();
const app = express();

// Initialize Cloudinary with credentials
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configure multer for custom file naming and temporary storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Temporary storage location
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileName = `${req.body.fileName || 'default'}-${uniqueSuffix}${path.extname(file.originalname)}`;
    cb(null, fileName);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'), false);
    }
  }
});

// Helper function to upload file to Cloudinary
const uploadFileToCloudinary = async (filePath, fileName) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: "pdfs",
      resource_type: "raw",
      public_id: fileName
    });
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary Upload Error:', error.message);
    throw new Error('Error uploading to Cloudinary: ' + error.message);
  } finally {
    // Delete the temporary file after uploading
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error('Error deleting file:', err.message);
      }
    }
  }
};

// Route to handle file upload
app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      statusCode: 400,
      message: 'No file uploaded'
    });
  }

  try {
    const customFileName = req.body.fileName || path.parse(req.file.originalname).name;
    const uploadedUrl = await uploadFileToCloudinary(req.file.path, customFileName);

    res.status(200).json({
      statusCode: 200,
      message: 'File uploaded successfully',
      data: { url: uploadedUrl }
    });
  } catch (error) {
    res.status(500).json({
      statusCode: 500,
      message: 'Error uploading file',
      error: error.message
    });
  }
});

// Route to handle file download
app.get('/download', (req, res) => {
  const fileId = req.query.fileId;

  if (!fileId) {
    return res.status(400).json({
      statusCode: 400,
      message: 'Public ID (fileId) not provided in query'
    });
  }

  const downloadUrl = cloudinary.url(fileId, {
    resource_type: 'raw',
    secure: true,
    flags: 'attachment'
  });

  res.redirect(downloadUrl);
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
