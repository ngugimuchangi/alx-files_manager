import express from 'express';
import router from './routes/index';

// Express server
const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded());
app.use(router);
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
