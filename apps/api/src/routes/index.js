import { Router } from 'express';
import healthCheck from './health-check.js';
import integratedAiRouter from './integrated-ai.js';
import adminPaymentsRouter from './admin-payments.js';
import poojaBookingRouter from './poojaBooking.js';
import pendingSubscriptionsRouter from './pendingSubscriptions.js';

export default () => {
  const router = Router();
  router.get('/health', healthCheck);
  router.use('/integrated-ai', integratedAiRouter);
  router.use('/admin-payments', adminPaymentsRouter);
  router.use('/pooja-bookings', poojaBookingRouter);
  router.use('/pending-subscriptions', pendingSubscriptionsRouter);
  return router;
};