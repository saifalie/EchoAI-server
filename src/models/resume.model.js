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
    },
    technical:{
        type:String,
        required:true
    },
    recommendation:{
        type:String,
        required:true
    }
})


export const Resume = mongoose.model('Resume',resumeSchema)