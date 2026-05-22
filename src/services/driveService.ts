import { getAccessToken } from '../lib/auth';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime: string;
  thumbnailLink?: string;
  webViewLink?: string;
}

export const listDriveFiles = async (maxResults = 25): Promise<DriveFile[]> => {
  const token = await getAccessToken();
  if (!token) throw new Error('No access token available. Please sign in with Google.');

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?pageSize=${maxResults}&fields=nextPageToken,files(id,name,mimeType,size,createdTime,thumbnailLink,webViewLink)&orderBy=createdTime%20desc`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Drive API error: ${error.error?.message || 'Failed to list files'}`);
  }

  const data = await response.json();
  return data.files || [];
};

export const deleteDriveFile = async (fileId: string): Promise<void> => {
  const token = await getAccessToken();
  if (!token) throw new Error('No access token available. Please sign in with Google.');

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Drive API error: ${error.error?.message || 'Failed to delete file'}`);
  }
};

export const uploadDriveFile = async (file: File): Promise<DriveFile> => {
  const token = await getAccessToken();
  if (!token) throw new Error('No access token available. Please sign in with Google.');

  // Create multipart body
  const metadata = {
    name: file.name,
    mimeType: file.type,
  };

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  form.append('file', file);

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,createdTimeBrief,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Drive API error: ${error.error?.message || 'Failed to upload file'}`);
  }

  return response.json();
};
