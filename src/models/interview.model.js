import mongoose, { mongo, Schema } from "mongoose";


const interviewSchema = new Schema({
    
    qna:[
        {type:Schema.Types.ObjectId,
        ref:'Qna',
        required:true}
    ],
    resume:{
        type:Schema.Types.ObjectId,
        required:true
    },
    targetCompany:{
        type:String,
        required:true
    },
    targetRole:{
        type:String,
        required:true
    },
    questionsType:{
        type:String,
        required:true
    },
    review:{
        type:Schema.Types.ObjectId,
        ref:'Review'
    }

})

export const Interview = mongoose.model('Interview',interviewSchema)