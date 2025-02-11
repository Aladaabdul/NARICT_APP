const express = require("express");
const savingController = require("../controllers/savingController");
const { authenticateUser } = require("../config/auth");


const savingRouter = express.Router();

savingRouter.post('/deposit', authenticateUser, savingController.makeSaving);
savingRouter.post('/withdraw', authenticateUser, savingController.withdrawSaving);
savingRouter.get('/transactions', authenticateUser, savingController.getTransactions);
savingRouter.post('/userSaving', authenticateUser, savingController.getUserSaving);


module.exports = savingRouter;