import { Router } from 'express';
import appRouter from './app';
import authRouter from './auth';
import usersRouter from './users';
import filesRouter from './files';

// App router
const router = Router();
router.use(appRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(filesRouter);
/**
 * @apiDefine XToken
 * @apiHeader {String} X-Token Users access token
 * @apiHeaderExample Header-Example:
 * "X-Token": "a57826f0-c383-4013-b29e-d18c2e68900d"
 */
/**
 * @apiDefine Unauthorized
 * @apiError UnauthorizedAccess Invalid or missing token
 */
/**
 * @apiDefine NotFound
 * @apiError NotFound File not found
 */

export default router;
