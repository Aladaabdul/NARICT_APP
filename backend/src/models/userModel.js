const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const userModelSchema = new Schema({

    fullName: {
        type: String,
        required: true
    },
    
    role: {
        type: String,
        enum: ["admin", "user"],
        default: "user"
    },

    ipssNumber: {
        type: Number,
        unique: true,
        min: 10000,
        max: 999999,
        required: function () {
            return this.role === "user";
        },
        validate: {
            validator: function (value) {
                if (this.role === "user" && !value) {
                    return false; // If role is user, ipssNumber must be present
                }
                return true; // Otherwise, it's fine
            },
            message: "IpssNumber is required for users",
        },
    },

    email: {
        type: String,
        required: true,
        unique: true
    },

    password: {
        type: String,
        required: true
    },

    resetToken: {
        type: String,
        default: null
    },

    resetTokenExpires: {
        type: Date,
        default: null
    },

    createdAt: { 
        type: Date, 
        default: Date.now,
        index: true
    }
});


module.exports = mongoose.model("User", userModelSchema);