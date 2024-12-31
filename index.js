// Required modules
const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const Book = require('./models/bookmodel');
const authRoutes = require('./routes/routes');
const authToken = require('./(auth)/middleware/authtoken');
const AdminToken = require('./(auth)/middleware/adminauthtoken');
dotenv.config();

const app = express();

// CORS configuration
const corsOptions = {
  origin: 'https://covenant-reformed-ministry-ethiopia.onrender.com', // This allows requests from any domain
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Specify allowed HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Specify allowed headers
};
app.use(cors(corsOptions))
app.use(express.json());
app.use('/api', authRoutes);

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure multer for custom file naming and temporary storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Specify temporary storage location
  },
  filename: (req, file, cb) => {
    // Use custom naming for files (e.g., user-defined or timestamp)
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileName = `${req.body.fileName || 'default'}-${uniqueSuffix}${path.extname(file.originalname)}`;
    cb(null, fileName);
  }
});
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Accept all photo files
    const allowedPhotoTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
    if (allowedPhotoTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only photo files are allowed!'), false);
    }
  }
});

// Helper function to upload file to Cloudinary
const uploadFileToCloudinary = async (filePath, fileName) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: "pdfs", // Specify folder for PDFs
      resource_type: "raw", // Treat as a raw file
      public_id: fileName // Use custom file name for Cloudinary
    });
    return result.secure_url; // Return the secure URL of the uploaded file
  } catch (error) {
    throw new Error('Error uploading to Cloudinary: ' + error.message);
  } finally {
    // Clean up temporary file
    fs.unlinkSync(filePath);
  }
};

// Upload route
app.post('/upload', AdminToken, upload.single('file'), async (req, res) => {
  // Check if file is uploaded
  if (!req.file) {
    return res.status(400).json({
      statusCode: 400,
      message: 'No file uploaded',
    });
  }

  try {
    // Use custom file name if provided, otherwise default to the uploaded file's original name
    const customFileName = req.body.fileName || path.parse(req.file.originalname).name;
    console.log("customFileName:", customFileName);

    // Upload file to Cloudinary
    const uploadedUrl = await uploadFileToCloudinary(req.file.path, customFileName);
    console.log("uploadedUrl:", uploadedUrl);

    // Extract description and download URL from the request body
    const description = req.body.description;
    const downloadUrl = req.body.url;
    console.log("description:", description);

    // Function to extract the file ID from the Google Drive download URL
    const extractFileId = (downloadUrl) => {
      const regex = /\/d\/([a-zA-Z0-9_-]+)/; // Regular expression to match the file ID
      const match = downloadUrl.match(regex);
      return match ? match[1] : null; // Return the file ID if found, otherwise return null
    };

    // Generate the final download URL
    const fileId = downloadUrl ? extractFileId(downloadUrl) : null;
    const finalDownloadUrl = fileId ? `https://drive.google.com/uc?export=download&id=${fileId}` : null;
    console.log("finalDownloadUrl:", finalDownloadUrl);

    // Create a new Book instance
    const newBook = new Book({
      filename: customFileName,
      uploadedUrl: uploadedUrl, // Cloudinary URL
      description,
      finalDownloadUrl: finalDownloadUrl,
    });
    console.log("Book:", newBook);

    // Save the book to the database
    await newBook.save();

    // Return success response
    res.status(200).json({
      statusCode: 200,
      message: 'File uploaded successfully',
      data: {
        url: uploadedUrl,
      },
    });
  } catch (error) {
    // Handle upload errors
    console.error("Error during file upload:", error.message);
    res.status(500).json({
      statusCode: 500,
      message: 'Error uploading file',
      error: error.message,
    });
  }
});

// Get all books
app.get('/books', async (req, res) => {
  try {
    const books = await Book.find();
    res.json(books);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Error fetching books' });
  }
});

// Download route
app.get("/download/:bookId", authToken, async (req, res) => {
  const { bookId } = req.params;

  try {
    // Find the book by ID
    const book = await Book.findById(bookId);

    // Check if the book exists
    if (!book) {
      return res.status(404).json({
        message: "Book not found",
      });
    }

    // Check if the book has a final download URL
    if (!book.finalDownloadUrl) {
      return res.status(400).json({
        message: "No download URL available for this book",
      });
    }

    // Send response with the download URL
    res.json({
      message: "You are logged in and authorized to download.",
      downloadUrl: book.finalDownloadUrl,
    });
  } catch (error) {
    // Log the error and send a server error response
    console.error("Error fetching book details:", error.message);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
});

// MongoDB connection
const connectToMongoDB = async () => {
  try {
    const mongoURI = process.env.MONGO_DB_URI;
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

// Start the server
const startServer = async () => {
  await connectToMongoDB();
  const PORT = process.env.PORT || 8000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

startServer();
