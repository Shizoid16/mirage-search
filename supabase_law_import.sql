-- Mirage: резервные копии и импорт законов.
-- Перед запуском обязательно проверь структуру legal_entries!

CREATE TABLE IF NOT EXISTS public.legal_import_backups (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category TEXT NOT NULL,
    entries JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

ALTER TABLE public.legal_import_backups ENABLE ROW LEVEL SECURITY;


CREATE OR REPLACE FUNCTION public.replace_legal_code(
    p_category TEXT,
    p_entries JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_backup_id BIGINT;
    v_count INTEGER;
BEGIN
    IF auth.uid() IS NULL
       OR COALESCE(auth.jwt()->'app_metadata'->>'role','') <> 'admin'
    THEN
        RAISE EXCEPTION 'Admin role required';
    END IF;

    IF p_category IS NULL OR LENGTH(TRIM(p_category)) = 0 THEN
        RAISE EXCEPTION 'Category is required';
    END IF;

    IF jsonb_typeof(p_entries) <> 'array' THEN
        RAISE EXCEPTION 'Entries must be a JSON array';
    END IF;

    -- Резервная копия выбранного кодекса
    INSERT INTO public.legal_import_backups
        (category, entries, created_by)
    SELECT
        p_category,
        COALESCE(jsonb_agg(to_jsonb(le)), '[]'::jsonb),
        auth.uid()
    FROM public.legal_entries le
    WHERE le.category = p_category
    RETURNING id INTO v_backup_id;

    -- Удаляем только выбранную категорию
    DELETE FROM public.legal_entries
    WHERE category = p_category;

    -- Импортируем новые записи
    INSERT INTO public.legal_entries
        (category, group_name, code, title, body,
         kind, wanted, penalty, fine)
    SELECT
        p_category,
        NULLIF(x->>'group_name',''),
        x->>'code',
        COALESCE(x->>'title',''),
        COALESCE(x->>'body',''),
        COALESCE(NULLIF(x->>'kind',''),'law'),
        NULLIF(x->>'wanted',''),
        NULLIF(x->>'penalty',''),
        NULLIF(x->>'fine','')
    FROM jsonb_array_elements(p_entries) x;

    GET DIAGNOSTICS v_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'backup_id',v_backup_id,
        'imported',v_count,
        'category',p_category
    );
END;
$$;

REVOKE ALL ON FUNCTION public.replace_legal_code(TEXT,JSONB) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.replace_legal_code(TEXT,JSONB)
TO authenticated;
