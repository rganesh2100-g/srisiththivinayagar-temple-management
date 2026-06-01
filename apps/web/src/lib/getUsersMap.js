import pb from '@/lib/pocketbaseClient.js';

export const getUsersMap = async () => {
  try {
    const users = await pb.collection('users').getFullList({ 
      $autoCancel: false,
      fields: 'id,email,username,name' // Optimize payload
    });
    
    const usersMap = new Map();
    
    users.forEach(u => {
      usersMap.set(u.id, {
        email: u.email || 'N/A',
        user_id: u.username || 'N/A', // Auto-generated ID is stored in username
        name: u.name || 'Unnamed User'
      });
    });
    
    return usersMap;
  } catch (error) {
    console.error('Error fetching users map:', error);
    return new Map();
  }
};