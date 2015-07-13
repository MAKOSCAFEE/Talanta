var mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');
var bcrypt = require('bcryptjs');
var Schema = mongoose.Schema;

var userSchema = new Schema({
    name: {
        type: String,
        trim: true,
        required: true
    },
    email: {
        type: String,
        lowercase: true,
        trim: true,
        index: true,
        sparse: true
    },
    bio: String,
    password: String,
    facebook: {
        id: String,
        email: String
    },
    google: {
        id: String,
        email: String
    },
    location: String,
    meta: {
        age: Number,
        website: String
    },
    created_at: Date,
    updated_at: Date,
    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post'
    }
});

userSchema.pre('save', function(next) {
    var user = this;
    if (!user.isModified('password')) return next();
    bcrypt.genSalt(10, function(err, salt) {
        if (err) return next(err);
        bcrypt.hash(user.password, salt, function(err, hash) {
            if (err) return next(err);
            user.password = hash;
            next();
        });
    });

    var currentDate = new Date();

    // change the updated_at field to current date
    this.updated_at = currentDate;

    // if created_at doesn't exist, add to that field
    if (!this.created_at)
        this.created_at = currentDate;

    next();
});
//error 1101
userSchema.plugin(uniqueValidator);

userSchema.methods.comparePassword = function(candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
        if (err) return cb(err);
        cb(null, isMatch);
    });
};

module.exports = mongoose.model('User', userSchema);
