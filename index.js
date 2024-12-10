// Required modules
const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');
const fs = require('fs'); // For file system operations
const path = require('path');
const Book=require("./model/book_Model")
const mongoose = require('mongoose');
const { extractPublicId } =require ('cloudinary-build-url')


 
 
const app = express();
require('dotenv').config();

 
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
    // Accept only PDF files
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

    // Upload file to Cloudinary
    const uploadedUrl = await uploadFileToCloudinary(req.file.path, customFileName);
    const newBook = new Book({
      filename: customFileName,
      url: uploadedUrl // Categories can be passed from frontend
    });

    await newBook.save();
    // Return success response
    res.status(200).json({
      statusCode: 200,
      message: 'File uploaded and book details saved successfully',
      data: { url: uploadedUrl, bookId: newBook._id },
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

 // Route to handle the download URL request
app.get('/download/:bookId', async (req, res) => {
  const { bookId } = req.params;

  try {
    // Find the book by its _id using the bookId from the URL params
    const book = await Book.findOne({ _id: bookId });

    if (!book) {
      return res.status(404).send('Book not found');
    }

    
    const bookUrl = book.url.trim(); // Trim any extra whitespace or newlines

    // Function to extract the unique ID from the Cloudinary URL
    const extractPublicId = (imageURL) => {
      // Split the URL at 'upload/' to isolate the relevant part
      const urlParts = imageURL.split('upload/')[1];

      if (!urlParts) {
        throw new Error('Invalid Cloudinary URL format');
      }

      // Split again by '/' to get the unique ID without folders
      const uniqueId = urlParts.split('/')[0];
      return uniqueId.trim(); // Trim the unique ID to remove unwanted whitespace
    };

    // Extract the unique ID from the book URL
    const uniqueId = extractPublicId(bookUrl);
     // Log the unique ID

    // Construct the Cloudinary media explorer download URL
    const downloadUrl = `https://res-console.cloudinary.com/di5zfjqlt/media_explorer_thumbnails/${uniqueId}/download`.trim();
    

    // Return the download URL in the response
    return res.json({ downloadUrl });

  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).send('Server error');
  }
});


  // Fetch the asset details using Cloudinary API
   
const PORT = process.env.PORT || 3000;
const connectToMongoDB = async () => {
  try {
    // Replace with your MongoDB URI from MongoDB Atlas or local MongoDB instance
    const mongoURI = process.env.MONGO_DB_URI

    // Connect to MongoDB
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);  // Exit process with failure code
  }
};

// Ensure the server only starts once MongoDB connection is established
const startServer = async () => {
  // First connect to MongoDB
  await connectToMongoDB();

  // Then start the server
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};
// Start the server
startServer();
