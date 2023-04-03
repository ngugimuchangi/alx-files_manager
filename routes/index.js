import { Router } from 'express';
import { getStatus, getStats } from '../controllers/AppController';
import { getConnect, getDisconnect, getMe } from '../controllers/AuthController';
import postNew from '../controllers/UserController';

// App router
const router = Router();

router.get('/status', getStatus);
router.get('/stats', getStats);
router.post('/users', postNew);
router.get('/connect', getConnect);
router.get('/disconnect', getDisconnect);
router.get('/users/me', getMe);

export default router;
