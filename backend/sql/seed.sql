BEGIN;

DELETE FROM products
WHERE barcode LIKE 'TEST770000%'
   OR barcode IN (
     '7700304758746', '7700304758747', '7700304758748',
     '7700304758749', '7700304758750', '7700304758751',
     '7700304758752', '7700304758753', '7700304758754',
     '7700304758755', '7700304758756'
   );

INSERT INTO products (barcode, name, description, status)
VALUES
  ('7700304758746', 'Producto de prueba 01', 'Código numérico ficticio para pruebas.', TRUE),
  ('7700304758747', 'Producto de prueba 02', 'Código numérico ficticio para pruebas.', TRUE),
  ('7700304758748', 'Producto de prueba 03', 'Código numérico ficticio para pruebas.', TRUE),
  ('7700304758749', 'Producto de prueba 04', 'Código numérico ficticio para pruebas.', TRUE),
  ('7700304758750', 'Producto de prueba 05', 'Código numérico ficticio para pruebas.', TRUE),
  ('7700304758751', 'Producto de prueba 06', 'Código numérico ficticio para pruebas.', TRUE),
  ('7700304758752', 'Producto de prueba 07', 'Código numérico ficticio para pruebas.', TRUE),
  ('7700304758753', 'Producto de prueba 08', 'Código numérico ficticio para pruebas.', TRUE),
  ('7700304758754', 'Producto de prueba 09', 'Código numérico ficticio para pruebas.', TRUE),
  ('7700304758756', 'Producto de prueba 10', 'Código numérico ficticio para pruebas.', FALSE)
ON CONFLICT (barcode) DO NOTHING;

COMMIT;
