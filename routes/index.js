var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var Post = require('../models/post'); // get our mongoose model
var Comment = require('../models/comments'); // get our mongoose model

router.get('/discover', function(req, res, next) {
    Post.find(function(err, posts) {
        if (err) {
            return next(err);
        }

        res.json(posts);
    });
});

router.post('/posts', function(req, res, next) {
    var post = new Post(req.body);

    post.save(function(err, post) {
        if (err) {
            return next(err);
        }

        res.json(post);
    });
});
router.route('users/:user_id/posts/:id').put(function(req, res) {
    Post.findOne({
        _id: req.params.id
    }, function(err, post) {

        if (err)
            res.send(err);

        for (prop in req.body) {
            post[prop] = req.body[prop];
        }

        // save the movie
        post.save(function(err) {
            if (err)
                res.send(err);

            res.json({
                message: 'post updated!'
            });
        });

    });
});


router.route('users/:user_id/posts/:id').get(function(req, res) {
    Post.findOne({
        _id: req.params.id
    }, function(err, post) {
        if (err)
            res.send(err);

        res.json(post);
    });
});

// delete the post with this id (accessed at DELETE http://localhost:8080/api/posts/:post)
router.route('users/:user_id/posts/:id').delete(function(req, res) {
    Post.remove({
        _id: req.params.id
    }, function(err, post) {
        if (err)
            res.send(err);

        res.json({
            message: 'Successfully deleted'
        });
    });
});


//function to automatically load an object
router.param('post', function(req, res, next, id) {
    var query = Post.findById(id);

    query.exec(function(err, post) {
        if (err) {
            return next(err);
        }
        if (!post) {
            return next(new Error('can\'t find post'));
        }

        req.post = post;
        return next();
    });
});
router.param('comment', function(req, res, next, id) {
    var query = Post.findById(id);

    query.exec(function(err, post) {
        if (err) {
            return next(err);
        }
        if (!post) {
            return next(new Error('can\'t find comment'));
        }

        req.post = post;
        return next();
    });
});
//return single post
router.get('users/:user_id/posts/:post', function(req, res,next) {
    res.json(req.post);
    req.post.populate('comments', function(err, post) {
    if (err) { return next(err); }

    res.json(post);
  });
});

//route to upvote post
router.put('users/:user_id/posts/:post/upvote', function(req, res, next) {
    req.post.upvote(function(err, post) {
        if (err) {
            return next(err);
        }

        res.json(post);
    });
});



router.post('users/:user_id/posts/:post/comments', function(req, res, next) {
    var comment = new Comment(req.body);
    comment.post = req.post;

    comment.save(function(err, comment) {
        if (err) {
            return next(err);
        }

        req.post.comments.push(comment);
        req.post.save(function(err, post) {
            if (err) {
                return next(err);
            }

            res.json(comment);
        });
    });
});




module.exports = router;
