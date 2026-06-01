import { useEffect } from 'react';
import pb from '@/lib/pocketbaseClient';

export const useAutoArchivePooja = () => {
  useEffect(() => {
    const checkAndArchive = async () => {
      try {
        // Fetch approved bookings
        const bookings = await pb.collection('pooja_bookings').getFullList({
          filter: 'status="approved"',
          $autoCancel: false
        });

        const now = new Date();

        for (const booking of bookings) {
          if (!booking.selected_date || !booking.selected_time) continue;

          // Construct datetime string (assuming selected_date is YYYY-MM-DD and selected_time is HH:MM AM/PM)
          // This is a simplified check. In a real app, parse the time properly.
          const bookingDate = new Date(booking.selected_date);
          
          // If the date has passed (ignoring exact time for simplicity in this check, or add time parsing)
          if (bookingDate < now && bookingDate.toDateString() !== now.toDateString()) {
            
            // Fetch related pooja and user details
            const pooja = await pb.collection('poojas').getOne(booking.pooja_id, { $autoCancel: false }).catch(() => null);
            const user = await pb.collection('users').getOne(booking.user_id, { $autoCancel: false }).catch(() => null);

            if (pooja && user) {
              // Create archive record
              await pb.collection('pooja_archive').create({
                original_pooja_id: pooja.id,
                original_booking_id: booking.id,
                god: pooja.god,
                pooja_name: pooja.pooja_name,
                category: pooja.category,
                user_name: user.name || 'Unknown',
                user_email: user.email,
                selected_date: booking.selected_date,
                selected_time: booking.selected_time,
                donation_amount: booking.donation_amount,
                receipt_number: booking.transaction_id || 'N/A', // Fallback if no receipt generated
                archive_month: `${bookingDate.getFullYear()}-${String(bookingDate.getMonth() + 1).padStart(2, '0')}`
              }, { $autoCancel: false });

              // Update booking status
              await pb.collection('pooja_bookings').update(booking.id, {
                status: 'archived'
              }, { $autoCancel: false });
            }
          }
        }
      } catch (error) {
        console.error('Auto-archive error:', error);
      }
    };

    checkAndArchive();
    // Run once on mount
  }, []);
};