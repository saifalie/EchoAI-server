

export const errorMiddleware = (error,req,res,next) =>{
    console.log('errorMiddleware - ',error);

    const statusCode =  error.statusCode || 500
    res.status(statusCode).json({
        message: error.message,
        errors:error.errors
    })
    
}