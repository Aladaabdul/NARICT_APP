const express = require("express");
const loanController = require('../controllers/loanController');
const { authenticateUser } = require("../config/auth");


const loanRouter = express.Router();

loanRouter.post('/loan-terms', authenticateUser, loanController.calculateLoanTerms);
loanRouter.post('/create-loan', authenticateUser, loanController.createLoan);
loanRouter.patch('/update-status', authenticateUser, loanController.updateLoanStatus);
loanRouter.post('/get-loans-by-status', authenticateUser, loanController.getLoansByStatus);
loanRouter.get('/get-active-loan', authenticateUser, loanController.getActiveLoan);
loanRouter.post('/get-loan', authenticateUser, loanController.getUserActiveLoan);
loanRouter.post('/all-loan', authenticateUser, loanController.getAllUserLoan);
loanRouter.post('/make-payment', authenticateUser, loanController.loanRepayment);
loanRouter.get('/cron-job', loanController.checkMonthlyInstallment);
loanRouter.get('/loan-stats',  authenticateUser, loanController.getLoanStats);


module.exports = loanRouter;