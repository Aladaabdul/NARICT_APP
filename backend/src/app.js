const express = require("express");
require('dotenv').config();
const { ConnectTOMongo } = require("../config/db")


const app = express()
const PORT = 8000 || process.env.PORT

ConnectTOMongo();



app.listen(PORT, () => {
    console.log(`Server is running on PORT ${PORT}`)
})