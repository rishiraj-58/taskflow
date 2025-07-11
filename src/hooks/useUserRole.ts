import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';

type UserRole = 'WORKSPACE_CREATOR' | 'PROJECT_MANAGER' | 'DEVELOPER' | 'STAKEHOLDER' | 'TEAM_LEAD';

interface UserData {
  id: string;
  primaryRole: UserRole;
  firstName: string;
  lastName: string;
  email: string;
}

export function useUserRole() {
  const { user, isLoaded } = useUser();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !user) {
      setLoading(false);
      return;
    }

    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/user/profile');
        if (response.ok) {
          const data = await response.json();
          setUserData(data);
        } else {
          setError('Failed to fetch user data');
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Failed to fetch user data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user, isLoaded]);

  return {
    userData,
    role: userData?.primaryRole || null,
    loading,
    error,
    isLoaded: isLoaded && !loading,
  };
} 