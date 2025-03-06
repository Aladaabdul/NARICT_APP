const chai = require("chai")
const expect = chai.expect
const chaiHttp = require("chai-http");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const sinon = require("sinon");
const server = require("../src/app");
const User = require("../src/models/userModel");
require("dotenv").config()
const nodemailer = require("nodemailer")
const bcrypt = require("bcryptjs")
const passwordConfig = require("../src/config/password")


chai.use(chaiHttp);

describe("User controller Admin registration", () => {

    beforeEach(async () => {
        sinon.restore();
    })

    const MAX_ADMINS = process.env.MAX_ADMINS;

    it("should register a new admin user", async () => {

        const adminUser = {
            fullName: "Abdul Alada",
            role: "admin",
            password: "Password1",
            email: "testadmin@gmail.com"
        }


        sinon.stub(User, "find").resolves([]);

        sinon.stub(User.prototype, "save").resolves(
            {_id: new mongoose.Types.ObjectId(),
            role: "admin",
            email: "testadmin@gmail.com"
        });
        
        const res = await chai.request(server)
            .post("/api/auth/register/admin")
            .send(adminUser)

        expect(res).to.have.status(201);
        expect(res.body).to.have.property("message", "Admin account register successfully")
    });


    it("should fail registration for an existing email", async () => {

        const adminUser = {
            fullName: "Abdul Alada",
            role: "admin",
            password: "Password1",
            email: "testadmin@gmail.com"
        }

        const existingAdmin = {
            _id: new mongoose.Types.ObjectId,
            role: "admin",
            email: "testadmin@gmail.com"
        }

        sinon.stub(User, "find").resolves([existingAdmin]);

        sinon.stub(User.prototype, "save").resolves(
            {_id: new mongoose.Types.ObjectId,
            role: "admin",
            email: "testadmin@gmail.com"
        });
        
        const res = await chai.request(server)
            .post("/api/auth/register/admin")
            .send(adminUser)

        expect(res).to.have.status(403);
        expect(res.body).to.have.property("error", "Email already registered. Login Instead")
    });


    it(`should fail registration for > ${MAX_ADMINS} existing admin account`, async () => {

        const adminUser = {
            fullName: "Abdul Alada",
            role: "admin",
            password: "Password1",
            email: "testadmin@gmail.com"
        }

        const existingAdmins = [
            { _id: new mongoose.Types.ObjectId(), role: "admin", email: "admin1@gmail.com" },
            { _id: new mongoose.Types.ObjectId(), role: "admin", email: "admin2@gmail.com" },
            { _id: new mongoose.Types.ObjectId(), role: "admin", email: "admin3@gmail.com" },
        ]

        sinon.stub(User, "find").resolves(existingAdmins);

        sinon.stub(User.prototype, "save").resolves(
            {_id: new mongoose.Types.ObjectId(),
            role: "admin",
            email: "testadmin@gmail.com"
        });
        
        const res = await chai.request(server)
            .post("/api/auth/register/admin")
            .send(adminUser)

        expect(res).to.have.status(403);
        expect(res.body).to.have.property("message", `Admin account can't exceed ${MAX_ADMINS}`)
    });


    it(`should register for < ${MAX_ADMINS} existing admin account`, async () => {

        const adminUser = {
            fullName: "Abdul Alada",
            role: "admin",
            password: "Password1",
            email: "testadmin@gmail.com"
        }

        const existingAdmins = [
            { _id: new mongoose.Types.ObjectId(), role: "admin", email: "admin1@gmail.com" },
            { _id: new mongoose.Types.ObjectId(), role: "admin", email: "admin2@gmail.com" }
        ]

        sinon.stub(User, "find").resolves(existingAdmins);

        sinon.stub(User.prototype, "save").resolves(
            {_id: new mongoose.Types.ObjectId(),
            role: "admin",
            email: "testadmin@gmail.com"
        });
        
        const res = await chai.request(server)
            .post("/api/auth/register/admin")
            .send(adminUser)

        expect(res).to.have.status(201);
        expect(res.body).to.have.property("message", "Admin account register successfully")
    });

});



