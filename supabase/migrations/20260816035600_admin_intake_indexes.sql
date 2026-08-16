create index if not exists form_submissions_duplicate_of_idx on public.form_submissions(duplicate_of_id) where duplicate_of_id is not null;
