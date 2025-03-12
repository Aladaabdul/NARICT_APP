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
            ipssNumber: "332211",
            phoneNumber: "07015500652"
        }


        sinon.stub(User, "findOne").resolves(null);

        sinon.stub(User, "find").resolves([]);

        sinon.stub(User.prototype, "save").resolves(
            {_id: new mongoose.Types.ObjectId(),
            ipssNumber: "332211",
            phoneNumber: "07015500652"
        });
        
        const res = await chai.request(server)
            .post("/api/auth/register/admin")
            .send(adminUser)

        expect(res).to.have.status(201);
        expect(res.body).to.have.property("message", "Admin account register successfully")
    });


    it("should fail registration for an existing ipssNumber or phoneNumber", async () => {

        const adminUser = {
            fullName: "Abdul Alada",
            ipssNumber: "332211",
            phoneNumber: "07015500652"
        }

        const existingAdmin = {
            _id: new mongoose.Types.ObjectId,
            role: "admin",
            ipssNumber: "332211",
            phoneNumber: "07015500652"
        }

        sinon.stub(User, "find").resolves([existingAdmin]);

        sinon.stub(User.prototype, "save").resolves(
            {_id: new mongoose.Types.ObjectId,
            ipssNumber: "332211",
            phoneNumber: "07015500652"
        });
        
        const res = await chai.request(server)
            .post("/api/auth/register/admin")
            .send(adminUser)

        expect(res).to.have.status(403);
        expect(res.body).to.have.property("error", "User with provided ipssNumber or phone Number already exist")
    });


    it(`should fail registration for > ${MAX_ADMINS} existing admin account`, async () => {

        const adminUser = {
            fullName: "Abdul Alada",
            ipssNumber: "332211",
            phoneNumber: "07015500652"
        }

        const existingAdmins = [
            { _id: new mongoose.Types.ObjectId(), role: "admin", fullName: "Abdul Alada", ipssNumber: "332211", phoneNumber: "07015500652" },
            { _id: new mongoose.Types.ObjectId(), role: "admin", fullName: "Abdul", ipssNumber: "332233", phoneNumber: "07015500655" },
            { _id: new mongoose.Types.ObjectId(), role: "admin", fullName: "Alada", ipssNumber: "332244", phoneNumber: "07015500650" }
        ]

        sinon.stub(User, "findOne").resolves(null);

        sinon.stub(User, "find").resolves(existingAdmins);

        sinon.stub(User.prototype, "save").resolves(
            {_id: new mongoose.Types.ObjectId(),
            ipssNumber: "332211",
            phoneNumber: "07015500652"
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
            ipssNumber: "332211",
            phoneNumber: "07015500652"
        }

        const existingAdmin = [
            { _id: new mongoose.Types.ObjectId(), role: "admin", fullName: "Abdul Alada", ipssNumber: "332211", phoneNumber: "07015500652" },
            { _id: new mongoose.Types.ObjectId(), role: "admin", fullName: "Abdul", ipssNumber: "332233", phoneNumber: "07015500655" }
        ]

        sinon.stub(User, "findOne").resolves(null);

        sinon.stub(User, "find").resolves(existingAdmin);

        sinon.stub(User.prototype, "save").resolves(
            {_id: new mongoose.Types.ObjectId(),
            ipssNumber: "332211",
            phoneNumber: "07015500652"
        });
        
        const res = await chai.request(server)
            .post("/api/auth/register/admin")
            .send(adminUser)

        expect(res).to.have.status(201);
        expect(res.body).to.have.property("message", "Admin account register successfully")

    })

});



