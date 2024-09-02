import axios from 'axios';

export async function getImageAsBase64(url: string): Promise<string> {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    // return `data:image/png;base64,${base64}`;
    return `data:image/svg+xml;base64,${base64}`;
}
