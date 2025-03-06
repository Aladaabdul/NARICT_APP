const chai = require("chai")
const expect = chai.expect
const chaiHttp = require("chai-http");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const sinon = require("sinon");
const server = require("../src/app");
const User = require("../src/models/userModel");
const Loan = require("../src/models/loanModel");

chai.use(chaiHttp)

describe("loan controller, create loan", () => {

    let adminToken, userToken
        
    beforeEach(function () {
        sinon.restore();
            
        adminToken = jwt.sign({ role: "admin" }, "secret");
        userToken = jwt.sign({ role: "user" }, "secret");
            
        sinon.stub(jwt, "verify").callsFake((token, secret) => {
            if (token === adminToken) {
                return { id: "admin123", role: "admin", email: "admin@gmail.com" };
            } else if (token === userToken) {
                return { id: "user123", role: "user", email: "user@gmail.com" };
            }
            return null;
        });
    
    });


    it("should create a new loan for exiting user by an admin", async function() {

        const existingUser = {
            fullName: "Abdul Alada",
            ipssNumber: "332266",
            role: "user",
            email: "user@gmail.com"
        }

        sinon.stub(User, "findOne").resolves(existingUser);
        sinon.stub(Loan, "find").resolves([]);
        sinon.stub(Loan.prototype, "save").resolves({
            _id: new mongoose.Types.ObjectId()
        });

        const res = await chai.request(server)
            .post("/api/loan/create-loan")
            .send({
                amount: 20000,
                term_month: 3,
                ipssNumber: "332266"
            })
            .set('Authorization', `Bearer ${adminToken}`)

        expect(res).to.have.status(200);
        expect(res.body).to.have.property("message", "Loan created successfully");
    });


    it("should fail creation of a new loan for user by a user account", async function() {

        const existingUser = {
            fullName: "Abdul Alada",
            ipssNumber: "332266",
            role: "user",
            email: "user@gmail.com"
        }

        sinon.stub(User, "findOne").resolves(existingUser);
        sinon.stub(Loan, "find").resolves([]);
        sinon.stub(Loan.prototype, "save").resolves({
            _id: new mongoose.Types.ObjectId()
        });

        const res = await chai.request(server)
            .post("/api/loan/create-loan")
            .send({
                amount: 20000,
                term_month: 3,
                ipssNumber: "332266"
            })
            .set('Authorization', `Bearer ${userToken}`)

        expect(res).to.have.status(403);
        expect(res.body).to.have.property("message", "Access denied!");
    });


    it("should fail creation of a new loan for non existing user", async function() {

        sinon.stub(User, "findOne").resolves(null);
        sinon.stub(Loan, "find").resolves([]);
        sinon.stub(Loan.prototype, "save").resolves({
            _id: new mongoose.Types.ObjectId()
        });

        const res = await chai.request(server)
            .post("/api/loan/create-loan")
            .send({
                amount: 20000,
                term_month: 3,
                ipssNumber: "332266"
            })
            .set('Authorization', `Bearer ${adminToken}`)

        expect(res).to.have.status(404);
        expect(res.body).to.have.property("message", "No user found by this ipssNumber");
    });


    it("should fail creation of a new loan for user with active loan", async function() {

        const existingUser = {
            fullName: "Abdul Alada",
            ipssNumber: "332266",
            role: "user",
            email: "user@gmail.com"
        }

        const loans = [
            {
                _id: new mongoose.Types.ObjectId(),
                fullName: 'Abdul Alada',
                ipssNumber: 332266,
                amount: 20000,
                term_month: 3,
                status: 'active',
                totalInterest: 2.5,
                interestAmount: 500,
                repaymentAmount: 20800,
                recurringFee: 6933,
                finalPayment: 6934,
                monthlyInstallment: [
                    {
                    "month": 1,
                    "amount": 6933,
                    "paid": false,
                    _id: new mongoose.Types.ObjectId()
                },
                {
                    "month": 1,
                    "amount": 6933,
                    "paid": false,
                    _id: new mongoose.Types.ObjectId()
                }, 
                {
                    "month": 1,
                    "amount": 6934,
                    "paid": false,
                    _id: new mongoose.Types.ObjectId()
                }
                ],
                createdAt: '2025-02-28T10:00:50.101Z'
            }
        ]

        sinon.stub(User, "findOne").resolves(existingUser);
        sinon.stub(Loan, "find").resolves(loans);
        sinon.stub(Loan.prototype, "save").resolves({
            _id: new mongoose.Types.ObjectId()
        });

        const res = await chai.request(server)
            .post("/api/loan/create-loan")
            .send({
                amount: 40000,
                term_month: 3,
                ipssNumber: "332266"
            })
            .set('Authorization', `Bearer ${adminToken}`)
        expect(res).to.have.status(400);
        expect(res.body).to.have.property("error", "You still have an active loan! Please pay up to take another Loan");
    });


    it("should create a new loan for user with non active loan", async function() {

        const existingUser = {
            fullName: "Abdul Alada",
            ipssNumber: "332266",
            role: "user",
            email: "user@gmail.com"
        }

        const loans = [
            {
                _id: new mongoose.Types.ObjectId(),
                fullName: 'Abdul Alada',
                ipssNumber: 332266,
                amount: 20000,
                term_month: 3,
                status: 'paid',
                totalInterest: 2.5,
                interestAmount: 500,
                repaymentAmount: 20800,
                recurringFee: 6933,
                finalPayment: 6934,
                monthlyInstallment: [
                    {
                    "month": 1,
                    "amount": 6933,
                    "paid": true,
                    _id: new mongoose.Types.ObjectId()
                },
                {
                    "month": 1,
                    "amount": 6933,
                    "paid": true,
                    _id: new mongoose.Types.ObjectId()
                }, 
                {
                    "month": 1,
                    "amount": 6934,
                    "paid": true,
                    _id: new mongoose.Types.ObjectId()
                }
                ],
                createdAt: '2025-02-28T10:00:50.101Z'
            }
        ]

        sinon.stub(User, "findOne").resolves(existingUser);
        sinon.stub(Loan, "find").resolves(loans);
        sinon.stub(Loan.prototype, "save").resolves({
            _id: new mongoose.Types.ObjectId()
        });

        const res = await chai.request(server)
            .post("/api/loan/create-loan")
            .send({
                amount: 40000,
                term_month: 3,
                ipssNumber: "332266"
            })
            .set('Authorization', `Bearer ${adminToken}`)
        expect(res).to.have.status(200);
        expect(res.body).to.have.property("message", "Loan created successfully");
    });

});


