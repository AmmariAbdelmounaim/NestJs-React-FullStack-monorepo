import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  useBooksControllerFindOne,
  useBooksControllerRemove,
  getBooksControllerFindOneQueryKey,
  getBooksControllerSearchSimpleQueryKey,
} from '@/api/generated/books/books';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  BookDetailsCard,
  BookDetailsErrorState,
  BookDetailsSkeleton,
  InvalidBookIdState,
} from '@/features/books';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Pen, Trash2 } from 'lucide-react';
import { getErrorMessage } from '@/lib/api-errors';

export const Route = createFileRoute('/(protected)/admin/books/$bookId/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { bookId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const numericBookId = Number(bookId);
  const isValidBookId = Number.isInteger(numericBookId) && numericBookId > 0;
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

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

  const deleteBookMutation = useBooksControllerRemove({
    mutation: {
      onSuccess: (response) => {
        if (response.status === 204) {
          queryClient.invalidateQueries({
            queryKey: getBooksControllerFindOneQueryKey(numericBookId),
          });
          // Invalidate search queries
          queryClient.invalidateQueries({
            predicate: (query) => {
              const key = query.queryKey;
              return (
                Array.isArray(key) &&
                key.length > 0 &&
                key[0] === getBooksControllerSearchSimpleQueryKey()[0]
              );
            },
          });

          toast.success('Book deleted successfully!', {
            description: 'The book has been removed from the library.',
          });

          navigate({ to: '/admin/books' });
        }
      },
      onError: (error) => {
        const errorMessage = getErrorMessage(error);
        toast.error('Failed to delete book', {
          description:
            errorMessage || 'An unexpected error occurred. Please try again.',
        });
        setIsDeleteDialogOpen(false);
      },
    },
  });

  const handleDelete = () => {
    if (!isValidBookId) return;
    deleteBookMutation.mutate({ id: numericBookId });
  };

  const title = book?.title ?? 'Book details';

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
          <Button asChild>
            <Link
              to={`/admin/books/$bookId/edit`}
              params={{ bookId }}
              className="flex items-center justify-center gap-2"
            >
              <Pen /> Edit book
            </Link>
          </Button>
          <Button
            variant="destructive"
            onClick={() => setIsDeleteDialogOpen(true)}
            className="flex items-center justify-center gap-2"
          >
            <Trash2 className="size-4" /> Delete book
          </Button>
          <Button asChild variant="outline">
            <Link to="/admin/books">Back to catalog</Link>
          </Button>
        </div>
      </header>

      {content}

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Book</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{title}"? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleteBookMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteBookMutation.isPending}
            >
              {deleteBookMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
