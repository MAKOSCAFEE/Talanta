var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var postSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    title: String,
    link: String,
    upvotes: {
        type: Number,
        default: 0
    },
    created_at: Date,
    comments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment'
    }]
});

//method to upvote the post
postSchema.methods.upvote = function(cb) {
    this.upvotes += 1;
    this.save(cb);



};

postSchema.pre('save', function(next) {
    var currentDate = new Date();

    // if created_at doesn't exist, add to that field
    if (!this.created_at)
        this.created_at = currentDate;

    next();
});

module.exports = mongoose.model('Post', postSchema);
