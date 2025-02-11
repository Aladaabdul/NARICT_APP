const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const savingSchema = new Schema({

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },

    ipssNumber: {
        type: Number,
        unique: true,
        required: true,
        min: 10000,
        max: 999999
    },

    totalAmount: {
        type: Number,
        required: true,
        default: 0
    },

    lastUpdated: {
        type: Date,
        default: Date.now
    },

    transaction: [
        {
            type: { type: String, enum: ["deposit", "withdrawal"], required: true},
            amount: { type: Number, required: true},
            date: { type: Date, default: Date.now}
        }
    ]
})


module.exports = mongoose.model("Saving", savingSchema);