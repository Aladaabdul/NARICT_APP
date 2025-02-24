const express = require("express");
const loanController = require('../controllers/loanController');
const { authenticateUser } = require("../config/auth");


const loanRouter = express.Router();

loanRouter.post('/loan-terms', authenticateUser, loanController.calculateLoanTerms);
loanRouter.post('/create-loan', authenticateUser, loanController.createLoan);
loanRouter.get('/get-active-loan', authenticateUser, loanController.getActiveLoan);
loanRouter.post('/get-loan', authenticateUser, loanController.getUserActiveLoan);
loanRouter.post('/all-loan', authenticateUser, loanController.getAllUserLoan);
loanRouter.post('/make-payment', authenticateUser, loanController.loanRepayment);
loanRouter.get('/cron-job', loanController.checkMonthlyInstallment);


module.exports = loanRouter;