describe("User controller user registration", () => {

    let adminToken, userToken, transporterStub, sendMailStub;
    
    beforeEach(function () {
        sinon.restore();
        
        adminToken = jwt.sign({ role: "admin" }, "secret");
        userToken = jwt.sign({ role: "user" }, "secret");
        sinon.stub(passwordConfig, "generatePassword").returns("Password1")
        
        sinon.stub(jwt, "verify").callsFake((token, secret) => {
            if (token === adminToken) {
                return { id: "admin123", role: "admin", email: "admin@gmail.com" };
            } else if (token === userToken) {
                return { id: "user123", role: "user", email: "user@gmail.com" };
            }
            return null;
        });

        transporterStub = sinon.stub(nodemailer, "createTransport").returns({
            sendMail: sinon.stub().yields(null, { response: "250 OK" }), // Simulate successful email sending
        });

    });


    it("should register a user by an admin", async function () {
        this.timeout(10000)

        const newUser = {
            fullName: "Abdul Alada",
            ipssNumber: "332266",
            role: "user",
            email: "user@gmail.com"
        }

        sinon.stub(User, "findOne").resolves(null)


        sinon.stub(User.prototype, "save").resolves({
            _id: new mongoose.Types.ObjectId(),
            role: "user",
            email: "user@gmail.com"
        })

        const res = await chai.request(server)
            .post("/api/auth/register")
            .send(newUser)
            .set('Authorization', `Bearer ${adminToken}`)

        expect(res).to.have.status(201);
        expect(res.body).to.have.property(
            "message", `User account register successful. Login details sent to Email address: ${newUser.email}`)
        expect(res.body).to.have.property(
            "tempPassword", "Password1"
        )

        expect(passwordConfig.generatePassword.calledOnce).to.be.true;
        expect(transporterStub.calledOnce).to.be.true;
        expect(transporterStub().sendMail.calledOnce).to.be.true;
    });


    it("should fail registration of user by a user", async function() {

        const newUser = {
            fullName: "Abdul Alada",
            ipssNumber: "332266",
            role: "user",
            email: "user@gmail.com"
        }

        sinon.stub(User, "findOne").resolves(null)

        sinon.stub(User.prototype, "save").resolves({
            _id: new mongoose.Types.ObjectId(),
            role: "user",
            email: "user@gmail.com"
        })

        const res = await chai.request(server)
            .post("/api/auth/register")
            .send(newUser)
            .set('Authorization', `Bearer ${userToken}`)

        expect(res).to.have.status(403);
        expect(res.body).to.have.property(
            "message", "Access denied")

        expect(transporterStub.calledOnce).to.be.false;
        expect(transporterStub().sendMail.calledOnce).to.be.false;
    });


    it("should fail registration of user with existing email", async function() {

        const newUser = {
            fullName: "Abdul Alada",
            ipssNumber: "332266",
            role: "user",
            email: "user@gmail.com"
        }

        const existingUser = {
            _id: new mongoose.Types.ObjectId,
            fullName: "Abdul Alada",
            ipssNumber: "332266",
            role: "user",
            email: "user@gmail.com"
        }

        sinon.stub(User, "findOne").resolves(existingUser);

        sinon.stub(User.prototype, "save").resolves({
            _id: new mongoose.Types.ObjectId(),
            role: "user",
            email: "user@gmail.com"
        })

        const res = await chai.request(server)
            .post("/api/auth/register")
            .send(newUser)
            .set('Authorization', `Bearer ${adminToken}`)

        expect(res).to.have.status(403);
        expect(res.body).to.have.property("message", "User with this email or ipssNumber already exist")

    });
});


