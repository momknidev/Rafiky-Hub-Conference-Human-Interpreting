"use server";

export async function getSonioxToken() {
  const host = process.env.SONIOX_API_HOST || 'https://api.soniox.com';
  const response = await fetch(`${host}/v1/auth/temporary-api-key`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.SONIOX_API_KEY}`,
    },
    body: JSON.stringify({
      usage_type: 'transcribe_websocket',
      expires_in_seconds: 1 * 60 * 60, // 1 hour
    }),
  });

  if (!response.ok) {
    console.error('Failed to get Soniox token', response.statusText);
    return null;
  }

  const data = await response.json();
  console.log('Soniox token', data.api_key);
  return data.api_key;
}