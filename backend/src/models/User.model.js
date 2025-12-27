import mongoose from "mongoose";

const userschema=new mongoose.Schema({
    name:{
        type:String,
        required:true,
        trim:true,
    },
    username:{
        type:String,
        required:true,
        unique:true,
        lowecase:true,
        trim:true,
        minlength:6,
    },

    email:{
        type:String,
        required:true,
        unique:true,
        lowecase:true,
        trim:true,

    },
    password:{
        type:String,
        required:true,
        minlength:6,
    },

},{timestamps:true});

const newuser=mongoose.model("User",userschema);

export default newuser;