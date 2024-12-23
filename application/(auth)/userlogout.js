async function  userLogout(req,res){

    try{
        res.clearCookie("token")
        res.json({message:"Logout Successfully",success:true,error:false,data:[]})
    }
    catch(err){
        console.error("Logout Failed Please Try Again:", err);
        res.json({
          message: err.message || err,
          error: true,
          success: false,
        });
      }
    }
    module.exports=userLogout