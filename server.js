import express from 'express';
import bodyParser from 'body-parser';
import router from './routes/index';

// Express server
const app = express();
const PORT = process.env.PORT || 5000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(router);
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
