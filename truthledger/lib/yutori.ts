const BASE_URL = process.env.YUTORI_BASE_URL || 'https://api.yutori.ai';

export async function scrapeUrl(url: string): Promise<{ text: string; success: boolean }> {
  try {
    const response = await fetch(`${BASE_URL}/v1/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.YUTORI_API_KEY}`
      },
      body: JSON.stringify({
        url,
        wait_for_selector: 'body',
        scroll: true,
        extract_text: true,
      })
    });

    if (!response.ok) throw new Error(`Yutori error: ${response.status}`);
    const data = await response.json();
    return { text: data.text || data.content || '', success: true };
  } catch (err) {
    console.error('Yutori scrape error:', err);
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const html = await res.text();
      const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      return { text: text.slice(0, 10000), success: false };
    } catch {
      return { text: '', success: false };
    }
  }
}
