import express from 'express';
import router from './routes/index';
import unmatchedRouteHandler from './middleware/unmatched';
import errorHandler from './middleware/error';

// Express server
const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(router);
app.use(unmatchedRouteHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
