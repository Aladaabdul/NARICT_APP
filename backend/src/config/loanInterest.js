require("dotenv").config();

const BASE_MONTH = process.env.BASE_MONTH || 3
const BASE_INTEREST = process.env.BASE_INTEREST || 2.5
const SINGLE_INTEREST = process.env.SINGLE_INTEREST || 0.8333
const SERVICE_CHARGE = Number(process.env.SERVICE_CHARGE || 300)

// Calculate Loan Interest Function
const calculateLoanInterest = function(amount, term_month) {

    let totalInterest;

    if (term_month < BASE_MONTH) {

        totalInterest = term_month * SINGLE_INTEREST
    } else {

        const quotient = Math.floor(term_month / BASE_MONTH)
        const remaider = term_month % BASE_MONTH

        totalInterest = (quotient * BASE_INTEREST) + (remaider * SINGLE_INTEREST);
    }

    totalInterest = Number(totalInterest.toFixed(2))

    const interestAmount = (totalInterest / 100) * amount

    const repaymentAmount = amount + interestAmount + SERVICE_CHARGE

    const fixedInstallment = Math.floor(repaymentAmount / term_month)

    const finalPayment = repaymentAmount - (fixedInstallment * (term_month - 1));

    let installments = Array(term_month - 1).fill().map((_, i) => ({
        month: i + 1,
        amount: fixedInstallment,
        paid: false
    }));


    installments.push({ month: term_month, amount: finalPayment, paid: false });

    return {
        totalInterest,
        interestAmount,
        repaymentAmount,
        installments: installments
    }
}


module.exports = {
    calculateLoanInterest
}