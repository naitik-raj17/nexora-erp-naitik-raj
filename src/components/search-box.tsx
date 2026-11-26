import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/** A plain GET form, so search works without client JavaScript and the URL can be shared. */
export function SearchBox({
  q,
  placeholder = 'Search…',
  children,
}: {
  q: string;
  placeholder?: string;
  children?: React.ReactNode;
}) {
  return (
    <form className="mb-4 flex flex-wrap gap-2" role="search">
      <Input
        name="q"
        defaultValue={q}
        placeholder={placeholder}
        aria-label="Search"
        className="max-w-xs"
      />
      {children}
      <Button type="submit" variant="secondary">
        Search
      </Button>
    </form>
  );
}
