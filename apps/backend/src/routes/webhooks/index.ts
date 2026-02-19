import { Router } from 'express';
import dullyRouter from './dully.js';
import inmobileRouter from './inmobile.js';
import sendgridRouter from './sendgrid.js';

const router = Router();

// Mount integration webhook routes
router.use('/dully', dullyRouter);
// Note: EasyTable uses polling, not webhooks, so no route needed here

// Mount provider webhook routes
router.use('/inmobile', inmobileRouter);
router.use('/sendgrid', sendgridRouter);

export default router;
