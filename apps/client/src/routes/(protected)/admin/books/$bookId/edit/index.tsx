import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BookForm } from '@/features/books';
import { createFileRoute } from '@tanstack/react-router';
import {
  useBooksControllerFindOne,
  useBooksControllerUpdate,
  getBooksControllerFindAllQueryKey,
  getBooksControllerFindOneQueryKey,
  getBooksControllerSearchSimpleQueryKey,
} from '@/api/generated/books/books';
import {
  getAuthorsControllerFindAllQueryKey,
  useAuthorsControllerFindAll,
} from '@/api/generated/authors/authors';
import { getErrorMessage } from '@/lib/api-errors';
import type { BookFormData } from '@/features/books/lib/schemas';
import type { UpdateBookDto } from '@/api/generated/model';
import { BookDetailsSkeleton } from '@/features/books';

export const Route = createFileRoute('/(protected)/admin/books/$bookId/edit/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { bookId } = Route.useParams();
  const queryClient = useQueryClient();
  const numericBookId = Number(bookId);
  const isValidBookId = Number.isInteger(numericBookId) && numericBookId > 0;

  // Fetch book data
  const {
    data: book,
    isLoading: isLoadingBook,
    isError: isBookError,
    error: bookError,
  } = useBooksControllerFindOne(numericBookId, {
    query: {
      enabled: isValidBookId,
      queryKey: getBooksControllerFindOneQueryKey(Number(bookId)),
      select: (response) =>
        response.status === 200 ? response.data : undefined,
    },
  });

  // Fetch authors list
  const { data: authorsResponse, isLoading: isLoadingAuthors } =
    useAuthorsControllerFindAll({
      query: {
        queryKey: getAuthorsControllerFindAllQueryKey(),
        select: (response) => (response.status === 200 ? response.data : []),
      },
    });

  const authors = authorsResponse || [];

  // Update book mutation
  const updateBookMutation = useBooksControllerUpdate({
    mutation: {
      onSuccess: (response) => {
        if (response.status === 200 && response.data) {
          queryClient.invalidateQueries({
            queryKey: getBooksControllerFindAllQueryKey(),
          });
          queryClient.invalidateQueries({
            queryKey: getBooksControllerFindOneQueryKey(numericBookId),
          });
          queryClient.invalidateQueries({
            predicate: (query) => {
              const key = query.queryKey;
              return (
                Array.isArray(key) &&
                key.length > 0 &&
                key[0] === getBooksControllerSearchSimpleQueryKey()
              );
            },
          });

          toast.success('Book updated successfully!', {
            description: `"${response.data.title}" has been updated.`,
          });
        }
      },
      onError: (error) => {
        const errorMessage = getErrorMessage(error);
        toast.error('Failed to update book', {
          description:
            errorMessage || 'An unexpected error occurred. Please try again.',
        });
      },
    },
  });

  const handleSubmit = (data: BookFormData) => {
    if (!isValidBookId) return;

    const updateBookDto: UpdateBookDto = {
      title: data.title,
      description: data.description,
      genre: data.genre,
      isbn10: data.isbn10,
      isbn13: data.isbn13,
      publicationDate: data.publicationDate,
      coverImageUrl: data.coverImageUrl,
    };

    updateBookMutation.mutate({ id: numericBookId, data: updateBookDto });
  };

  const defaultValues: Partial<BookFormData> = {
    title: book?.title || '',
    description: book?.description || '',
    genre: book?.genre || '',
    isbn10: book?.isbn10 || '',
    isbn13: book?.isbn13 || '',
    publicationDate: book?.publicationDate || '',
    authorIds: book?.authors?.map((author) => author.id) || [],
    coverImageUrl: book?.coverImageUrl || '',
  };

  if (!isValidBookId) {
    return (
      <div className="container mx-auto max-w-4xl py-8">
        <div className="text-destructive">
          <p className="text-lg font-semibold">Invalid book ID</p>
          <p className="text-sm">"{bookId}" is not a valid book identifier.</p>
        </div>
      </div>
    );
  }

  if (isLoadingBook || isLoadingAuthors) {
    return (
      <div className="container mx-auto max-w-4xl py-8">
        <BookDetailsSkeleton />
      </div>
    );
  }

  if (isBookError || !book) {
    const errorMessage =
      bookError instanceof Error
        ? bookError.message
        : 'Unable to load book information.';
    return (
      <div className="container mx-auto max-w-4xl py-8">
        <div className="border-destructive/50 bg-destructive/5 flex flex-col items-start gap-4 rounded-xl border p-6">
          <div>
            <p className="text-destructive text-base font-semibold">
              Unable to load book
            </p>
            <p className="text-muted-foreground text-sm">{errorMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Edit Book</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Update the book information below.
        </p>
      </div>
      <BookForm
        defaultValues={defaultValues}
        authors={authors}
        onSubmit={handleSubmit}
        isLoading={updateBookMutation.isPending}
        submitButtonText="Update Book"
        disableAuthors
      />
    </div>
  );
}
