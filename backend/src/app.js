const express = require("express");
require('dotenv').config();
const SwaggerUI = require("swagger-ui-express");
const yaml = require("js-yaml")
const fs = require("fs")
const path = require("path")
const cors = require("cors")
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const { ConnectTOMongo } = require("./config/db")
const userRouter = require("./routes/userRoute")
const savingRouter = require("./routes/savingRoute")
const loanRouter = require("./routes/loanRoute")
const dashboardRouter = require("./routes/dashboardRoute");

const app = express()
const PORT = 8000 || process.env.PORT

ConnectTOMongo();

app.use(express.json())

app.use(cors({ origin: "*" }));

//enable helmet
app.use(helmet())

// CDN CSS
const CSS_URL = "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.3.0/swagger-ui.min.css";

const swaggerDocument = yaml.load(
    fs.readFileSync(path.join(__dirname, "../public/swagger.yaml"), 'utf-8')
);

app.use(express.static(path.join(__dirname, "../public")));

app.use(
    '/api-docs',
    SwaggerUI.serve,
    SwaggerUI.setup(swaggerDocument, {
      customCss:
        '.swagger-ui .opblock .opblock-summary-path-description-wrapper { align-items: center; display: flex; flex-wrap: wrap; gap: 0 10px; padding: 0 10px; width: 100%; }',
      customCssUrl: CSS_URL,
    }),
  );

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: "Too many requests from this IP, please try again later"
});

//apply rate limiting to all routes
app.use(apiLimiter)


app.use('/api/auth', userRouter);
app.use('/api/saving', savingRouter);
app.use('/api/loan', loanRouter);
app.use('/api/dashboard', dashboardRouter);



app.listen(PORT, () => {
    console.log(`Server is running on PORT ${PORT}`)
})


module.exports = app