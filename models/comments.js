var mongoose = require('mongoose');

var commentSchema = new mongoose.Schema({
    body: String,
    author: String,
    upvotes: {
        type: Number,
        default: 0
    },
    created_at: Date,
    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post'
    }
});

//method to upvote the comment
commentSchema.methods.upvote = function(cb) {
    this.upvotes += 1;
    this.save(cb);
};

commentSchema.pre('save', function(next) {
    var currentDate = new Date();

    // if created_at doesn't exist, add to that field
    if (!this.created_at)
        this.created_at = currentDate;

    next();
});

module.exports = mongoose.model('Comment', commentSchema);