describe("User controller user registration", () => {

    let adminToken, userToken, transporterStub, sendMailStub;
    
    beforeEach(function () {
        sinon.restore();
        
        adminToken = jwt.sign({ role: "admin" }, "secret");
        userToken = jwt.sign({ role: "user" }, "secret");
        // sinon.stub(passwordConfig, "generatePassword").returns("Password1")
        
        sinon.stub(jwt, "verify").callsFake((token, secret) => {
            if (token === adminToken) {
                return { id: "admin123", role: "admin", email: "admin@gmail.com" };
            } else if (token === userToken) {
                return { id: "user123", role: "user", email: "user@gmail.com" };
            }
            return null;
        });

        // transporterStub = sinon.stub(nodemailer, "createTransport").returns({
        //     sendMail: sinon.stub().yields(null, { response: "250 OK" }), // Simulate successful email sending
        // });

    });


    it("should register a user by an admin", async function () {
        this.timeout(10000)

        const newUser = {
            fullName: "Abdul Alada",
            ipssNumber: "332266",
            phoneNumber: "08066769442"
        }

        sinon.stub(User, "findOne").resolves(null)


        sinon.stub(User.prototype, "save").resolves({
            _id: new mongoose.Types.ObjectId(),
            ipssNumber: "332266",
            phoneNumber: "08066769442"
        })

        const res = await chai.request(server)
            .post("/api/auth/register")
            .send(newUser)
            .set('Authorization', `Bearer ${adminToken}`)

        expect(res).to.have.status(201);
        expect(res.body).to.have.property(
            "message", "User account register successfully")

        // expect(passwordConfig.generatePassword.calledOnce).to.be.true;
        // expect(transporterStub.calledOnce).to.be.true;
        // expect(transporterStub().sendMail.calledOnce).to.be.true;
    });


    it("should fail registration of user by a user account", async function() {

        const newUser = {
            fullName: "Abdul Alada",
            ipssNumber: "332266",
            phoneNumber: "08066769442"
        }

        sinon.stub(User, "findOne").resolves(null)

        sinon.stub(User.prototype, "save").resolves({
            _id: new mongoose.Types.ObjectId(),
            ipssNumber: "332266",
            phoneNumber: "08066769442"
        })

        const res = await chai.request(server)
            .post("/api/auth/register")
            .send(newUser)
            .set('Authorization', `Bearer ${userToken}`)

        expect(res).to.have.status(403);
        expect(res.body).to.have.property(
            "message", "Access denied")
    });


    it("should fail registration of user with existing ipssNumber or phoneNumber", async function() {

        const newUser = {
            fullName: "Abdul Alada",
            ipssNumber: "332211",
            phoneNumber: "07015500652"
        }

        const existingUser = {
            _id: new mongoose.Types.ObjectId,
            fullName: "Abdul Alada",
            role: "user",
            ipssNumber: "332211",
            phoneNumber: "07015500652"
        }

        sinon.stub(User, "findOne").resolves(existingUser);

        sinon.stub(User.prototype, "save").resolves({
            _id: new mongoose.Types.ObjectId(),
            ipssNumber: "332211",
            phoneNumber: "07015500652"
        })

        const res = await chai.request(server)
            .post("/api/auth/register")
            .send(newUser)
            .set('Authorization', `Bearer ${adminToken}`)

        expect(res).to.have.status(403);
        expect(res.body).to.have.property("error", "User with provided ipssNumber or phone Number already exist")

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
            phoneNumber: "07015500652",
            password: await bcrypt.hash("07015500652", 10)
        }

        sinon.stub(User, "findOne").resolves(userDetails)
        sinon.stub(bcrypt, "compare").resolves(true)
        sinon.stub(jwt, "sign").returns("token")

        const res = await chai.request(server)
            .post("/api/auth/login")
            .send({
                ipssNumber: "332266",
                password: "07015500652"
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
                ipssNumber: "334556",
                password: "Password123"
            })

        expect(res).to.have.status(404);
        expect(res.body).to.have.property("message", "No user found by this ipssNumber. Sign up!")
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
                ipssNumber: "332266",
                password: "Password1"
            })

        expect(res).to.have.status(400);
        expect(res.body).to.have.property("message", "Incorrect password or ipssNumber provided")
    });
})


// describe.only("User controller, Get 20 most recently created users", () => {

//     let adminToken, userToken;
    
//     beforeEach(function () {
//         sinon.restore();
        
//         adminToken = jwt.sign({ role: "admin" }, "secret");
//         userToken = jwt.sign({ role: "user" }, "secret");
        
//         sinon.stub(jwt, "verify").callsFake((token, secret) => {
//             if (token === adminToken) {
//                 return { id: "admin123", role: "admin", email: "admin@gmail.com" };
//             } else if (token === userToken) {
//                 return { id: "user123", role: "user", email: "user@gmail.com" };
//             }
//             return null;
//         });

//     });

//     it("should get at most 20 recently created users", async function() {

//         let existingUsers = [
//             { _id: new mongoose.Types.ObjectId(), role: "user", fullName: "Abdul", ipssNumber: "332211", phoneNumber: "07015500651", createdAt: new Date("2023-01-01") },
//             { _id: new mongoose.Types.ObjectId(), role: "user", fullName: "Abdul Alada", ipssNumber: "332222", phoneNumber: "07015500652", createdAt: new Date("2025-01-01") },
//             { _id: new mongoose.Types.ObjectId(), role: "user", fullName: "Abdul Yakub", ipssNumber: "332233", phoneNumber: "07015500653", createdAt: new Date("2020-01-01") },
//             { _id: new mongoose.Types.ObjectId(), role: "user", fullName: "Abdul Ala", ipssNumber: "332244", phoneNumber: "07015500655", createdAt: new Date("2021-01-01") },
//             { _id: new mongoose.Types.ObjectId(), role: "user", fullName: "Abdul ada", ipssNumber: "332255", phoneNumber: "07015500659", createdAt: new Date("2024-01-01") },
//             { _id: new mongoose.Types.ObjectId(), role: "user", fullName: "Rasheed", ipssNumber: "332266", phoneNumber: "07015500682", createdAt: new Date("2024-01-01") },
//             { _id: new mongoose.Types.ObjectId(), role: "user", fullName: "Nasiru", ipssNumber: "332277", phoneNumber: "07015510653", createdAt: new Date("2019-01-01") },
//         ]

//         sinon.stub(User, "find").returns({
//             sort: sinon.stub().callsFake(function () {
//                 existingUsers.sort((a, b) => b.createdAt - a.createdAt);
//                 return this;
//             }),
//             limit: sinon.stub().callsFake(function () {
//                 existingUsers = existingUsers.slice(0, 20);
//                 return this;
//             }),
//             select: sinon.stub().resolves(existingUsers),
//         });

//         const res = await chai.request(server)
//             .get("/api/auth/get-users")
//             .set('Authorization', `Bearer ${adminToken}`)

//         console.log(res.body)

//         expect(res).to.have.status(200);
//         expect(res.body.users[0].).to.be.equal("user2@gmail.com");
//         expect(res.body.users.length).to.be.at.most(20);
//     })
// })