import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { URL } from 'url';

export interface ScrapedPage {
  url: string;
  title: string;
  content: string;
  checksum: string;
}

@Injectable()
export class CrawlerService {
  private readonly logger = new Logger(CrawlerService.name);

  public async crawlWebsite(
    startUrl: string,
    limit = 50,
    rateLimitMs = 200,
  ): Promise<ScrapedPage[]> {
    this.logger.log(
      `Crawling website starting from ${startUrl} (limit: ${limit})`,
    );

    const parsedStart = new URL(startUrl);
    const domain = parsedStart.hostname;

    const queue: string[] = [startUrl];
    const visited = new Set<string>();
    const results: ScrapedPage[] = [];

    while (queue.length > 0 && results.length < limit) {
      const url = queue.shift()!;
      if (visited.has(url)) {
        continue;
      }
      visited.add(url);

      this.logger.debug(`Crawling page: ${url}`);

      try {
        // Rate limiting
        if (rateLimitMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, rateLimitMs));
        }

        const response = await axios.get(url, {
          headers: { 'User-Agent': 'EasyDev-Knowledge-Crawler/1.0' },
          timeout: 10000,
        });

        const html = response.data;
        if (typeof html !== 'string') {
          continue;
        }

        // Parse page
        const title = this.extractTitle(html) || url;
        const text = this.extractTextContent(html);
        const checksum = crypto.createHash('sha256').update(text).digest('hex');

        results.push({
          url,
          title,
          content: text,
          checksum,
        });

        // Discover links
        const links = this.discoverLinks(html, url, domain);
        for (const link of links) {
          if (!visited.has(link) && !queue.includes(link)) {
            queue.push(link);
          }
        }
      } catch (err: any) {
        this.logger.error(`Failed to crawl page ${url}: ${err.message}`);
      }
    }

    return results;
  }

  public async parseSitemap(sitemapUrl: string): Promise<string[]> {
    this.logger.log(`Fetching and parsing sitemap: ${sitemapUrl}`);
    try {
      const response = await axios.get(sitemapUrl, {
        headers: { 'User-Agent': 'EasyDev-Knowledge-Crawler/1.0' },
        timeout: 15000,
      });

      const xml = response.data;
      if (typeof xml !== 'string') {
        return [];
      }

      // Simple regex-based <loc> extraction
      const locRegex = /<loc>(https?:\/\/[^\s<]+)<\/loc>/g;
      const urls: string[] = [];
      let match;
      while ((match = locRegex.exec(xml)) !== null) {
        urls.push(match[1]);
      }

      this.logger.log(`Discovered ${urls.length} URLs in sitemap`);
      return urls;
    } catch (err: any) {
      this.logger.error(`Sitemap parsing failed: ${err.message}`);
      return [];
    }
  }

  private extractTitle(html: string): string {
    const match = html.match(/<title>([^<]+)<\/title>/i);
    return match ? match[1].trim() : '';
  }

  private extractTextContent(html: string): string {
    // 1. Remove script/style tags
    let content = html.replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      '',
    );
    content = content.replace(
      /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
      '',
    );
    // 2. Remove comments
    content = content.replace(/<!--[\s\S]*?-->/g, '');
    // 3. Replace HTML entities
    content = content
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
    // 4. Remove all HTML tags
    content = content.replace(/<[^>]*>/g, ' ');
    // 5. Compress spacing
    return content.replace(/\s+/g, ' ').trim();
  }

  private discoverLinks(
    html: string,
    baseUrl: string,
    targetDomain: string,
  ): string[] {
    const links: string[] = [];
    const hrefRegex = /href="([^"]+)"/gi;
    let match;

    while ((match = hrefRegex.exec(html)) !== null) {
      try {
        const rawHref = match[1];
        if (
          rawHref.startsWith('javascript:') ||
          rawHref.startsWith('mailto:') ||
          rawHref.startsWith('#')
        ) {
          continue;
        }

        const absoluteUrl = new URL(rawHref, baseUrl);
        // Normalize (strip hashes)
        absoluteUrl.hash = '';

        // Check if same domain
        if (absoluteUrl.hostname === targetDomain) {
          links.push(absoluteUrl.toString());
        }
      } catch {
        // Ignore invalid URLs
      }
    }

    return Array.from(new Set(links));
  }
}
import * as crypto from 'crypto';
