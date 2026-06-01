import pb from '@/lib/pocketbaseClient.js';

export const useUserIdGenerator = () => {
  const generateUserId = async (email) => {
    if (!email || typeof email !== 'string') return null;

    // Extract email prefix (part before @)
    const prefix = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    
    if (!prefix) {
      return `user_${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
    }

    try {
      // Query users collection to find all existing usernames with that prefix
      const records = await pb.collection('users').getFullList({
        filter: `username ~ "^${prefix}_"`,
        $autoCancel: false
      });

      let maxNum = 0;
      
      records.forEach(record => {
        const username = record.username || '';
        const parts = username.split('_');
        
        if (parts.length > 1) {
          const numStr = parts[parts.length - 1];
          // Ensure it's purely numeric before parsing
          if (/^\d+$/.test(numStr)) {
            const num = parseInt(numStr, 10);
            if (!isNaN(num) && num > maxNum) {
              maxNum = num;
            }
          }
        }
      });

      // Increment counter
      const nextNum = maxNum + 1;
      
      // Format as '{prefix}_{counter:05d}'
      return `${prefix}_${nextNum.toString().padStart(5, '0')}`;
    } catch (error) {
      console.error('Error generating user ID:', error);
      // Fallback on error to ensure signup isn't blocked
      return `${prefix}_${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
    }
  };

  return { generateUserId };
};