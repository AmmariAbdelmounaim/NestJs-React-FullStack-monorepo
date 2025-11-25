import { createFileRoute, Link } from '@tanstack/react-router';

import { Button } from '@/components/ui/button';
import {
  getBooksControllerFindOneQueryKey,
  useBooksControllerFindOne,
} from '@/api/generated/books/books';
import {
  BookDetailsCard,
  BookDetailsErrorState,
  BookDetailsSkeleton,
  InvalidBookIdState,
} from '@/features/books';
import { LoanBookButton } from '@/features/loans';

export const Route = createFileRoute('/(protected)/user/books/$bookId/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { bookId } = Route.useParams();
  const numericBookId = Number(bookId);
  const isValidBookId = Number.isInteger(numericBookId) && numericBookId > 0;

  const {
    data: book,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useBooksControllerFindOne(numericBookId, {
    query: {
      enabled: isValidBookId,
      queryKey: getBooksControllerFindOneQueryKey(Number(bookId)),
      select: (response) =>
        response.status === 200 ? response.data : undefined,
    },
  });

  const title = book?.title || 'Book details';

  const content = (() => {
    if (!isValidBookId) {
      return <InvalidBookIdState id={bookId} />;
    }

    if (isLoading) {
      return <BookDetailsSkeleton />;
    }

    if (isError) {
      return (
        <BookDetailsErrorState
          message={
            error instanceof Error
              ? error.message
              : 'Unable to load book information.'
          }
          onRetry={refetch}
        />
      );
    }

    if (!book) {
      return (
        <BookDetailsErrorState
          message="We couldn’t find a book with this ID."
          onRetry={refetch}
        />
      );
    }

    return (
      <BookDetailsCard book={book} isRefreshing={isFetching && !isLoading} />
    );
  })();

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm tracking-wider uppercase">
            Book overview
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        </div>

        <div className="flex gap-2">
          {isValidBookId && book ? (
            <LoanBookButton bookId={numericBookId} />
          ) : null}
          <Button asChild variant="outline">
            <Link to="/user/books">Back to catalog</Link>
          </Button>
        </div>
      </header>

      {content}
    </section>
  );
}
