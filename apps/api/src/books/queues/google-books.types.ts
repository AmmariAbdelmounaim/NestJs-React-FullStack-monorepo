export interface EnrichBookJobData {
  bookId: number;
  isbn13?: string;
  isbn10?: string;
}

export interface CreateBookFromGoogleJobData {
  isbn: string;
}

export const GOOGLE_BOOKS_QUEUE_NAME = 'google-books';
export const ENRICH_BOOK_JOB_NAME = 'enrich-book';
export const CREATE_BOOK_FROM_GOOGLE_JOB_NAME = 'create-book-from-google';
