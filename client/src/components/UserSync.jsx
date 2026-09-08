import { useEffect, useRef } from 'react';
import { useUser } from '@clerk/react';

const UserSync = () => {
  const { user, isLoaded, isSignedIn } = useUser();
  const lastSyncedId = useRef(null);

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      // Avoid repetitive syncs within the same session if user id hasn't changed
      if (lastSyncedId.current === user.id) {
        return;
      }

      const syncUserData = async () => {
        try {
          const rawBackendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
          const backendUrl = rawBackendUrl.replace(/\/+$/, ''); // Remove trailing slash
          
          const email =
            user.primaryEmailAddress?.emailAddress ||
            user.emailAddresses?.[0]?.emailAddress ||
            '';
          
          const name =
            user.fullName ||
            `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
            user.username ||
            'User';
          
          const image = user.imageUrl || '';

          const response = await fetch(`${backendUrl}/api/user/sync`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: user.id,
              name,
              email,
              image,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`User sync failed (${response.status}):`, errorText);
            return;
          }

          const data = await response.json();
          if (data.success) {
            lastSyncedId.current = user.id;
            console.log('✅ User successfully synced to MongoDB:', data.user);
          }
        } catch (error) {
          console.error('❌ Error syncing user to MongoDB:', error);
        }
      };

      syncUserData();
    } else if (!isSignedIn) {
      lastSyncedId.current = null;
    }
  }, [isLoaded, isSignedIn, user]);

  return null;
};

export default UserSync;
