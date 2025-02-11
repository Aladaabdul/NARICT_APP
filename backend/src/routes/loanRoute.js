const express = require("express");
const loanController = require('../controllers/loanController');
const { authenticateUser } = require("../config/auth");


const loanRouter = express.Router();

loanRouter.post('/loan-terms', authenticateUser, loanController.calculateLoanTerms);
loanRouter.post('/create-loan', authenticateUser, loanController.createLoan);


module.exports = loanRouter;