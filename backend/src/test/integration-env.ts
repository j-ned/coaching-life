// Le module db/index.ts lit DATABASE_URL à son chargement : il doit viser la base de test.
process.env['DATABASE_URL'] = process.env['TEST_DATABASE_URL'];
