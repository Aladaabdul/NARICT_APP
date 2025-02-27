const express = require("express");
require('dotenv').config();
const SwaggerUI = require("swagger-ui-express");
const yaml = require("js-yaml")
const fs = require("fs")
const path = require("path")
const cors = require("cors")
const { ConnectTOMongo } = require("./config/db")
const userRouter = require("./routes/userRoute")
const savingRouter = require("./routes/savingRoute")
const loanRouter = require("./routes/loanRoute")

const app = express()
const PORT = 8000 || process.env.PORT

ConnectTOMongo();

app.use(express.json())

app.use(cors());

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


app.use('/api/auth', userRouter);
app.use('/api/saving', savingRouter);
app.use('/api/loan', loanRouter);



app.listen(PORT, () => {
    console.log(`Server is running on PORT ${PORT}`)
})


module.exports = app