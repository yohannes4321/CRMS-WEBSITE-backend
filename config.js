    const mongoose=require("mongoose")
async function connectDb() {
    try{
        await mongoose.connect("mongodb+srv://alemuyohannes960:Ethiopia32100@cluster0.qd8t5as.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0")
         console.log("mongoose connected")
    }
    catch(err){
        console.log(err)
    }
}
module.exports=connectDb;