// Required modules
const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');
const fs = require('fs'); // For file system operations
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const Book = require('./models/bookmodel');
const authRoutes = require('./routes/routes');
dotenv.config();
const User = require('./models/usermodel');

const nodemailer = require("nodemailer");
const app = express();
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

// Ensure "uploads" directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileName = `${req.body.fileName || 'default'}-${uniqueSuffix}${path.extname(file.originalname)}`;
    cb(null, fileName);
  },
});
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'), false);
    }
  },
});

// Helper function to upload file to Cloudinary
const uploadFileToCloudinary = async (filePath, fileName) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'pdfs',
      resource_type: 'raw',
      public_id: fileName,
    });
    return result.secure_url;
  } catch (error) {
    const errorMessage = `Cloudinary Upload Error: ${error.message}`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  } finally {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
};

// Helper function to handle MongoDB errors
const handleMongoError = (error) => {
  let errorMessage = 'MongoDB Error: ';
  if (error.name === 'ValidationError') {
    errorMessage += `Validation failed: ${error.message}`;
  } else if (error.code === 11000) {
    errorMessage += 'Duplicate key error. Entry already exists.';
  } else {
    errorMessage += error.message;
  }
  console.error(errorMessage);
  return errorMessage;
};

// Upload route
app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  try {
    const customFileName = req.body.fileName || path.parse(req.file.originalname).name;
    const description = req.body.description;
    const uploadedUrl = await uploadFileToCloudinary(req.file.path, customFileName);

    const newBook = new Book({
      filename: customFileName,
      url: uploadedUrl,
      description,
    });

    await newBook.save();
    res.status(200).json({
      message: 'File uploaded and book details saved successfully',
      data: { url: uploadedUrl, bookId: newBook._id },
    });
  } catch (error) {
    if (error.name && error.name.includes('Mongo')) {
      const mongoError = handleMongoError(error);
      return res.status(500).json({ message: 'Error saving to database', error: mongoError });
    }
    res.status(500).json({ message: 'Error uploading file', error: error.message });
  }
});
app.get('/download/:bookId', async (req, res) => {
  const { bookId } = req.params;
  try {
    // Fetch book from the database
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).send('Book not found');
    }

    const downloadUrl = book.url;
    console.log('Original Cloudinary URL:', downloadUrl);

    // Extract the required part using a regex
    const match = downloadUrl.match(/\/([a-f0-9]{32})\//);
    const extractedPart = match ? match[1] : null;

    if (extractedPart) {
      console.log('Extracted part:', extractedPart);

      // Construct the final download URL
      const finalDownloadUrl = `https://res-console.cloudinary.com/di5zfjqlt/media_explorer_thumbnails/${extractedPart}/download`;
      console.log('Final download URL:', finalDownloadUrl);

      // Redirect the user to the download link
       

      const email="hijhone123@gmail.com"
      const user = await User.findOne({ email });

      if (!user) {
        return res.status(404).json({ message: 'User does not exist. Please sign up first.', success: false });
      }

      // Configure nodemailer
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'alemuyohannes960@gmail.com',
          pass: 'cotg gmba gvbl bfko',
        },
      });

      // Define email options
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Download Your Book',
        text: `Click the following link to download your book: ${finalDownloadUrl}`,
      };

      // Send email
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Error sending email:', error);
          return res.status(500).json({ message: 'Error sending email', success: false });
        } else {
          console.log('Email sent successfully:', info.response);
          res.status(200).json({ message: 'Email sent successfully', success: true });
        }
      });
    } else {
      console.error('Could not extract the required part.');
      res.status(500).send('Could not extract the required part from the URL.');
    }
  } catch (error) {
    console.error('Error handling download request:', error);
    res.status(500).send(`Server error: ${handleMongoError(error)}`);
  }
});



// Get all books route
app.get('/books', async (req, res) => {
  try {
    const books = await Book.find({}).sort({ createdAt: -1 });
    res.status(200).json(books);
  } catch (error) {
    const mongoError = handleMongoError(error);
    res.status(500).json({ message: `Error fetching books: ${mongoError}` });
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
    const errorMessage = `MongoDB connection error: ${error.message}`;
    console.error(errorMessage);
    process.exit(1);
  }
};

// Start the server
const startServer = async () => {
  await connectToMongoDB();
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};
startServer();
