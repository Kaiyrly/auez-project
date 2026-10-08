const baseBooks=books.map(b=>({...b}));
let customGenres=[];
try{const data=JSON.parse(localStorage.getItem('qalam-admin-catalog'));if(data&&Array.isArray(data.books)&&data.books.every(b=>Number.isInteger(b.id)&&typeof b.title==='string'&&typeof b.author==='string'&&typeof b.genre==='string'&&Number.isInteger(b.total)&&Number.isInteger(b.available)&&b.total>=0&&b.available>=0&&b.available<=b.total)&&new Set(data.books.map(b=>b.id)).size===data.books.length){books.splice(0,books.length,...data.books);customGenres=Array.isArray(data.genres)?data.genres.filter(g=>typeof g==='string'):[];}}catch{}
function htmlSafe(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
// Catalog templates use innerHTML: store user text as plain text and escape it at rendering boundaries.