describe("loan controller, loan repayment", () => {

    let adminToken, userToken
        
    beforeEach(function () {
        sinon.restore();
            
        adminToken = jwt.sign({ role: "admin" }, "secret");
        userToken = jwt.sign({ role: "user" }, "secret");
            
        sinon.stub(jwt, "verify").callsFake((token, secret) => {
            if (token === adminToken) {
                return { id: "admin123", role: "admin", email: "admin@gmail.com" };
            } else if (token === userToken) {
                return { id: "user123", role: "user", email: "user@gmail.com" };
            }
            return null;
        });
    
    });


    it("should repay user active loan by an admin", async function () {

        const existingUser = {
            fullName: "Abdul Alada",
            ipssNumber: "332266",
            role: "user",
            email: "user@gmail.com"
        }

        const loan =
            {
                _id: new mongoose.Types.ObjectId(),
                fullName: 'Abdul Alada',
                ipssNumber: 332266,
                amount: 20000,
                term_month: 3,
                status: 'active',
                totalInterest: 2.5,
                interestAmount: 500,
                repaymentAmount: 20800,
                recurringFee: 6933,
                finalPayment: 6934,
                monthlyInstallment: [
                    {
                    "month": 1,
                    "amount": 6933,
                    "paid": false,
                    _id: new mongoose.Types.ObjectId()
                },
                {
                    "month": 1,
                    "amount": 6933,
                    "paid": false,
                    _id: new mongoose.Types.ObjectId()
                }, 
                {
                    "month": 1,
                    "amount": 6934,
                    "paid": false,
                    _id: new mongoose.Types.ObjectId()
                }
                ],
                createdAt: '2025-02-28T10:00:50.101Z'
            }

        sinon.stub(User, "findOne").resolves(existingUser);
        sinon.stub(Loan, "findOne").resolves(new Loan(loan));
        sinon.stub(Loan.prototype, "save").resolves({
            _id: new mongoose.Types.ObjectId()
        });

        const res = await chai.request(server)
            .post("/api/loan/make-payment")
            .send({
                ipssNumber: "332266",
                amount: 6934
            })
            .set('Authorization', `Bearer ${adminToken}`)

        expect(res).to.have.status(200);
        expect(res.body).to.have.property("message", "Payment successful");
    });

    it("should fail if user don't have active loan", async function () {

        const existingUser = {
            fullName: "Abdul Alada",
            ipssNumber: "332266",
            role: "user",
            email: "user@gmail.com"
        }

        const loan =
            {
                _id: new mongoose.Types.ObjectId(),
                fullName: 'Abdul Alada',
                ipssNumber: 332266,
                amount: 20000,
                term_month: 3,
                status: 'paid',
                totalInterest: 2.5,
                interestAmount: 500,
                repaymentAmount: 0,
                recurringFee: 6933,
                finalPayment: 6934,
                monthlyInstallment: [
                    {
                    "month": 1,
                    "amount": 6933,
                    "paid": true,
                    _id: new mongoose.Types.ObjectId()
                },
                {
                    "month": 1,
                    "amount": 6933,
                    "paid": true,
                    _id: new mongoose.Types.ObjectId()
                }, 
                {
                    "month": 1,
                    "amount": 6934,
                    "paid": true,
                    _id: new mongoose.Types.ObjectId()
                }
                ],
                createdAt: '2025-02-28T10:00:50.101Z'
            }

        sinon.stub(User, "findOne").resolves(existingUser);
        sinon.stub(Loan, "findOne").resolves(null);
        sinon.stub(Loan.prototype, "save").resolves({
            _id: new mongoose.Types.ObjectId()
        });

        const res = await chai.request(server)
            .post("/api/loan/make-payment")
            .send({
                ipssNumber: "332266",
                amount: 6934
            })
            .set('Authorization', `Bearer ${adminToken}`)

        expect(res).to.have.status(404);
        expect(res.body).to.have.property("message", "No active loan found for user with this ipssNumber");
    });
});


