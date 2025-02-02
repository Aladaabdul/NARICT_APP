const mongoose = require("mongoose")
require("dotenv").config()


const CONNECT_URL = process.env.MONGO_URL


function ConnectTOMongo() {

    mongoose.connect(CONNECT_URL)

    mongoose.connection.on("connected", () => {
        console.log("Connected Successfully")
    })

    mongoose.connection.on("error", (err) => {
        console.log(err)
        console.log("An error occured")
    })
}


module.exports = { ConnectTOMongo }