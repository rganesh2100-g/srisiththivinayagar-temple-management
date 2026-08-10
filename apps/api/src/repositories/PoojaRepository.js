// ═══════════════════════════════════════════════════════════════════════════════
// PoojaRepository — domain aggregate: poojas and pooja bookings
//
// Models: Pooja, PoojaBooking (prisma/schema.prisma)
//
// TODO — responsibilities introduced when the Pooja domain is migrated:
//   - find poojas by id
//   - list poojas with availability and pagination
//   - create/update poojas (name, price, timings, availability)
//   - find/list/create pooja bookings
//   - archive expired poojas (see src/utils/autoArchivePoojas.js)
// ═══════════════════════════════════════════════════════════════════════════════

import BaseRepository from './BaseRepository.js';

class PoojaRepository extends BaseRepository {
  constructor() {
    super();
  }
}

export default PoojaRepository;
