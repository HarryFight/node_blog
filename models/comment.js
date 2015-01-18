/**
 * Created by Mr.Harry on 2015/1/18.
 */
var mongodb = require('./db');  //引入数据库访问模型

/**
 * 声明一个Comment（评论）对象
 * @param name
 * @param day
 * @param title
 * @param comment
 * @constructor
 */
function Comment(name,day,title,comment){
    this.name = name;
    this.day = day;
    this.title = title;
    this.comment = comment;
}
//暴露对外接口
module.exports = Comment;

//存储一条留言信息
Comment.prototype.save = function(callback) {
    var name = this.name,
        day = this.day,
        title = this.title,
        comment = this.comment;
    //打开数据库
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }
        //读取 posts 集合
        db.collection('posts', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            //通过用户名、时间及标题查找文档，并把一条留言对象添加到该文档的 comments 数组里
            collection.update({
                "name": name,
                "time.day": day,
                "title": title
            }, {
                $push: {"comments": comment}
            } , function (err) {
                mongodb.close();
                if (err) {
                    return callback(err);
                }
                callback(null);
            });
        });
    });
};