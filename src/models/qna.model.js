import mongoose, { Schema } from "mongoose";



const qnaSchema = new Schema({
    question:{
        type:String,
        required:true
    },
    answer:{
        type:String,
        required:true
    },
    feedback:{
        type:String
    },
    idealAnswer:{
        type:String
    }
})


export const Qna = mongoose.model('Qna',qnaSchema)