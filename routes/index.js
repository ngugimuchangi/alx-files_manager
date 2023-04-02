import { Router } from 'express';
import { getStatus, getStats } from '../controllers/AppController';
import postNew from '../controllers/UserController';

// App router
const router = Router();

router.get('/status', getStatus);
router.get('/stats', getStats);
router.post('/users', postNew);

export default router;
