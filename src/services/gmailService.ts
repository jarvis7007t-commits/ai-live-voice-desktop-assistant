import { getAccessToken } from '../lib/auth';

export interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  from?: string;
  subject?: string;
  date?: string;
  body?: string;
}

// Recursive helper function to extract email body from payload parts
const getBody = (payload: any): string => {
  if (!payload) return '';
  
  if (payload.body?.data) {
    return urlSafeBase64Decode(payload.body.data);
  }
  
  if (payload.parts) {
    let htmlBody = '';
    let plainBody = '';
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html') {
        htmlBody = getBody(part);
      } else if (part.mimeType === 'text/plain') {
        plainBody = getBody(part);
      } else if (part.parts) {
        const nested = getBody(part);
        if (nested) {
          if (part.mimeType.startsWith('multipart/alternative')) {
            return nested;
          }
          if (!htmlBody && !plainBody) {
            plainBody = nested;
          }
        }
      }
    }
    return htmlBody || plainBody;
  }
  
  return '';
};

// URL-safe base64 decoding helper
const urlSafeBase64Decode = (str: string): string => {
  if (!str) return '';
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  try {
    return decodeURIComponent(escape(atob(str)));
  } catch (e) {
    try {
      return atob(str);
    } catch (err) {
      return '';
    }
  }
};

export const listEmails = async (maxResults = 10): Promise<GmailMessage[]> => {
  const token = await getAccessToken();
  if (!token) throw new Error('No access token available. Please sign in.');

  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gmail API error: ${error.error.message}`);
  }

  const data = await response.json();
  const messages = data.messages || [];

  const detailedMessages = await Promise.all(
    messages.map(async (msg: { id: string }) => {
      const details = await getEmailDetails(msg.id);
      return details;
    })
  );

  return detailedMessages;
};

export const getEmailDetails = async (messageId: string): Promise<GmailMessage> => {
  const token = await getAccessToken();
  if (!token) throw new Error('No access token available. Please sign in.');

  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gmail API error: ${error.error.message}`);
  }

  const data = await response.json();
  const headers = data.payload?.headers || [];

  const from = headers.find((h: any) => h.name?.toLowerCase() === 'from')?.value;
  const subject = headers.find((h: any) => h.name?.toLowerCase() === 'subject')?.value;
  const date = headers.find((h: any) => h.name?.toLowerCase() === 'date')?.value;

  const body = getBody(data.payload);

  return {
    id: data.id,
    threadId: data.threadId,
    snippet: data.snippet,
    from,
    subject,
    date,
    body,
  };
};

export const sendEmail = async (to: string, subject: string, body: string): Promise<void> => {
  const token = await getAccessToken();
  if (!token) throw new Error('No access token available. Please sign in.');

  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const messageParts = [
    `To: ${to}`,
    `Subject: ${utf8Subject}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'MIME-Version: 1.0',
    '',
    body,
  ];
  const message = messageParts.join('\n');

  // The message needs to be base64url encoded.
  const encodedMessage = btoa(unescape(encodeURIComponent(message)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: encodedMessage,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gmail API error: ${error.error.message}`);
  }
};
