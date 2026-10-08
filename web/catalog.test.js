const {test}=require('node:test');
const assert=require('node:assert/strict');
const {books,filterBooks}=require('./catalog');
test('Kazakh title and author search ignores case and surrounding whitespace',()=>{assert.deepEqual(filterBooks('  АБАЙ ЖОЛЫ  ','Барлығы').map(b=>b.id),[1]);assert.deepEqual(filterBooks('әуезов','Барлығы').map(b=>b.id),[1]);});
test('genre and search combine, including empty results',()=>{assert.equal(filterBooks('','Балаларға').length,2);assert.equal(filterBooks('Абай','Ғылым').length,0);assert.equal(filterBooks('жоқ кітап','Барлығы').length,0);});
test('catalog IDs are unique for persisted shelves and orders',()=>{assert.equal(new Set(books.map(b=>b.id)).size,books.length);});
