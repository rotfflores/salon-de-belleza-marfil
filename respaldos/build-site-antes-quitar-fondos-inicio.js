/* Run `node build-site.js` after changing content/ or partials/. No dependencies. */
const fs = require('fs');
const path = require('path');
const root = __dirname;
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const escape = value => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const pages = [
  { file:'index.html', label:'Inicio', title:'Cabello, uñas y belleza', description:'Descubre Marfil: una selección de servicios de cabello, uñas y cejas, estilos para inspirarte y toda la información para preparar tu visita.' },
  { file:'servicios.html', label:'Servicios', title:'Servicios y precios', description:'Explora los servicios de Marfil: cabello, uñas, cejas y pestañas, con precios en MXN, duraciones y consulta personalizada. Datos ilustrativos de demostración.' },
  { file:'galeria.html', label:'Galería', title:'Nuestra galería', description:'Encuentra inspiración entre estilos, colores y detalles. Explora doce fotografías de cabello, uñas, cejas y pestañas en la galería de Marfil.' },
  { file:'nuestro-salon.html', label:'Nuestro salón', title:'Nuestro salón', description:'Conoce Marfil: un salón tranquilo y luminoso para cabello, uñas, cejas y pestañas. Nuestra forma de trabajar, nuestros espacios y cómo cuidamos cada visita.' },
  { file:'contacto.html', label:'Contacto', title:'Contacto', description:'Consulta los horarios, la ubicación y los medios de contacto de Marfil para preparar tu próxima visita. Solicitudes sujetas a confirmación del salón.' }
];
const nav = (active, cls) => pages.map(p => `<li><a class="${cls}" href="${p.file}"${active === p.file ? ' aria-current="page"' : ''}>${p.label}</a></li>`).join('\n');
let services = read('content/services.html');
let gallery = read('content/gallery.html');
let salon = read('content/salon.html');
// Offline-safe fallbacks; contact.js activates WhatsApp only for a configured number.
function safeLinks(html) {
  return html.replace(/href="https:\/\/wa\.me\/[^\"]*"(?: target="_blank")?/g,'href="contacto.html#reservas"')
    .replace(/href="#contacto"/g,'href="contacto.html#reservas"')
    .replace(/ \(abre WhatsApp\)/g,'');
}
// Bloques completos que empiezan con `start`, contando etiquetas anidadas del mismo tipo (listas dentro de un servicio).
function blocks(html, start, tag) {
  const found = [];
  let index = html.indexOf(start);
  while (index !== -1) {
    const re = new RegExp(`<${tag}[\\s>]|<\\/${tag}>`, 'g');
    re.lastIndex = index + 1;
    let depth = 1, m;
    while (depth && (m = re.exec(html))) depth += m[0][1] === '/' ? -1 : 1;
    if (depth) throw Error(`Unclosed ${start}`);
    found.push(html.slice(index, re.lastIndex));
    index = html.indexOf(start, re.lastIndex);
  }
  return found;
}
const serviceItems = blocks(services, '<li class="svc"', 'li');
const galleryItems = [...gallery.matchAll(/<li class="gallery-card"[\s\S]*?<\/li>/g)].map(m => m[0]);
// Inicio muestra los servicios marcados con data-featured, sin el detalle desplegable.
const featured = serviceItems.filter(item => /^<li[^>]*\sdata-featured[\s>]/.test(item))
  .map(item => item.replace(/\s*<details class="svc__more">[\s\S]*?<\/details>/, '').replace(/<(\/?)h4\b/g, '<$1h3'));
