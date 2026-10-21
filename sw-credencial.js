/* Permite abrir la credencial sin conexión: guarda la página y sus archivos en el celular. Los datos personales
 * NO pasan por aquí (se guardan aparte, en el almacenamiento del navegador, tras cada verificación). */
var VERSION = 'cred-v2';
var NUCLEO = ['credencial.html', 'assets/credencial.css', 'assets/credencial.js', 'assets/config.js', 'assets/img/logo.png', 'assets/img/favicon.png', 'manifest-credencial.webmanifest'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return Promise.all(NUCLEO.map(function (u) { return c.add(u).catch(function () { }); })); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var r = e.request;
  if (r.method !== 'GET') return;
  var u = new URL(r.url);
  if (/script\.google(usercontent)?\.com$/.test(u.hostname)) return; // datos del club: siempre por red
  var permitido = u.origin === self.location.origin || /(fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com)$/.test(u.hostname);
  if (!permitido) return;
  if (u.origin === self.location.origin && !/credencial|config\.js|logo\.png|favicon\.png/.test(u.pathname)) return; // el resto del sitio, normal
  // Muestra lo guardado al instante y lo renueva en segundo plano
  e.respondWith(caches.open(VERSION).then(function (c) {
    return c.match(r, { ignoreSearch: true }).then(function (previo) {
      var red = fetch(r).then(function (resp) { if (resp && (resp.ok || resp.type === 'opaque')) c.put(r, resp.clone()); return resp; }).catch(function () { return previo; });
      return previo || red;
    });
  }));
});
