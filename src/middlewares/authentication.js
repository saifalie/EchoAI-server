

const auth =  (req,res,next) =>{
   try {
    console.log('auth middleware');
    
     const userId = req.headers.authorization
     console.log('userid middle',userId);
     

     if(!userId){
        return res.status(401).json({
            error: 'No user-id provided in Authorization header'
        })
     }
 
     req.user = {id:userId}
     next()
   } catch (error) {
    throw new Error('Authentication Error: ',error)
   }
}

export default auth