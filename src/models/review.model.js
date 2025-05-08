import mongoose, { Schema } from "mongoose";




const reviewSchema = new Schema({
    feedback:{
        type:String,
        required:true
    },
    score:{
        type:String,
        required:true
    },
    compliment:{
        type:String,
        required:true
    },
    strength:[
        {
            type:String,
            required:true
        }
    ],
    improvement:[
        {
            type:String,
            required:true
        }
    ],
    qna:[
        {
            type:Schema.Types.ObjectId,
            ref:'Qna'
        }
    ],
    companyBased:{
        text:{
            type:String,
            required:true

        },
        score:{
            type:Number,
            require:true
        }
    },
    roleBased:{
        text:{
            type:String,
            required:true
        },
        score:{
            type:Number,
            require:true

        }
    },
    oneLiner:{
        type:String,
        required:true
    },
    suggestions:[
    {    title:{
            type:String,
            required:true
        },
        link:{
            type:String,
            required:true
        }}
        
    ]

})


export const Review =  mongoose.model('Review',reviewSchema)