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
const authToken=require('./(auth)/middleware/authtoken')
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

// Route to handle file upload
app.post('/upload', upload.single('file'), async (req, res) => {
  // Check if file is uploaded
  if (!req.file) {
    return res.status(400).json({
      statusCode: 400,
      message: 'No file uploaded'
    });
  }

  try {
    // Use custom file name if provided, otherwise default to uploaded file's original name
    const customFileName = req.body.fileName || path.parse(req.file.originalname).name;
console.log("custumfilename",customFileName)
    // Upload file to Cloudinary
    const uploadedUrl = await uploadFileToCloudinary(req.file.path, customFileName);
 console.log("uploaded url",uploadedUrl)



 
    const description = req.body.description;
    const downloadUrl = req.body.url;
    console.log("des",description)

    const extractFileId = (downloadUrl) => {
      const regex = /\/d\/([a-zA-Z0-9_-]+)/; // Regular expression to match the file ID
      const match = downloadUrl.match(regex);
      return match ? match[1] : null; // Return the file ID if found, otherwise return null
    };

    const fileId = downloadUrl ? extractFileId(downloadUrl) : null;
    const finalDownloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}` ;
console.log("finalDowl",finalDownloadUrl)
  const newBook = new Book({
      filename: customFileName,
      uploadedUrl: uploadedUrl, // Cloudinary URL
      description,
      finalDownloadUrl: finalDownloadUrl,
    });
    console.log("BOOK",newBook)

    await newBook.save();


    // Return success response
    res.status(200).json({
      statusCode: 200,
      message: 'File uploaded successfully',
      data: { url: uploadedUrl }
    });
  } catch (error) {
    // Handle upload errors
    res.status(500).json({
      statusCode: 500,
      message: 'Error uploading file',
      error: error.message
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
   // Backend Code (Ensure it matches the React client logic)
   app.get("/download/:bookId", authToken,async (req, res) => {
    const { bookId } = req.params;
    try {
      const book = await Book.findById(bookId);
      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }
      if (!book.finalDownloadUrl) {
        return res.status(400).json({ message: "No download URL available for this book" });
      }
      res.json({ downloadUrl: book.finalDownloadUrl });
    } catch (error) {
      console.error("Error fetching book details:", error.message);
      res.status(500).json({ message: "Server error", error: error.message });
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
 