import { getAccessToken } from '../lib/auth';

export interface Presentation {
  presentationId: string;
  title: string;
  slides?: Slide[];
}

export interface Slide {
  objectId: string;
  pageElements?: PageElement[];
}

export interface PageElement {
  objectId: string;
  size?: {
    width: { magnitude: number; unit: string };
    height: { magnitude: number; unit: string };
  };
  transform?: any;
  shape?: {
    shapeType: string;
    text?: {
      textElements: TextElement[];
    };
  };
}

export interface TextElement {
  startIndex?: number;
  endIndex?: number;
  textRun?: {
    content: string;
    style?: any;
  };
}

// 1. List slides from Google Drive
export const listPresentations = async (maxResults = 30): Promise<any[]> => {
  const token = await getAccessToken();
  if (!token) throw new Error('No access token available. Please sign in with Google.');

  const q = encodeURIComponent("mimeType = 'application/vnd.google-apps.presentation' and trashed = false");
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&pageSize=${maxResults}&fields=files(id,name,mimeType,modifiedTime,thumbnailLink,webViewLink)&orderBy=modifiedTime%20desc`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to list Slides: ${error.error?.message || 'Access Denied'}`);
  }

  const data = await response.json();
  return data.files || [];
};

// 2. Fetch specific presentation layout/structure
export const getPresentation = async (presentationId: string): Promise<Presentation> => {
  const token = await getAccessToken();
  if (!token) throw new Error('No access token available. Please sign in with Google.');

  const response = await fetch(
    `https://slides.googleapis.com/v1/presentations/${presentationId}`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to load slide structure: ${error.error?.message || 'Access Denied'}`);
  }

  return response.json();
};

// 3. Create a brand new Google Slides presentation
export const createPresentation = async (title: string): Promise<Presentation> => {
  const token = await getAccessToken();
  if (!token) throw new Error('No access token available. Please sign in with Google.');

  const response = await fetch(
    `https://slides.googleapis.com/v1/presentations`,
    {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create presentation: ${error.error?.message || 'Access Denied'}`);
  }

  return response.json();
};

// 4. Batch update slide content: Insert styled slides
export const addSlideToPresentation = async (
  presentationId: string, 
  title: string, 
  bodyContent: string
): Promise<void> => {
  const token = await getAccessToken();
  if (!token) throw new Error('No access token available. Please sign in with Google.');

  // Generate unique object IDs for placeholders to prevent conflicts
  const slideId = `slide_${Date.now()}`;
  const titleBoxId = `title_${Date.now()}`;
  const bodyBoxId = `body_${Date.now()}`;

  const requests = [
    {
      createSlide: {
        objectId: slideId,
        slideLayoutCategory: 'TITLE_AND_BODY',
        placeholderIdMappings: [
          {
            layoutPlaceholder: { type: 'TITLE', index: 0 },
            objectId: titleBoxId
          },
          {
            layoutPlaceholder: { type: 'BODY', index: 0 },
            objectId: bodyBoxId
          }
        ]
      }
    },
    {
      insertText: {
        objectId: titleBoxId,
        text: title
      }
    },
    {
      insertText: {
        objectId: bodyBoxId,
        text: bodyContent
      }
    }
  ];

  const response = await fetch(
    `https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to write slide content: ${error.error?.message || 'Access Denied'}`);
  }
};
