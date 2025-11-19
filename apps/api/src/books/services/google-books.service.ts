// apps/api/src/books/services/google-books.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import type { books_v1 } from 'googleapis';
import { WithErrorHandling } from '../../utils/with-error-handling.decorator';
import type { BookInsert } from '../../db';

@Injectable()
export class GoogleBooksService {
  private readonly books: books_v1.Books;
  private readonly apiKey?: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GOOGLE_BOOKS_API_KEY');
    this.books = google.books({
      version: 'v1',
      auth: this.apiKey,
    });
  }

  @WithErrorHandling('GoogleBooksService', 'searchByIsbn13')
  async searchByIsbn13(isbn13: string): Promise<books_v1.Schema$Volume | null> {
    try {
      // Remove any hyphens from ISBN
      const cleanIsbn = isbn13.replace(/-/g, '');
      const query = `isbn:${cleanIsbn}`;

      const response = await this.books.volumes.list({
        q: query,
        maxResults: 1,
      });

      if (response.data.items && response.data.items.length > 0) {
        return response.data.items[0];
      }
      return null;
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to search Google Books by ISBN-13 ${isbn13}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  @WithErrorHandling('GoogleBooksService', 'searchByIsbn10')
  async searchByIsbn10(isbn10: string): Promise<books_v1.Schema$Volume | null> {
    try {
      // Remove any hyphens from ISBN
      const cleanIsbn = isbn10.replace(/-/g, '');
      const query = `isbn:${cleanIsbn}`;

      const response = await this.books.volumes.list({
        q: query,
        maxResults: 1,
      });

      if (response.data.items && response.data.items.length > 0) {
        return response.data.items[0];
      }
      return null;
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to search Google Books by ISBN-10 ${isbn10}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  @WithErrorHandling('GoogleBooksService', 'searchByTitle')
  async searchByTitle(
    title: string,
    author?: string,
    maxResults = 10,
  ): Promise<books_v1.Schema$Volume[]> {
    try {
      let query = `intitle:${encodeURIComponent(title)}`;
      if (author) {
        query += `+inauthor:${encodeURIComponent(author)}`;
      }

      const response = await this.books.volumes.list({
        q: query,
        maxResults: Math.min(maxResults, 40), // API max is 40
      });

      return response.data.items || [];
    } catch (error) {
      throw new InternalServerErrorException(
        `Error searching Google Books by title ${title}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  @WithErrorHandling('GoogleBooksService', 'search')
  async search(
    query: string,
    maxResults = 10,
  ): Promise<books_v1.Schema$Volume[]> {
    try {
      const response = await this.books.volumes.list({
        q: query,
        maxResults: Math.min(maxResults, 40), // API max is 40
      });

      return response.data.items || [];
    } catch (error) {
      throw new InternalServerErrorException(
        `Error searching Google Books with query "${query}": ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  @WithErrorHandling('GoogleBooksService', 'transformToBookData')
  transformToBookData(volume: books_v1.Schema$Volume): BookInsert {
    const volumeInfo = volume.volumeInfo;
    if (!volumeInfo) {
      throw new Error('Volume info is missing');
    }

    // Extract ISBNs
    let isbn10: string | null = null;
    let isbn13: string | null = null;

    if (volumeInfo.industryIdentifiers) {
      for (const identifier of volumeInfo.industryIdentifiers) {
        if (identifier.type === 'ISBN_10') {
          isbn10 = identifier.identifier || null;
        } else if (identifier.type === 'ISBN_13') {
          isbn13 = identifier.identifier || null;
        }
      }
    }

    // Extract publication date (handle various formats: YYYY, YYYY-MM, YYYY-MM-DD)
    let publicationDate: string | null = null;
    if (volumeInfo.publishedDate) {
      const dateStr = volumeInfo.publishedDate;
      if (dateStr.length === 4) {
        // Just year, use January 1st
        publicationDate = `${dateStr}-01-01`;
      } else if (dateStr.length === 7) {
        // Year and month, use first day
        publicationDate = `${dateStr}-01`;
      } else {
        // Full date
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          publicationDate = date.toISOString().split('T')[0]; // YYYY-MM-DD format
        }
      }
    }

    // Get the best available cover image (prefer larger sizes)
    let coverImageUrl: string | null = null;
    if (volumeInfo.imageLinks) {
      coverImageUrl =
        volumeInfo.imageLinks.extraLarge ||
        volumeInfo.imageLinks.large ||
        volumeInfo.imageLinks.medium ||
        volumeInfo.imageLinks.small ||
        volumeInfo.imageLinks.thumbnail ||
        null;

      // Replace http with https and remove zoom parameter for better quality
      if (coverImageUrl) {
        coverImageUrl = coverImageUrl
          .replace('http://', 'https://')
          .replace(/&zoom=\d+/, '')
          .replace('&edge=curl', '');
      }
    }

    // Use first category as genre, or null
    const genre = volumeInfo.categories?.[0] || null;

    return {
      title: volumeInfo.title || '',
      isbn10,
      isbn13,
      genre,
      publicationDate,
      description: volumeInfo.description || null,
      coverImageUrl,
      externalSource: 'google_books',
      externalId: volume.id || '',
      externalMetadata: {
        subtitle: volumeInfo.subtitle,
        publisher: volumeInfo.publisher,
        pageCount: volumeInfo.pageCount,
        language: volumeInfo.language,
        categories: volumeInfo.categories,
        authors: volumeInfo.authors,
        averageRating: volumeInfo.averageRating,
        ratingsCount: volumeInfo.ratingsCount,
        maturityRating: volumeInfo.maturityRating,
        previewLink: volumeInfo.previewLink,
        infoLink: volumeInfo.infoLink,
        canonicalVolumeLink: volumeInfo.canonicalVolumeLink,
        saleInfo: volume.saleInfo,
        accessInfo: volume.accessInfo,
      },
    };
  }
}
