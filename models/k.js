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

dotenv.config();

const app = express();

// CORS configuration
const allowedOrigins = ['http://localhost:3000', 'http://localhost:3001'];
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use('/api', authRoutes);

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer configuration for image uploads
 

// Helper function to upload images to Cloudinary
 

// Multer configuration for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Temporary storage location
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// Upload route
app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  try {
    const customFileName = req.body.fileName || req.file.originalname;
    const description = req.body.description;
    const downloadUrl = req.body.url;

    const extractFileId = (downloadUrl) => {
      const regex = /\/d\/([a-zA-Z0-9_-]+)/; // Regular expression to match the file ID
      const match = downloadUrl.match(regex);
      return match ? match[1] : null; // Return the file ID if found, otherwise return null
    };

    const fileId = downloadUrl ? extractFileId(downloadUrl) : null;
    const finalDownloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}` ;

    // Upload the file to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: 'image',
      folder: 'books', // Optional folder in Cloudinary
    });

    const newBook = new Book({
      filename: customFileName,
      imageurl: result.secure_url, // Cloudinary URL
      description,
      downloadurl: finalDownloadUrl,
    });

    await newBook.save();

    res.status(200).json({
      message: 'Image uploaded and book details saved successfully',
      data: { url: result.secure_url, bookId: newBook._id },
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Error uploading file', error: error.message });
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
app.get('/download/:bookId', async (req, res) => {
  const { bookId } = req.params;
  try {
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    if (!book.downloadurl) {
      return res.status(400).json({ message: 'No download URL available for this book' });
    }
    res.redirect(book.downloadurl);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Error fetching book details', error: error.message });
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
