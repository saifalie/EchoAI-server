import mongoose from "mongoose";
import { DB_URL } from "../../secrets.js";

export const connectDB = async () =>{
    try {

        const connectionInstance =  await mongoose.connect(`${DB_URL}`)
        console.log(`\n MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`);

        
    } catch (error) {
        console.log(`MongoDB connection failed error: ${error}`);

        process.exit(1)
        
    }
}