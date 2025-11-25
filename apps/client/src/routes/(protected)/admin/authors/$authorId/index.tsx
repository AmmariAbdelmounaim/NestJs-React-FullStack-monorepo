import { useNavigate, createFileRoute } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AuthorForm } from '@/features/authors';
import {
  useAuthorsControllerFindOne,
  useAuthorsControllerUpdate,
  getAuthorsControllerFindAllQueryKey,
  getAuthorsControllerFindOneQueryKey,
} from '@/api/generated/authors/authors';
import { getErrorMessage } from '@/lib/api-errors';
import type { AuthorFormData } from '@/features/authors/lib/schemas';
import type { UpdateAuthorDto } from '@/api/generated/model';
import { Card, CardDescription, CardHeader } from '@/components/ui/card';

export const Route = createFileRoute('/(protected)/admin/authors/$authorId/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { authorId } = Route.useParams();
  const numericAuthorId = Number(authorId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isValidAuthorId =
    Number.isInteger(numericAuthorId) && numericAuthorId > 0;

  // Fetch author details
  const {
    data: authorResponse,
    isLoading: isLoadingAuthor,
    isError: isAuthorError,
    error: authorError,
  } = useAuthorsControllerFindOne(numericAuthorId, {
    query: {
      enabled: isValidAuthorId,
      queryKey: getAuthorsControllerFindOneQueryKey(Number(authorId)),
      select: (response) =>
        response.status === 200 ? response.data : undefined,
    },
  });

  const author = authorResponse;

  // Update author mutation
  const updateAuthorMutation = useAuthorsControllerUpdate({
    mutation: {
      onSuccess: (response) => {
        if (response.status === 200 && response.data) {
          // Invalidate author details and authors list to refresh data
          queryClient.invalidateQueries({
            queryKey: getAuthorsControllerFindOneQueryKey(numericAuthorId),
          });
          queryClient.invalidateQueries({
            queryKey: getAuthorsControllerFindAllQueryKey(),
          });

          // Show success toast
          const lastName =
            typeof response.data.lastName === 'string'
              ? response.data.lastName
              : 'Author';
          toast.success('Author updated successfully!', {
            description: `${lastName} has been updated.`,
          });

          // Navigate back to authors list
          navigate({ to: '/admin/authors' });
        }
      },
      onError: (error) => {
        const errorMessage = getErrorMessage(error);
        toast.error('Failed to update author', {
          description:
            errorMessage || 'An unexpected error occurred. Please try again.',
        });
      },
    },
  });

  const handleSubmit = (data: AuthorFormData) => {
    if (!author) return;

    const updateAuthorDto: UpdateAuthorDto = {
      firstName: data.firstName,
      lastName: data.lastName,
      birthDate: data.birthDate,
      deathDate: data.deathDate,
    };

    updateAuthorMutation.mutate({ id: numericAuthorId, data: updateAuthorDto });
  };

  if (!isValidAuthorId) {
    return (
      <div className="container py-4">
        <h1 className="text-3xl font-bold">Edit Author</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Invalid author ID: "{authorId}"
        </p>
      </div>
    );
  }

  if (isLoadingAuthor) {
    return (
      <Card className="mx-auto w-full">
        <CardHeader>
          <CardDescription>Loading author details...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isAuthorError || !author) {
    return (
      <div className="container py-4">
        <h1 className="text-3xl font-bold">Edit Author</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {getErrorMessage(authorError) ||
            'Author not found or an error occurred.'}
        </p>
      </div>
    );
  }

  const defaultFormValues: Partial<AuthorFormData> = {
    firstName: author.firstName || '',
    lastName: author.lastName || '',
    birthDate: author.birthDate || '',
    deathDate: author.deathDate || '',
  };

  return (
    <div className="container py-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          Edit Author:{' '}
          {typeof author.lastName === 'string' ? author.lastName : 'Unknown'}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Update the details for this author.
        </p>
      </div>
      <AuthorForm
        defaultValues={defaultFormValues}
        onSubmit={handleSubmit}
        isLoading={updateAuthorMutation.isPending}
        submitButtonText="Update Author"
      />
    </div>
  );
}
