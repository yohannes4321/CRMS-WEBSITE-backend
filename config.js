    const mongoose=require("mongoose")
async function connectDb() {
    try{
        await mongoose.connect(process.env.MONGO_DB_URI)
         console.log("mongoose connected")
    }
    catch(err){
        console.log(err)
    }
}
module.exports=connectDb;