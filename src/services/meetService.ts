import { getAccessToken } from '../lib/auth';

export interface MeetSpace {
  name: string; // "spaces/abc-defg-hij"
  meetingUri: string; // "https://meet.google.com/abc-defg-hij"
  meetingCode: string; // "abc-defg-hij"
  config?: {
    accessType?: 'OPEN' | 'TRUSTED' | 'RESTRICTED' | string;
    entryPointAccess?: 'ALL' | 'CREATOR_ONLY_FREE' | string;
  };
}

export const createMeetSpace = async (accessType: 'OPEN' | 'TRUSTED' | 'RESTRICTED' = 'OPEN'): Promise<MeetSpace> => {
  const token = await getAccessToken();
  if (!token) throw new Error('No access token available. Please sign in with Google.');

  const response = await fetch(
    'https://meet.googleapis.com/v2/spaces',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        config: {
          accessType: accessType,
        }
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Google Meet API error: ${error.error?.message || 'Failed to create Meet Space'}`);
  }

  const data = await response.json();
  return data;
};

export const getMeetSpace = async (spaceId: string): Promise<MeetSpace> => {
  const token = await getAccessToken();
  if (!token) throw new Error('No access token available. Please sign in with Google.');

  // spaceId can be "spaces/abc-defg-hij" or just "abc-defg-hij"
  const formattedId = spaceId.startsWith('spaces/') ? spaceId : `spaces/${spaceId}`;

  const response = await fetch(
    `https://meet.googleapis.com/v2/${formattedId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Google Meet API error: ${error.error?.message || 'Failed to fetch Meet Space'}`);
  }

  const data = await response.json();
  return data;
};