describe("User login controller", () => {

    beforeEach(function () {

        sinon.restore();
    })

    it("should login an existing user", async function() {

        const userDetails = {
            fullName: "Abdul Alada",
            ipssNumber: "332266",
            role: "user",
            email: "user@gmail.com",
            password: await bcrypt.hash("Password123", 10)
        }

        sinon.stub(User, "findOne").resolves(userDetails)
        sinon.stub(bcrypt, "compare").resolves(true)
        sinon.stub(jwt, "sign").returns("token")

        const res = await chai.request(server)
            .post("/api/auth/login")
            .send({
                email: userDetails.email,
                password: "Password123"
            })

        expect(res).to.have.status(200);
        expect(res.body).to.have.property("message", "Login Successfully")
        expect(res.body).to.have.property("token", "token")
    });
    

    it("should fail if user email does not exist", async function() {


        sinon.stub(User, "findOne").resolves(null)
        sinon.stub(bcrypt, "compare").resolves(true)
        sinon.stub(jwt, "sign").returns("token")

        const res = await chai.request(server)
            .post("/api/auth/login")
            .send({
                email: "user@gmail.com",
                password: "Password123"
            })

        expect(res).to.have.status(404);
        expect(res.body).to.have.property("message", "No user found by this Email. Sign up!")
    });


    it("should fail if password provided does not match", async function() {

        const userDetails = {
            fullName: "Abdul Alada",
            ipssNumber: "332266",
            role: "user",
            email: "user@gmail.com",
            password: await bcrypt.hash("Password123", 10)
        }

        sinon.stub(User, "findOne").resolves(userDetails)
        sinon.stub(bcrypt, "compare").resolves(false)
        sinon.stub(jwt, "sign").returns("token")

        const res = await chai.request(server)
            .post("/api/auth/login")
            .send({
                email: "user@gmail.com",
                password: "Password1"
            })

        expect(res).to.have.status(400);
        expect(res.body).to.have.property("message", "Incorrect password or email provided")
    });
})


describe("User controller, Get 20 most recently created users", () => {

    let adminToken, userToken;
    
    beforeEach(function () {
        sinon.restore();
        
        adminToken = jwt.sign({ role: "admin" }, "secret");
        userToken = jwt.sign({ role: "user" }, "secret");
        sinon.stub(passwordConfig, "generatePassword").returns("Password1")
        
        sinon.stub(jwt, "verify").callsFake((token, secret) => {
            if (token === adminToken) {
                return { id: "admin123", role: "admin", email: "admin@gmail.com" };
            } else if (token === userToken) {
                return { id: "user123", role: "user", email: "user@gmail.com" };
            }
            return null;
        });

    });

    it("should get at most 20 recently created users", async function() {

        let existingUsers = [
            { _id: new mongoose.Types.ObjectId(), role: "user", email: "user1@gmail.com", createdAt: new Date("2023-01-01") },
            { _id: new mongoose.Types.ObjectId(), role: "user", email: "user2@gmail.com", createdAt: new Date("2025-01-01") },
            { _id: new mongoose.Types.ObjectId(), role: "user", email: "user3@gmail.com", createdAt: new Date("2020-01-01") },
            { _id: new mongoose.Types.ObjectId(), role: "user", email: "user4@gmail.com", createdAt: new Date("2021-01-01") },
            { _id: new mongoose.Types.ObjectId(), role: "user", email: "user5@gmail.com", createdAt: new Date("2024-01-01") },
            { _id: new mongoose.Types.ObjectId(), role: "user", email: "user6@gmail.com", createdAt: new Date("2024-01-01") },
            { _id: new mongoose.Types.ObjectId(), role: "user", email: "user7@gmail.com", createdAt: new Date("2019-01-01") },
        ]

        sinon.stub(User, "find").returns({
            sort: sinon.stub().callsFake(function () {
                existingUsers.sort((a, b) => b.createdAt - a.createdAt);
                return this;
            }),
            limit: sinon.stub().callsFake(function () {
                existingUsers = existingUsers.slice(0, 20);
                return this;
            }),
            select: sinon.stub().resolves(existingUsers),
        });

        const res = await chai.request(server)
            .get("/api/auth/get-users")
            .set('Authorization', `Bearer ${adminToken}`)

        expect(res).to.have.status(200);
        expect(res.body.users[0].email).to.be.equal("user2@gmail.com");
        expect(res.body.users.length).to.be.at.most(20);
    })
})