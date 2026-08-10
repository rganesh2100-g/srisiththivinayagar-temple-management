// ═══════════════════════════════════════════════════════════════════════════════
// SubscriptionRepository — domain aggregate: subscriptions
//
// Model: Subscription (prisma/schema.prisma)
//
// TODO — responsibilities introduced when the Subscription domain is migrated:
//   - find subscriptions by id / by user
//   - list subscriptions with status filters and pagination
//   - create/update subscriptions
//   - manage subscription lifecycle (activation, renewal, expiry, reminders)
// ═══════════════════════════════════════════════════════════════════════════════

import BaseRepository from './BaseRepository.js';

class SubscriptionRepository extends BaseRepository {
  constructor() {
    super();
  }
}

export default SubscriptionRepository;
