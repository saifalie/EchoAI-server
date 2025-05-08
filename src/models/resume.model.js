import mongoose, { Schema } from "mongoose";


const resumeSchema =  new Schema({
    url:{
        type:String,
        required:true,
    },
    text:{
        type:String,
        required:true
    },
    summary:{
        type:String
    }
})


export const Resume = mongoose.model('Resume',resumeSchema)