const featuredGallery = galleryItems.filter(item => /^<li[^>]*\sdata-featured[\s>]/.test(item));
if(featured.length!==3 || featuredGallery.length!==4) throw Error('Review the featured selections after changing the catalog.');
// Funciones de reemplazo: un precio como "$180" no debe leerse como "$1".
let homeServices = services.replace('class="services"','class="services services--preview"')
  .replace(/\s*<!-- solo-pagina -->[\s\S]*?<!-- \/solo-pagina -->/, '')
  .replace(blocks(services, '<div class="services__toolbar', 'div')[0], '')
  .replace(blocks(services, '<div class="services__catalog"', 'div')[0], () => '<ul class="services__list" data-services-list>\n'+featured.join('\n')+'\n</ul>')
  .replace(/<aside class="services__help[\s\S]*?<\/aside>/, '<div class="section-action"><a class="btn btn--line" href="servicios.html">Ver todos los servicios <span aria-hidden="true"><svg class="icon" viewBox="0 0 16 16" focusable="false"><path d="M5 11 11 5M6.5 5H11v4.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span></a></div>')
  .replace('Explora nuestros servicios de cabello, uñas, cejas y pestañas. Consulta los detalles y elige tu próximo momento de cuidado.','Tres maneras de regalarte una pausa. Descubre una selección de nuestros servicios y encuentra tu próximo momento de cuidado.');
let homeGallery = gallery.replace('class="work-gallery"','class="work-gallery work-gallery--preview"')
  .replace(/<div class="services__toolbar">[\s\S]*?<\/div>\s*<ul class="gallery-grid/, '<ul class="gallery-grid')
  .replace(/\s*<!-- solo-pagina -->[\s\S]*?<!-- \/solo-pagina -->/, '')
  .replace(/(<ul class="gallery-grid[^>]*>)[\s\S]*?<\/ul>/,(m, open) => open+'\n'+featuredGallery.join('\n')+'\n</ul>')
  .replace('<div class="work-gallery__divider"', '<div class="section-action"><a class="btn btn--line" href="galeria.html">Explorar galería <span aria-hidden="true"><svg class="icon" viewBox="0 0 16 16" focusable="false"><path d="M5 11 11 5M6.5 5H11v4.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span></a></div>\n        <div class="work-gallery__divider"');
const homeContact = `<section class="home-contact" aria-labelledby="home-contact-title"><div><p class="page-eyebrow">Te esperamos</p><h2 id="home-contact-title">Tu próximo momento de cuidado empieza aquí.</h2></div><div class="home-contact__actions"><a class="btn btn--primary" href="contacto.html#reservas" data-whatsapp>Solicitar cita</a><a class="text-link" href="contacto.html">Ubicación y contacto <span aria-hidden="true"><svg class="icon" viewBox="0 0 16 16" focusable="false"><path d="M5 11 11 5M6.5 5H11v4.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span></a></div></section>\n<!-- Continuidad: incorporar aquí futuras secciones del proyecto. -->`;
const arrow = '<span aria-hidden="true"><svg class="icon" viewBox="0 0 16 16" focusable="false"><path d="M5 11 11 5M6.5 5H11v4.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
// Inicio presenta el salón y sus tres pilares; el resto vive en nuestro-salon.html.
const homeSalon = salon.replace('class="salon"','class="salon salon--preview"')
  .replace(/\s*<!-- solo-pagina -->[\s\S]*?<!-- \/solo-pagina -->/g, '')
  .replace('<!-- accion-inicio -->', () => '<div class="section-action sl-reveal"><a class="btn btn--line" href="nuestro-salon.html">Conocer el salón '+arrow+'</a></div>');
// En su página, el título es h1 y los demás encabezados suben un nivel (grupos h2, servicios h3).
services = services.replace('class="services"','class="services services--page"')
  .replace(/<(\/?)h([34])\b/g, (m, slash, level) => `<${slash}h${level - 1}`)
  .replace(/<h2 class="services__title[\s\S]*?<\/h2>/,'<h1 class="services__title" id="services-title"><span class="services__title-line"><span>Servicios</span></span> <em class="services__title-line"><span>y precios</span></em></h1>')
  .replace('<p class="services__fineprint">','<p class="demo-note">Servicios, precios y duraciones ilustrativos para esta demostración.</p>\n        <p class="services__fineprint">');
gallery = gallery.replace(/<(\/?)h([34])\b/g, (m, slash, level) => `<${slash}h${level - 1}`)
  .replace(/<h2 class="services__title"[\s\S]*?<\/h2>/,'<h1 class="services__title" id="gallery-title">Nuestra<br><em>galería</em></h1>')
  .replace('Explora estilos, colores y detalles para encontrar la inspiración que quieres llevar a tu próxima cita.','Encuentra inspiración entre estilos, colores y detalles.');
salon = salon.replace('class="salon"','class="salon salon--page"')
  .replace(/\s*<!-- accion-inicio -->/, '')
  .replace(/<!-- \/?solo-pagina -->\n?/g, '')
  .replace(/<(\/?)h([34])\b/g, (m, slash, level) => `<${slash}h${level - 1}`)
  .replace(/<h2 class="salon__title([^"]*)" id="salon-title">([\s\S]*?)<\/h2>/, (m, cls, inner) => `<h1 class="salon__title${cls}" id="salon-title">${inner}</h1>`);
gallery = gallery.replace(/(data-gallery-filter="([^"]+)"[\s\S]*?<span class="filter__count">)\d+/g, (all, prefix, category) => prefix + (category === 'todos' ? galleryItems.length : galleryItems.filter(item => item.includes('data-gallery-category="' + category + '"')).length)).replace(/>8 imágenes</, '>'+galleryItems.length+' imágenes<');
// Catálogo para el sistema de citas de Contacto: sale de content/services.html, así que basta con editar los servicios ahí.
const bookingServices = serviceItems.map(item => {
  const text = re => ((item.match(re) || [])[1] || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const price = text(/<p class="svc__price">([\s\S]*?)<\/p>/);
  return {
    category: (item.match(/data-category="([^"]+)"/) || [])[1] || '',
    name: text(/<h4 class="svc__name">([\s\S]*?)<\/h4>/),
    description: text(/<p class="svc__desc">([\s\S]*?)<\/p>/),
    price,
    from: /desde/i.test(price),
    value: Number(((price.match(/\$([\d,]+)/) || [])[1] || '0').replace(/,/g, '')),
    duration: Number((text(/class="svc__duration"[\s\S]*?<span>([\s\S]*?)<\/span>/).match(/\d+/) || ['60'])[0])
  };
});
const contact = read('content/contact.html').replace('<!-- servicios-reserva -->', () =>
  '<script type="application/json" id="booking-services">' + JSON.stringify(bookingServices).replace(/</g, '\\u003c') + '</script>');
const body = [read('content/hero.html')+'\n'+homeServices+'\n'+homeGallery+'\n'+homeSalon+'\n'+homeContact,services,gallery,salon,contact];
pages.forEach((page,i) => {
  let head=read('partials/head.html').replace('{{title}}',escape(page.title)).replace('{{description}}',escape(page.description));
  if(i!==0) head=head.replace(/  <link rel="preload" as="image"[\s\S]*?imagesizes="100vw">\s*/,'');
  if(i!==0&&i!==2) head=head.replace('  <script src="gallery.js" defer></script>\n','');
  if(page.file!=='contacto.html') head=head.replace('  <script src="booking.js" defer></script>\n','');
  const header=read('partials/header.html').replace('{{desktopNav}}',nav(page.file,'nav__link')).replace('{{mobileNav}}',nav(page.file,'mobile-menu__link'));
  const footer=read('partials/footer.html').replace('{{footerNav}}',nav(page.file,'footer-nav__link'));
  const html=head+`<body class="${i===0?'page-home':'page-inner'}" data-page-title="${escape(page.title)}">\n  <a class="skip-link" href="#contenido">Saltar al contenido</a>\n`+header+'\n  <main id="contenido" tabindex="-1">\n'+safeLinks(body[i])+'\n  </main>\n'+footer+'\n</body>\n</html>\n';
  fs.writeFileSync(path.join(root,page.file),html);
  console.log(page.file);
});
