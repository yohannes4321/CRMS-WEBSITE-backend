const mongoose = require("mongoose");

const BookSchema = new mongoose.Schema(
  {
   
    description: {
      type: String,
    },
    filename: {
      type: String, // original/custom file name
    },
    uploadedUrl: {
      type: String, // Cloudinary URL
    },
    finalDownloadUrl: {
      type: String, // processed/final file download link
    },
  },
  { timestamps: true } // automatically adds createdAt & updatedAt
);

const BookModel = mongoose.model("Book", BookSchema);
module.exports = BookModel;
