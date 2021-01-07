const express = require('express');
const app = express();
const root = require('./router/index.js');

app.use('/',root);
app.listen(3000,function(){
    console.log('Server on');
});