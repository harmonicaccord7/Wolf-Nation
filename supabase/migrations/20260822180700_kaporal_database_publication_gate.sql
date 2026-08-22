-- KAPORAL v0.5: database-enforced human publication gate.
create or replace function public.enforce_kaporal_publication_gate() returns trigger language plpgsql security definer set search_path=public as $$
declare source_count integer:=0; claim_count integer:=0; unresolved_claims integer:=0; passed_reviews integer:=0;
begin
  if new.status='published'::article_status and old.status is distinct from 'published'::article_status then
    if new.dek is null or length(trim(new.dek))<20 then raise exception 'Publication gate: article dek/reader promise is incomplete'; end if;
    if new.body is null or jsonb_typeof(new.body)<>'object' or jsonb_array_length(coalesce(new.body->'blocks','[]'::jsonb))=0 then raise exception 'Publication gate: article body is empty'; end if;
    if new.story_candidate_id is not null then
      select count(*) into source_count from public.story_sources where story_candidate_id=new.story_candidate_id;
      select count(*),count(*) filter(where verification_status not in ('supported','not_applicable')) into claim_count,unresolved_claims from public.story_claims where story_candidate_id=new.story_candidate_id;
    else
      select count(*) into source_count from public.article_sources where article_id=new.id;
      select count(*),count(*) filter(where verification_status not in ('supported','not_applicable')) into claim_count,unresolved_claims from public.claims where article_id=new.id;
    end if;
    if source_count<1 then raise exception 'Publication gate: at least one source is required'; end if;
    if claim_count<1 then raise exception 'Publication gate: at least one structured claim is required'; end if;
    if unresolved_claims>0 then raise exception 'Publication gate: every structured claim must be supported or not_applicable'; end if;
    select count(distinct lower(replace(reviewer_role,'-','_'))) into passed_reviews from public.review_tasks where article_id=new.id and decision='pass'::review_decision and lower(replace(reviewer_role,'-','_')) in ('contrarian','quant','standards','editor_in_chief');
    if passed_reviews<4 then raise exception 'Publication gate: contrarian, quant, standards and editor_in_chief reviews must all pass'; end if;
    new.published_at:=coalesce(new.published_at,now());
  end if;
  return new;
end $$;

drop trigger if exists enforce_kaporal_publication_gate on public.articles;
create trigger enforce_kaporal_publication_gate before update of status on public.articles for each row execute function public.enforce_kaporal_publication_gate();
