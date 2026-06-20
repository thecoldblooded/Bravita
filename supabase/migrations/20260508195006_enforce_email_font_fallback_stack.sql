-- Ensure all managed email templates keep the Google Fonts import
-- and use an expanded inline fallback stack for clients that ignore web fonts.
DO $$
DECLARE
    v_font_link CONSTANT text := '<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">';
    v_font_stack CONSTANT text := '''Baloo 2'', ''Nunito'', -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Helvetica, Arial, sans-serif';
    v_body_open CONSTANT text := '<body style="margin: 0; padding: 0; background-color: #FFFBF7; font-family: ''Baloo 2'', ''Nunito'', -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">';
BEGIN
    -- Expand compact font stacks everywhere in the stored HTML.
    UPDATE public.email_templates
    SET content_html = regexp_replace(
        content_html,
        '(?i)font-family\s*:\s*''Baloo 2''\s*,\s*''Nunito''\s*,\s*sans-serif',
        'font-family: ' || v_font_stack,
        'g'
    )
    WHERE content_html ~* 'font-family\s*:\s*''Baloo 2''\s*,\s*''Nunito''\s*,\s*sans-serif';

    -- Upgrade any stray plain sans-serif declarations used in email CTA/buttons.
    UPDATE public.email_templates
    SET content_html = regexp_replace(
        content_html,
        '(?i)font-family\s*:\s*sans-serif',
        'font-family: ' || v_font_stack,
        'g'
    )
    WHERE content_html ~* 'font-family\s*:\s*sans-serif';

    -- Ensure <body> always carries the font stack inline for clients that strip <head> styles.
    UPDATE public.email_templates
    SET content_html = regexp_replace(
        content_html,
        '(?i)<body\s*>',
        v_body_open,
        'g'
    )
    WHERE content_html ~* '<body\s*>';

    UPDATE public.email_templates
    SET content_html = replace(
        content_html,
        '<body style="margin: 0; padding: 0; background-color: #FFFBF7;">',
        v_body_open
    )
    WHERE content_html LIKE '%<body style="margin: 0; padding: 0; background-color: #FFFBF7;">%';

    UPDATE public.email_templates
    SET content_html = replace(
        content_html,
        '<body style="margin: 0; padding: 0; background-color: #FFFBF7; font-family: ''Baloo 2'', ''Nunito'', sans-serif;">',
        v_body_open
    )
    WHERE content_html LIKE '%<body style="margin: 0; padding: 0; background-color: #FFFBF7; font-family: ''Baloo 2'', ''Nunito'', sans-serif;">%';

    UPDATE public.email_templates
    SET content_html = replace(
        content_html,
        '<body style="margin: 0; padding: 0; background-color: #FFFBF7; font-family: ''Baloo 2'', ''Nunito'', sans-serif; -webkit-font-smoothing: antialiased;">',
        v_body_open
    )
    WHERE content_html LIKE '%<body style="margin: 0; padding: 0; background-color: #FFFBF7; font-family: ''Baloo 2'', ''Nunito'', sans-serif; -webkit-font-smoothing: antialiased;">%';

    -- Re-insert the Google Fonts link for any template that is missing it.
    UPDATE public.email_templates
    SET content_html = regexp_replace(
        content_html,
        '(<title[^>]*>.*?</title>)',
        E'\\1\n  ' || v_font_link,
        'i'
    )
    WHERE content_html !~* 'fonts\.googleapis\.com/css2\?family=Baloo\+2';
END $$;;
