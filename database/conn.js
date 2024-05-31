import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config()

mongoose.connect(process.env.MONGO_DB)
.then(()=>{
    console.log("connection to the database has been established")
}).catch((err)=>{
    throw err;
})
