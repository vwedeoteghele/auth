const express = require('express')
const dotenv = require("dotenv").config();
const UserRouter = require('./api/User')
mongoDB = require('./config/db')

const app = express()

const port = 3000

app.use(express.urlencoded({extended: false}))
app.use(express.json())
app.use("/", UserRouter)
app.listen(port, () => {
  console.log(`ser listening on port ${port}`);
})