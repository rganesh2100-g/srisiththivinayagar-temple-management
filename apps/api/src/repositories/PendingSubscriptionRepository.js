// ═══════════════════════════════════════════════════════════════════════════════
// PendingSubscriptionRepository — domain aggregate: pending subscriptions
//
// Model: PendingSubscription (prisma/schema.prisma)
//
// TODO — responsibilities introduced when the Pending Subscription domain is migrated:
//   - find pending subscriptions by id / by user
//   - list pending subscriptions awaiting approval
//   - create/update pending subscriptions
//   - manage the approval flow (approve, reject)
// ═══════════════════════════════════════════════════════════════════════════════

import BaseRepository from './BaseRepository.js';

class PendingSubscriptionRepository extends BaseRepository {
  constructor() {
    super();
  }
}

export default PendingSubscriptionRepository;
