const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const loanModelSchema = new Schema({

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    fullName: {
        type: String,
        required: true
    },

    ipssNumber: {
        type: Number,
        required: true,
        min: 10000,
        max: 999999
    },

    amount: {
        type: Number,
        required: true
    },

    term_month: {
        type: Number,
        required: true
    },

    status: {
        type: String,
        enum: ["pending", "rejected", "approved", "completed"],
        default: "pending"
    },

    totalInterest: {
        type: Number,
        required: true
    },

    interestAmount: {
        type: Number,
        required: true
    },

    totalInterestAmount: {
        type: Number,
        required: true
    },

    repaymentAmount: {
        type: Number,
        required: true
    },

    recurringFee: {
        type: Number,
        required: true
    },

    finalPayment: {
        type: Number,
        required: true
    },

    monthlyInstallment: [
        {
            month: {type: Number, required: true},
            amount: {type: Number, required: true},
            paid: {type: Boolean, required: true},
            penaltyApplied: {type: Boolean, required: true}
        }
    ],

    createdAt: {
        type: Date,
        default: Date.now
    }
});


module.exports = mongoose.model("Loan", loanModelSchema);