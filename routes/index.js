var express = require('express');
var router = express.Router();

//引入 crypto 模块和 user.js 用户模型文件，crypto 是 Node.js 的一个核心模块，我们用它生成散列值来加密密码。
var crypto = require('crypto'),
    User = require('../models/user.js'),
    Post = require('../models/post.js');

/* 路由控制 */
module.exports = function(app){
    //获取主页
    app.get('/', function (req, res) {
        //获取所有文章内容
        Post.getAll(null,function(err,docs) {
            if (err) {
                posts = [];     //数据库查询错误，post置为空
            }
            //使用模板渲染，并且传入相应参数。
            res.render('index', {
                title: '主页',
                user: req.session.user,
                posts: docs,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });
    //获取reg页
    app.get('/reg', checkNotLogin);
    app.get('/reg', function (req, res) {
        res.render('reg', {
            title: '注册',
            user:req.session.user,
            success:req.flash('success').toString(),
            error:req.flash('error').toString()
        });
    });
    //发送注册信息
    app.post('/reg', checkNotLogin);
    app.post('/reg', function (req, res) {
        var name =  req.body.name,
            password = req.body.password,
            password_re = req.body['password-repeat'];
        //检测两次密码是否一致
        if(password != password_re){
            req.flash('error','两次输入的密码不一致');
            //返回注册页
            return res.redirect('/reg');
        }
        //生成密码的md5
        var md5 = crypto.createHash('md5'), //创建并返回一个hash对象，它是一个指定算法的加密hash，用于生成hash摘要
            password = md5.update(req.body.password).digest('hex');
        //创建一个user对象,并初始化值
        var newUser = new User({
            name:name,
            password:password,
            email:req.body.email
        });
        //调用User.get接口检查用户名是否已经存在
        User.get(newUser.name,function(err,user){
            if(err){
                req.flash('error',err);
                return res.redirect('/');
            }
            if(user){
                req.flash('error','用户已经存在');
                //返回注册页
                return res.redirect('/reg');
            }
            //如果不存在则新增用户
            newUser.save(function(err,user){
                if(err){
                    req.flash('error',err);
                    //注册失败返回注册页
                    return res.redirect('/reg');
                }
                req.session.user = user;    //用户信息存入session
                req.flash('success','注册成功！');
                res.redirect('/');  //注册成功后返回主页
            });
        });
    });
    //获取登录页
    app.get('/login', checkNotLogin);
    app.get('/login', function (req, res) {
        res.render('login', {
            title: '登录',
            user:req.session.user,
            success:req.flash('success').toString(),
            error:req.flash('error').toString()
        });
    });
    //发送登录信息
    app.post('/login', checkNotLogin);
    app.post('/login', function (req, res) {
        //生成密码的md5
        var md5 = crypto.createHash('md5'),
            password = md5.update(req.body.password).digest('hex');

        User.get(req.body.name,function(err,user){
            //检查用户是否存在
            if(!user){
                req.flash('error','用户不存在');
                return res.redirect('/login');
            }
            //检查密码是否一致
            if(user.password != password){
                req.flash('error','密码错误!');
                return res.redirect('/login');
            }
            //用户和密码都匹配成功后，将用户信息存入session
            req.session.user = user;
            req.flash('success','登录成功！');
            res.redirect('/');
        })
    });
    //获取文章发表页
    app.get('/post', checkLogin);
    app.get('/post', function (req, res) {
        res.render('post', {
            title: '发表' ,
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });
    //发送文章信息
    app.post('/post', checkLogin);
    app.post('/post', function (req, res) {
        var currentUser = req.session.user,
            post = new Post(currentUser.name,req.body.title,req.body.post);
        post.save(function(err){
            if(err){
                req.flash('error',err);
                return res.redirect('/');
            }else{
                req.flash('success','发布成功!');
                res.redirect('/');
            }

        })
    });
    //获取文件上传页面
    app.get('/upload', checkLogin);
    app.get('/upload', function (req, res) {
        res.render('upload', {
            title: '文件上传',
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });
    //发送上传信息
    app.post('/upload', checkLogin);
    app.post('/upload', function (req, res) {
        req.flash('success', '文件上传成功!');
        res.redirect('/upload');
    });
    //用户登出
    app.get('/logout', checkLogin);
    app.get('/logout', function (req, res) {
        //将session信息置空实现登出
        req.session.user = null;
        req.flash('success','登出成功!');
        res.redirect('/');
    });

    //用户页面
    app.get('/u/:name',function(req,res){
        //检查用户是否存在
        User.get(req.params.name,function(err,user) {
            if (!user) {
                req.flash('error', '用户不存在');
                return res.redirect('/');   //跳转到主页
            }
            //查询并返回该用户的所有文章
            Post.getAll(user.name, function (err, posts) {
                if (err) {
                    req.flash('error', err);
                    return res.redirect('/')
                }
                //使用查询到的数据渲染user模版
                res.render('user', {
                    title: user.name,
                    posts: posts,
                    user: req.session.user,
                    success: req.flash('success').toString(),
                    error: req.flash('error').toString()
                })
            })
        })
    });
    //文章页面
    app.get('/u/:name/:day/:title',function(req,res){
        //根据url中的参数，使用Post模型查询文章
       Post.getOne(req.params.name,req.params.day,req.params.title,function(err,post){
           if(err){
               req.flash('error',err);
               return res.redirect('/');
           }
           //使用获取的数据渲染article模版
           res.render('article', {
               title: req.params.title,
               post: post,
               user: req.session.user,
               success: req.flash('success').toString(),
               error: req.flash('error').toString()
           });
       })
    });

    //编辑文章页面
    app.get('/edit/:name/:day/:title', checkLogin);     //检测是否登录
    app.get('/edit/:name/:day/:title', function (req, res) {
        var currentUser = req.session.user;
        Post.edit(currentUser.name, req.params.day, req.params.title, function (err, post) {
            if (err) {
                req.flash('error', err);
                return res.redirect('back');
            }
            res.render('edit', {
                title: '编辑',
                post: post,
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });
    //发送编辑后的文章
    app.post('/edit/:name/:day/:title', checkLogin);
    app.post('/edit/:name/:day/:title', function (req, res) {
        var currentUser = req.session.user;
        Post.update(currentUser.name, req.params.day, req.params.title, req.body.post, function (err) {
            //该原生方法的目的是对 URI 进行完整的编码
            var url = encodeURI('/u/' + req.params.name + '/' + req.params.day + '/' + req.params.title);
            if (err) {
                req.flash('error', err);
                return res.redirect(url);//出错！返回文章页
            }
            req.flash('success', '修改成功!');
            res.redirect(url);//成功！返回文章页
        });
    });
    //删除文章页面
    app.get('/remove/:name/:day/:title', checkLogin);
    app.get('/remove/:name/:day/:title', function (req, res) {
        var currentUser = req.session.user;
        //传如相应数据删除文章
        Post.remove(currentUser.name, req.params.day, req.params.title, function (err) {
            if (err) {
                req.flash('error', err);
                return res.redirect('back');
            }
            req.flash('success', '删除成功!');
            res.redirect('/');
        });
    });
    /**
     * 判断是否登录
     * @param req
     * @param res
     * @param next
     */
    function checkLogin(req,res,next){
        if(!req.session.user){
            req.flash('error','未登录！');
            req.redirect('/login');
        }
        //next函数是传递控制权
        next();
    }
    /**
     * 判断是否未登录
     * @param req
     * @param res
     * @param next
     */
    function checkNotLogin(req,res,next){
        if(req.session.user){
            req.flash('error','已登录');
            req.redirect('back');
        }
        //next函数是传递控制权
        next();
    }
};
