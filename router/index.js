const express = require('express');
const router = express.Router();
const mysql = require('../module/db/mysql.js');
const bodyParser = require('body-parser');
const session = require('express-session');

router.get('/',function(req,res){
    res.sendStatus(200);
});

router.get('/data',function(req,res,next){
    mysql.query('select * from tmp',function(err,result){
        if(err) console.log(err);
        else{
            res.send(result[0].name);
        }
    });
});

module.exports = router;