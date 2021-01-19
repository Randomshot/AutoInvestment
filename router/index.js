const express = require('express');
const app = express();
const router = express.Router();
const bodyParser = require('body-parser');
const redis = require('redis');
require('dotenv').config();
const redisSetting = {

    host : process.env.host,
    port : process.env.port,
    db : process.env.db,
    password : process.env.redisPassword
}

const coinRedisSetting = {

    
    host : process.env.host,
    port : process.env.port,
    db : process.env.coinDB,
    password : process.env.redisPassword
}

const client = redis.createClient(redisSetting);
const subscriber = redis.createClient(redisSetting);

const coinClient = redis.createClient(coinRedisSetting);
const coinSubscriber = redis.createClient(coinRedisSetting);

const mysql = require('../module/mysql.js');
const http = require('http');
const socketio = require('socket.io')();
const fs = require('fs');
const server = http.createServer(app);
const io = socketio.listen(server);
const schedule = require('node-schedule');

schedule.scheduleJob('31 15 * * 1-5',function(){
    saveData("LuterGS");
});

schedule.scheduleJob('58 08 * * 1-5',function(){
    delData("LuterGS",client);
});

app.use(express.static(__dirname + '/../public/'));

server.listen(3000,function(){

    console.log("nodejs server on port 3000");
});


saveCoinData("coin_LuterGS");
//delData("coin_LuterGS",coinClient);
router.get('/',function(req,res){
   
    fs.readFile('./public/index.html','utf-8',function(err,data){
        res.type('text/html');
        res.send(data);
    })

});


socketConnection("LuterGS",-10,-1, client, subscriber,"receive1", "receive2");
socketConnection("coin_LuterGS",-10,-1, coinClient, coinSubscriber,"coinReceive1", "coinReceive2");

function socketConnection(userName, start, end, redisClient, redisSubscriber,socketReceive1, socketReceive2){

            redisClient.config("SET","notify-keyspace-events","KEA");
            redisSubscriber.psubscribe("__key*__:"+ userName + "_*");
            redisClient.setex("string key",10,"strign val",redis.print);

           
        io.sockets.on('connection',function(socket){
            socket.join("log");
           
            
            getTypeData(userName,0,redisClient,function(totalLog){
                socket.emit(socketReceive1,totalLog);
            });

            getTypeData(userName,1,redisClient,function(totalLog){
                socket.emit(socketReceive2,totalLog);
            });

            redisSubscriber.on("pmessage",function(pattern,channel,message){
              
                if(message == "hset"){
                    getTypeData(userName,0,redisClient,function(totalLog){
                        socket.emit(socketReceive1,totalLog);
                    });

                    getTypeData(userName,1,redisClient,function(totalLog){
                        socket.emit(socketReceive2,totalLog);
                    });

                }
            });
        });
}
function getData(userName, start, end, redisClient, callback){
    
    var logName;
    var j = 0;
    var totalLog = [];
    redisClient.lrange(userName,start,end,function(err,result){
        if(err) console.log(err);
        else{
            for(var i in result){
                logName = userName + '_' + result[i];
                redisClient.hvals(logName,function(err,obj){
                    if(err) console.log(err);
                    else{
                        totalLog[j] = obj;
                        j++;
                        if( j == result.length){
                            callback(totalLog);
                        }
                    }
                });
            }
        }

    });
}

function getTypeData(userName,type,redisClient,callback){
    
    //type = 0 : buy, 1 = sell, 2 = all
    var logName;
    var start = 0;
    var end = -1;
    var totalLog = [];
    var j = 0;
    
    redisClient.lrange(userName,start,end,function(err,result){
        if(err) console.log(err);
        else{
            for(var i in result){
                logName = userName + '_' + result[result.length -1 - i];
                redisClient.hvals(logName,function(err,obj){
                    if(err) console.log(err);
                    else{
                        if(type == 0){
                           if(obj[0] == "buy"){
                                totalLog[j] = obj;
                                j++;
                           } 
                           if(j == 10 || (j < 10 && j == result.length)){
                                callback(totalLog);
                           }
                        }
                        else if(type == 1){
                           if(obj[0] == "sell"){
                                totalLog[j] = obj;
                                j++;
                           } 
                           if(j == 10 || (j < 10 && j == result.length)){
                                callback(totalLog);
                           }

                        }
                        else if(type == 2){
                            totalLog[j] = obj;
                            j++;
                            if(j == result.length){
                                callback(totalLog,result);
                            }
                        }
                        else{
                            callback(-1);
                        }
                    }
                });
            }
        }

    });
}


function saveData(userName){

    const start = 0;
    const end = -1;
    var logName;
    var sql;
    var qry;
    var k =0;

    getTypeData(userName,2,client,function(totalLog,result){
        for(var i in totalLog){
            var type = totalLog[i][0];
            var sql;
            if(type == "buy"){
                sql = 'insert into ' + userName + ' (type,code,name,amount,price,total_price,date) values (?,?,?,?,?,?,?)';
                mysql.query(sql,
                [totalLog[i][0],totalLog[i][1],totalLog[i][2],totalLog[i][3],totalLog[i][4],totalLog[i][5],result[k]]
                ,function(err,rs){
                    //if(err) console.log(err);
                })
            }
            else if(type == "sell"){
                sql = 'insert into ' + userName + ' (type,code,name,profit_percent,profit_total_price,date) values (?,?,?,?,?,?)';
                mysql.query(sql,
                [totalLog[i][0],totalLog[i][1],totalLog[i][2],totalLog[i][3],totalLog[i][4],result[k]]
                ,function(err,rs){
                    //if(err) console.log(err);
                });
            }
            else{
                
            }
            k++;
        }
    });
    
};

function delData(userName,redisClient){
    const start = 0;
    const end = -1;

    redisClient.lrange(userName,start,end,function(err,result){
        if(err) console.log(err);
        else{
            for(var i in result){
            
                logName = userName + '_' + result[i];
                redisClient.del(logName);
            }
        }
    });
    
    //ltrim remove all data without range
    redisClient.ltrim(userName,end,start,function(err,result){
        if(err) console.log(err);
    });


}

function saveCoinData(userName){

    const start = 0;
    const end = -1;
    var sql;
    var k = 0; 
    getTypeData(userName,2,coinClient,function(totalLog,result){

        for(var i in totalLog){
            var type = totalLog[i][0];
            var sql;
            if(type == "buy"){
                sql = 'insert into ' + userName + ' (type,coin,price,qty,total_price,date) values (?,?,?,?,?,?)';
                mysql.query(sql,
                [totalLog[i][0],totalLog[i][1],totalLog[i][2],totalLog[i][3],totalLog[i][4],result[k]]
                ,function(err,rs){
                    //if(err) console.log(err);
                })
            }
            else if(type == "sell"){
                sql = 'insert into ' + userName + ' (type,coin,price,qty,total_price,is_profit,date) values (?,?,?,?,?,?,?)';
                mysql.query(sql,
                [totalLog[i][0],totalLog[i][1],totalLog[i][2],totalLog[i][3],totalLog[i][4],totalLog[i][5],result[k]]
                ,function(err,rs){
                    //if(err) console.log(err);
                });
            }
            else{
                
            }
            k++;
        }
    });
}

module.exports = router;
