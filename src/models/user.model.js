import mongoose, { Schema} from "mongoose";


const userSchema = new Schema({
    username:{
        type:String,
        required:true,
        
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    password:{
        type:String,
        required:true
    },
    resume:{
        type:Schema.Types.ObjectId,
        ref:'Resume'
    },
    history:[
        {
            type:Schema.Types.ObjectId,
            ref:'Review'
        }
    ],
    credits:{
        type:Number,
        default:2,
        required:true
    }

})

export const User = mongoose.model('User',userSchema)