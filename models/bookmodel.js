const mongoose=require("mongoose")
const BookSchema=new mongoose.Schema({
    fullname:String,
    description:{
        type:String,
        
         
    }
     

    },
     
    

{timestamps:true})
const BookModel=mongoose.model("Book",BookSchema)
module.exports=BookModel