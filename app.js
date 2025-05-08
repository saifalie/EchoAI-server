import express from "express";
import dotenv from 'dotenv'
import { connectDB } from "./src/config/db.js";
import { PORT } from "./secrets.js";
import rootRouter from "./src/routes/index.routes.js";

dotenv.config()

const app =  express()
app.use(express.json())







// app.get('/api',(req,res)=>{
//     res.send('Hello')
// })

app.use('/api',rootRouter)

const startServer = async() =>{
    try {
        await connectDB()
        app.listen(PORT,()=>{
            console.log(`server is running on the port: ${PORT}`);
            
        })
    } catch (error) {
        console.error('Server initialization error: ',error);
        process.exit(1)
            }
}

startServer()

