-- ===============================================
-- 003_create_indexes.sql
-- Create indexes for performance optimization
-- ===============================================

-- Users indexes
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);
-- Membership cards indexes
CREATE INDEX idx_membership_cards_status_serial
    ON membership_cards (status, serial_number);

-- Unique index: one active card per user
CREATE UNIQUE INDEX uniq_membership_cards_user_active
    ON membership_cards (user_id) WHERE status = 'IN_USE';

-- Authors indexes
CREATE INDEX idx_authors_last_name ON authors(last_name);

-- Books indexes
CREATE UNIQUE INDEX uniq_books_isbn_13
    ON books (isbn_13) WHERE isbn_13 IS NOT NULL;
CREATE UNIQUE INDEX uniq_books_isbn_10
    ON books (isbn_10) WHERE isbn_10 IS NOT NULL;

CREATE INDEX idx_books_genre ON books(genre);
CREATE INDEX idx_books_title ON books(title);

CREATE INDEX idx_books_search_vector
    ON books USING GIN (search_vector);

-- Loans indexes
CREATE INDEX idx_loans_user_id ON loans(user_id);

CREATE INDEX idx_loans_book_id ON loans(book_id);

-- Unique index: only one ongoing loan per book
CREATE UNIQUE INDEX uniq_loans_book_ongoing
    ON loans (book_id) WHERE returned_at IS NULL;

CREATE INDEX idx_book_authors_book_id ON book_authors(book_id);
CREATE INDEX idx_book_authors_author_id ON book_authors(author_id);

-- Log index creation
DO $$
BEGIN
    RAISE NOTICE '✓ All indexes created successfully';
END $$;

