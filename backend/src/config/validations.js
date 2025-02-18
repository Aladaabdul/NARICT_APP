const Joi = require("joi");

const ValidateUserData = (user, userRole) => {

    const userSchema = Joi.object({
        fullName: Joi.string().min(5).required(),
        email: Joi.string().email().required(),
        password: Joi.alternatives().conditional("role", {
            is: "admin",
            then: Joi.string()
            .pattern(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/)
            .required()
            .messages({
                "string.pattern.base": "Password must have at least 1 digit, 1 lowercase, 1 uppercase, and be at least 8 characters long."
            }),
            otherwise: Joi.forbidden()
        }),
        role: Joi.string().valid("admin", "user").default(userRole),
        ipssNumber: Joi.alternatives().conditional("role", {
            is: "user",
            then: Joi.number().integer().min(10000).max(999999).required().messages({
                "number.base": "ipssNumber must be a number.",
                "number.min": "ipssNumber must be at least 5 digits.",
                "number.max": "ipssNumber must be at most 6 digits.",
                "any.required": "ipssNumber is required for users."
            }),
            otherwise: Joi.forbidden() // Admins cannot have ipssNumber
        })
    });

    return userSchema.validate({ ...user, role: userRole }, { abortEarly: false });
};


const ValidateLoginData = (login) => {

    const loginSchema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string()
            .pattern(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/)
            .required()
            .messages({
                "string.pattern.base": "Invalid password or Email"
            }),
    });
    
    return loginSchema.validate({ ...login }, { abortEarly: false })
};

const ValidateChangePassword = (passwords) => {

    const PasswordSchema = Joi.object({
        oldPassword: Joi.string()
            .pattern(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/)
            .required()
            .messages({
                "string.pattern.base": "Old password does not match. Input correct Password"
            }),
        newPassword: Joi.string()
            .pattern(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/)
            .required()
            .messages({
                "string.pattern.base": "Password must have at least 1 digit, 1 lowercase, 1 uppercase, and be at least 8 characters long."
            }),
    });
    
    return PasswordSchema.validate({ ...passwords }, { abortEarly: false })
};

const ValidateForgotPassword = (login) => {

    const forgotSchema = Joi.object({
        email: Joi.string().email().required()
    });
    
    return forgotSchema.validate(login)
};

const ValidateResetData = (data) => {

    const resetPasswordSchema = Joi.object({
        token: Joi.string().required(),
        newPassword: Joi.string()
            .pattern(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/)
            .required()
            .messages({
                "string.pattern.base": "Password must have at least 1 digit, 1 lowercase, 1 uppercase, and be at least 8 characters long."
            }),
    });

    return resetPasswordSchema.validate(data)
}


const ValidateIpss = (ipss) => {

    const ipssNumber = Joi.object({
        ipssNumber: Joi.number().integer().min(10000).max(999999).required().messages({
            "number.base": "ipssNumber must be a number.",
            "number.min": "ipssNumber must be at least 5 digits.",
            "number.max": "ipssNumber must be at most 6 digits.",
            "any.required": "ipssNumber is required"
        }),
    })

    return ipssNumber.validate(ipss)
}


module.exports = { 
    ValidateUserData,
    ValidateLoginData,
    ValidateChangePassword,
    ValidateForgotPassword,
    ValidateResetData,
    ValidateIpss
}