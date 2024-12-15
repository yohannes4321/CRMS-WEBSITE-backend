const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  filename:{
    type:String,
    required:true,
  },
  description:{
    type:String,
  },
  uploadedUrl: {
    type: String,
    required: true,
  },
  finalDownloadUrl: {
    type: String,
    required: true,
  },

   
   
});

const Book = mongoose.model('Book', bookSchema);

module.exports = Book;
