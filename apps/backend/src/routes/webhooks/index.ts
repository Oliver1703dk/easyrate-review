import { Router } from 'express';
import dullyRouter from './dully.js';
import gatewayapiRouter from './gatewayapi.js';
import sendgridRouter from './sendgrid.js';

const router = Router();

// Mount integration webhook routes
router.use('/dully', dullyRouter);
// Note: EasyTable uses polling, not webhooks, so no route needed here

// Mount provider webhook routes
router.use('/gatewayapi', gatewayapiRouter);
router.use('/sendgrid', sendgridRouter);

export default router;
