import { Router } from 'express';
import healthCheck from './health-check.js';
import integratedAiRouter from './integrated-ai.js';
import adminPaymentsRouter from './admin-payments.js';
import poojaBookingRouter from './poojaBooking.js';

export default () => {
  const router = Router();
  router.get('/health', healthCheck);
  router.use('/integrated-ai', integratedAiRouter);
  router.use('/admin-payments', adminPaymentsRouter);
  router.use('/pooja-bookings', poojaBookingRouter);
  return router;
};