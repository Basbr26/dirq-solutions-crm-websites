-- Check recent quote with sign token
SELECT 
    id,
    quote_number,
    title,
    sign_token,
    sign_status,
    sign_link_expires_at,
    signer_email,
    updated_at
FROM quotes
WHERE sign_token IS NOT NULL
ORDER BY updated_at DESC
LIMIT 5;
