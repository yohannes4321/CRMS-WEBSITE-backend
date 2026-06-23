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
const authRoutes = require('./routes');
//const authToken = require('./(auth)/middleware/authtoken');
//const AdminToken = require('./(auth)/middleware/adminauthtoken');
dotenv.config();

const app = express();

// CORS configuration
const corsOptions = {
  origin: ['https://covenant-reformed-ministry-ethiopia.vercel.app', process.env.FRONTEND_URL || 'http://localhost:3000'], // Allow production and local frontend via env
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Specify allowed HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Specify allowed headers
};
app.use(cors(corsOptions))
app.use(express.json());
app.use('/api', authRoutes);

// Cloudinary configuration
cloudinary.config({
  cloud_name: "di5zfjqlt",
  api_key: "923363429458227",
  api_secret: "oqaNDaluW1CD-Zrk754j-s-9oLc",
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
    // Accept photo files and PDFs
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only photo and PDF files are allowed!'), false);
    }
  }
});

// Helper function to upload file to Cloudinary (Commented out since we are using local storage)
/*
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
*/

// Serve the 'uploads' folder statically so files can be accessed via URL
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Upload route: handles both a photo (cover image) and a file (book PDF)
app.post('/upload', upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'file', maxCount: 1 }]), async (req, res) => {
  try {
    const customFileName = req.body.fileName || (req.files['file'] ? path.parse(req.files['file'][0].originalname).name : 'default');
    console.log("customFileName:", customFileName);

    let localPhotoUrl = null;
    let localFileUrl = null;

    // Process uploaded photo (if any)
    if (req.files && req.files['photo'] && req.files['photo'].length > 0) {
      localPhotoUrl = `${req.protocol}://${req.get('host')}/uploads/${req.files['photo'][0].filename}`;
      console.log("Uploaded Photo URL (Local):", localPhotoUrl);
    }

    // Process uploaded file (if any)
    if (req.files && req.files['file'] && req.files['file'].length > 0) {
      localFileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.files['file'][0].filename}`;
      console.log("Uploaded File URL (Local):", localFileUrl);
    }

    // Extract description from the request body
    const description = req.body.description;
    console.log("description:", description);

    // Create a new Book instance
    const newBook = new Book({
      filename: customFileName,
      uploadedUrl: localPhotoUrl, // Store the local server URL for the cover photo
      description,
      finalDownloadUrl: localFileUrl, // Store the local server URL for the PDF/file download
    });
    console.log("Book:", newBook);

    // Save the book to the database
    await newBook.save();

    // Return success response
    res.status(200).json({
      statusCode: 200,
      message: 'Files uploaded successfully',
      data: {
        photoUrl: localPhotoUrl,
        fileUrl: localFileUrl,
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
    console.log(books)
    res.json(books);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Error fetching books' });
  }
});

// Delete a book
app.delete('/books/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedBook = await Book.findByIdAndDelete(id);
    if (!deletedBook) {
      return res.status(404).json({ message: 'Book not found' });
    }
    
    // Optionally delete the local files here using fs.unlinkSync if needed
    // if (deletedBook.uploadedUrl) ...
    // if (deletedBook.finalDownloadUrl) ...

    res.status(200).json({ message: 'Book deleted successfully' });
  } catch (error) {
    console.error('Error deleting book:', error.message);
    res.status(500).json({ message: 'Error deleting book' });
  }
});

// Download route
// Example download route
app.get('/download/:bookId', async (req, res) => {
  try {
    const { bookId } = req.params;

    // Fetch the book from DB
    const book = await Book.findById(bookId);

    if (!book || !book.finalDownloadUrl) {
      return res.status(404).send('Download link not found');
    }

    // Redirect the browser directly to the final download link
    res.redirect(book.finalDownloadUrl);

  } catch (err) {
    console.error(err);
    res.status(500).send('Server error while downloading');
  }
});



// MongoDB connection
const connectToMongoDB = async () => {
  try {
    const mongoURI = process.env.MONGO_DB_URI || "mongodb+srv://yohannesalemu_db_user:Y6NRhJc01XGpDP8h@cluster0.jfwhl7l.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
    await mongoose.connect(mongoURI);
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
