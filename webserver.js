const express = require('express');
const app = express();

require('dotenv').config();

app.listen(process.env.PORT, function(){
    console.log('listening on 8080');
})

app.get('/signup',(req, res) => {
    res.render('signup.ejs');
});