-- ===============================================
-- 004_create_triggers.sql
-- Create triggers for automatic updates
-- ===============================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := CLOCK_TIMESTAMP();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
CREATE TRIGGER trg_upd_users 
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_upd_books 
    BEFORE UPDATE ON books
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_upd_authors 
    BEFORE UPDATE ON authors
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_upd_loans 
    BEFORE UPDATE ON loans
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_upd_cards 
    BEFORE UPDATE ON membership_cards
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION books_search_vector_tgr()
RETURNS TRIGGER AS $$
DECLARE
    v_author_names TEXT;
BEGIN
    -- Aggregate all author names for this book
    SELECT COALESCE(
        string_agg(
            COALESCE(a.first_name || ' ', '') || a.last_name, 
            ' '
        ), 
        ''
    ) INTO v_author_names
    FROM book_authors ba
    JOIN authors a ON ba.author_id = a.id
    WHERE ba.book_id = NEW.id;
    
    -- Build search vector with title, description, genre, and authors
    NEW.search_vector :=
        to_tsvector('simple', coalesce(NEW.title, '')) ||
        to_tsvector('simple', coalesce(NEW.description, '')) ||
        to_tsvector('simple', coalesce(NEW.genre, '')) ||
        to_tsvector('simple', coalesce(v_author_names, ''));
    
    RETURN NEW; 
END;
$$ LANGUAGE plpgsql;

-- Apply search vector trigger to books
CREATE TRIGGER trg_books_search_vector
    BEFORE INSERT OR UPDATE ON books
    FOR EACH ROW EXECUTE FUNCTION books_search_vector_tgr();

-- Trigger to update search_vector when book_authors changes
CREATE OR REPLACE FUNCTION update_book_search_vector_on_author_change()
RETURNS TRIGGER AS $$
DECLARE
    v_book_id BIGINT;
    v_title TEXT;
    v_description TEXT;
    v_genre TEXT;
    v_author_names TEXT;
BEGIN
    -- Get the book_id from NEW or OLD
    v_book_id := COALESCE(NEW.book_id, OLD.book_id);
    
    -- Get book details
    SELECT title, description, genre
    INTO v_title, v_description, v_genre
    FROM books
    WHERE id = v_book_id;
    
    -- Aggregate all author names for this book
    SELECT COALESCE(
        string_agg(
            COALESCE(a.first_name || ' ', '') || a.last_name, 
            ' '
        ), 
        ''
    ) INTO v_author_names
    FROM book_authors ba
    JOIN authors a ON ba.author_id = a.id
    WHERE ba.book_id = v_book_id;
    
    -- Update the search_vector for the affected book
    UPDATE books
    SET search_vector = 
        to_tsvector('simple', coalesce(v_title, '')) ||
        to_tsvector('simple', coalesce(v_description, '')) ||
        to_tsvector('simple', coalesce(v_genre, '')) ||
        to_tsvector('simple', coalesce(v_author_names, ''))
    WHERE id = v_book_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER trg_book_authors_search_vector
    AFTER INSERT OR UPDATE OR DELETE ON book_authors
    FOR EACH ROW EXECUTE FUNCTION update_book_search_vector_on_author_change();
-- Log trigger creation
DO $$
BEGIN
    RAISE NOTICE '✓ All triggers created successfully';
END $$;

