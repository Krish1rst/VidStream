const mongoose=require('mongoose')

const videoSchema = new mongoose.Schema({
    filePath: String,
    createdAt: { type: Date, default: Date.now },
    views: { type: Number, default: 0 },
    watch: Date,
    minutes: Number,
    seconds: Number,
    hours: Number,
    title: String,
    description: String,
    tags: [String], 
    category: String,
    thumbnail: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  });




module.exports=mongoose.model('User',userSchema)