import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { MultiSelect } from '@/components/ui/multi-select';
import { bookSchema, type BookFormData } from '../lib/schemas';
import { formatAuthorName } from '../utils';
import type { AuthorResponseDto } from '@/api/generated/model';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ChevronDownIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Link } from '@tanstack/react-router';

export interface BookFormProps {
  defaultValues?: Partial<BookFormData>;
  onSubmit?: (data: BookFormData) => void;
  authors?: AuthorResponseDto[];
  isLoading?: boolean;
  submitButtonText?: string;
  disableAuthors?: boolean;
}

export function BookForm({
  defaultValues,
  onSubmit,
  authors = [],
  isLoading = false,
  submitButtonText = 'Submit',
  disableAuthors,
}: BookFormProps) {
  const [openCalendar, setOpenCalendar] = useState(false);
  const form = useForm<BookFormData>({
    resolver: zodResolver(bookSchema),
    defaultValues: {
      title: '',
      description: '',
      genre: '',
      isbn13: '',
      isbn10: '',
      publicationDate: '',
      authorIds: [],
      coverImageUrl: '',
      ...defaultValues,
    },
  });

  // Populate form with default values when they change (for editing)
  useEffect(() => {
    if (defaultValues) {
      form.reset({
        title: defaultValues.title || '',
        description: defaultValues.description || '',
        genre: defaultValues.genre || '',
        isbn13: defaultValues.isbn13 || '',
        isbn10: defaultValues.isbn10 || '',
        publicationDate: defaultValues.publicationDate || '',
        authorIds: defaultValues.authorIds || [],
        coverImageUrl: defaultValues.coverImageUrl || '',
      });
    }
  }, [defaultValues, form]);

  const handleSubmit = (data: BookFormData) => {
    // Clean up empty strings to undefined for optional fields
    const cleanedData: BookFormData = {
      ...data,
      description: data.description || undefined,
      genre: data.genre || undefined,
      isbn13: data.isbn13 || undefined,
      isbn10: data.isbn10 || undefined,
      publicationDate: data.publicationDate || undefined,
      coverImageUrl: data.coverImageUrl || undefined,
    };
    onSubmit?.(cleanedData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input type="text" placeholder="Enter book title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  className="border-input placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                  placeholder="Enter book description"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="genre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Genre</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="e.g., Fiction, Science Fiction, Mystery"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="isbn13"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ISBN-13</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="9780123456789"
                    maxLength={13}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isbn10"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ISBN-10</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="0123456789"
                    maxLength={10}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="publicationDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Publication Date</FormLabel>
              <FormControl>
                <Popover open={openCalendar} onOpenChange={setOpenCalendar}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      id="date"
                      className="w-48 justify-between font-normal"
                    >
                      {field.value
                        ? new Date(field.value).toDateString()
                        : 'Select date'}
                      <ChevronDownIcon />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto overflow-hidden p-0"
                    align="start"
                  >
                    <Calendar
                      className="w-[300px]"
                      mode="single"
                      selected={field.value ? new Date(field.value) : undefined}
                      captionLayout="dropdown"
                      onSelect={(date) => {
                        field.onChange(date ? date.toISOString() : '');
                        setOpenCalendar(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </FormControl>
              <FormDescription>Select the publication date</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {!disableAuthors && (
          <FormField
            control={form.control}
            name="authorIds"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Authors</FormLabel>
                  <Link
                    to="/admin/authors/add"
                    className="text-primary text-sm hover:underline"
                  >
                    Add new author
                  </Link>
                </div>
                <FormControl>
                  <MultiSelect
                    options={
                      authors.length === 0
                        ? []
                        : authors.map((author) => ({
                            value: author.id,
                            label: formatAuthorName(author),
                          }))
                    }
                    value={field.value}
                    onChange={(values) => {
                      field.onChange(values.map(Number));
                    }}
                    placeholder={
                      authors.length === 0
                        ? 'No authors available'
                        : 'Select authors...'
                    }
                  />
                </FormControl>
                <FormDescription>
                  Select one or more authors for this book
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="coverImageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cover Image URL</FormLabel>
              <FormControl>
                <Input
                  type="url"
                  placeholder="https://example.com/book-cover.jpg"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Enter the URL of the book cover image
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Submitting...' : submitButtonText}
        </Button>
      </form>
    </Form>
  );
}
