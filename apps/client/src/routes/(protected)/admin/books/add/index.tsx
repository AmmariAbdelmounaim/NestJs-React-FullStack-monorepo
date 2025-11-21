import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BookForm } from '@/features/books';
import { createFileRoute } from '@tanstack/react-router';
import {
  useBooksControllerCreate,
  getBooksControllerFindAllQueryKey,
  getBooksControllerSearchSimpleQueryKey,
} from '@/api/generated/books/books';
import { useAuthorsControllerFindAll } from '@/api/generated/authors/authors';
import { getErrorMessage } from '@/lib/api-errors';
import type { BookFormData } from '@/features/books/lib/schemas';
import type { CreateBookDto } from '@/api/generated/model';

export const Route = createFileRoute('/(protected)/admin/books/add/')({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch authors list
  const { data: authorsResponse, isLoading: isLoadingAuthors } =
    useAuthorsControllerFindAll({
      query: {
        select: (response) => (response.status === 200 ? response.data : []),
      },
    });

  const authors = authorsResponse || [];

  // Create book mutation
  const createBookMutation = useBooksControllerCreate({
    mutation: {
      onSuccess: (response) => {
        if (response.status === 201 && response.data) {
          // Invalidate books list to refresh the catalog
          queryClient.invalidateQueries({
            queryKey: getBooksControllerSearchSimpleQueryKey(),
          });

          // Show success toast
          toast.success('Book created successfully!', {
            description: `"${response.data.title}" has been added to the library.`,
          });

          // Navigate to the books catalog
          navigate({ to: '/admin/books' });
        }
      },
      onError: (error) => {
        const errorMessage = getErrorMessage(error);
        toast.error('Failed to create book', {
          description:
            errorMessage || 'An unexpected error occurred. Please try again.',
        });
      },
    },
  });

  const handleSubmit = (data: BookFormData) => {
    // Convert BookFormData to CreateBookDto
    // Note: authorIds are not included in CreateBookDto, so we'll skip them for now
    // Authors association might need to be handled separately
    const createBookDto: CreateBookDto = {
      title: data.title as unknown as CreateBookDto['title'],
      description: data.description
        ? (data.description as unknown as CreateBookDto['description'])
        : undefined,
      genre: data.genre
        ? (data.genre as unknown as CreateBookDto['genre'])
        : undefined,
      isbn10: data.isbn10 || undefined,
      isbn13: data.isbn13 || undefined,
      publicationDate: data.publicationDate || undefined,
      coverImageUrl: data.coverImageUrl
        ? (data.coverImageUrl as unknown as CreateBookDto['coverImageUrl'])
        : undefined,
    };

    createBookMutation.mutate({ data: createBookDto });
  };

  return (
    <div className="container py-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Add New Book</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Fill in the details below to add a new book to the library.
        </p>
      </div>
      <BookForm
        authors={authors}
        onSubmit={handleSubmit}
        isLoading={createBookMutation.isPending || isLoadingAuthors}
        submitButtonText="Add Book"
      />
    </div>
  );
}
