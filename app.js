const express = require('express');
var app = express();
const root = require('./router/index.js');
const http = require('http');
const bodyParser = require('body-parser');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended : true}));
app.use('/',root);

app.listen(3001,function(){
    console.log("http server on port 3001");
});

