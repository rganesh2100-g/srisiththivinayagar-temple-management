import { Router } from 'express';
import healthCheck from './health-check.js';
import integratedAiRouter from './integrated-ai.js';
import adminPaymentsRouter from './admin-payments.js';
import poojaBookingRouter from './poojaBooking.js';
import pendingSubscriptionsRouter from './pendingSubscriptions.js';
import authRouter from './auth.js';
import usersRouter from './users.js';
import bookingMirrorRouter from './bookingMirror.js';
import donationMirrorRouter from './donationMirror.js';
import paymentMirrorRouter from './paymentMirror.js';

export default () => {
  const router = Router();
  router.get('/health', healthCheck);
  router.use('/integrated-ai', integratedAiRouter);
  router.use('/admin-payments', adminPaymentsRouter);
  router.use('/pooja-bookings', poojaBookingRouter);
  router.use('/pending-subscriptions', pendingSubscriptionsRouter);
  router.use('/auth', authRouter);
  router.use('/users', usersRouter);
  router.use('/internal/booking-mirror', bookingMirrorRouter);
  router.use('/internal/donation-mirror', donationMirrorRouter);
  router.use('/internal/payment-mirror', paymentMirrorRouter);
  return router;
};