describe("loan controller, checking monthly installments", () => {

    let clock;

    beforeEach(function () {
        
        sinon.restore();
        // clock = sinon.useFakeTimers(new Date(2025, 1, 4).getTime());
    
    });

    afterEach(function () {
        sinon.restore();
        // clock.restore();
    });

    it("should penalize user for defaulted monthly payment", async function () {
        this.timeout(20000)

        const loans = [
            {
                _id: new mongoose.Types.ObjectId(),
                fullName: 'Abdul Alada',
                ipssNumber: 332266,
                amount: 20000,
                term_month: 3,
                status: 'active',
                totalInterest: 2.5,
                interestAmount: 500,
                repaymentAmount: 20800,
                recurringFee: 6933,
                finalPayment: 6934,
                monthlyInstallment: [
                    {
                    "month": 1,
                    "amount": 6933,
                    "paid": false,
                    _id: new mongoose.Types.ObjectId()
                },
                {
                    "month": 2,
                    "amount": 6933,
                    "paid": false,
                    _id: new mongoose.Types.ObjectId()
                }, 
                {
                    "month": 3,
                    "amount": 6934,
                    "paid": false,
                    _id: new mongoose.Types.ObjectId()
                }
                ],
                createdAt: '2025-02-04T10:00:50.101Z',
                save: sinon.stub().resolves()
            }
        ]

        sinon.stub(Loan, "find").resolves(loans);

        const res = await chai.request(server)
            .get("/api/loan/cron-job")

        console.log(res.body)
        
        expect(res).to.have.status(200);
        expect(loans[0].save.calledOnce).to.be.true;
    })
})