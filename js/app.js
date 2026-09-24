"use strict";
const $ = selector => document.querySelector(selector);
const state = { section: "coches", data: { coches: [], materiales: [] }, ready: false };
const fallback = "images/placeholder.svg";
const normalize = value => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const money = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
const display = value => value === null || value === undefined || value === "" ? "No indicado" : String(value);
const yesNo = value => value == null ? "No indicado" : value ? "Sí" : "No";
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function picture(path, alt, className) {
  const img = element("img", className);
  img.alt = alt;
  img.loading = "lazy";
  img.decoding = "async";
  img.width = 640;
  img.height = 400;
  img.addEventListener("error", () => { img.src = fallback; img.alt = "Imagen no disponible"; }, { once: true });
  img.src = typeof path === "string" && path.trim() ? path : fallback;
  return img;
}
function options(select, values, first) {
  select.replaceChildren(new Option(first, ""));
  [...new Set(values.filter(Boolean))].sort((a,b) => a.localeCompare(b, "es")).forEach(value => select.add(new Option(value, value)));
}
function setSection(section) {
  state.section = section;
  const cars = section === "coches";
  $("#section-title").textContent = cars ? "Coches" : "Materiales";
  $("#kind-label").textContent = cars ? "Categoría" : "Tipo";
  document.querySelectorAll("[data-section]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.section === section)));
  $("#search").value = "";
  options($("#kind"), state.data[section].map(item => cars ? item.categoria : item.tipo), cars ? "Todas las categorías" : "Todos los tipos");
  options($("#manufacturer"), state.data[section].map(item => item.fabricante), "Todos los fabricantes");
  render();
}
function render() {
  if (!state.ready) return;
  const cars = state.section === "coches";
  const terms = normalize($("#search").value).trim().split(/\s+/).filter(Boolean);
  const items = state.data[state.section].filter(item => {
    const searchable = normalize(cars ? [item.cocheID,item.denominacion,item.fabricante,item.codFabricante,item.descDeco,item.categoria,item.anio,item.observaciones,item.notas].join(" ") : [item.parteID,item.tipo,item.descParte,item.fabricante,item.codFabricante].join(" "));
    return terms.every(term => searchable.includes(term)) && (!$("#kind").value || (cars ? item.categoria : item.tipo) === $("#kind").value) && (!$("#manufacturer").value || item.fabricante === $("#manufacturer").value);
  });
  $("#count").textContent = `${items.length} de ${state.data[state.section].length} resultados`;
  $("#message").hidden = items.length > 0;
  $("#message").textContent = "No hay resultados. Prueba otra búsqueda o limpia los filtros.";
  $("#results").replaceChildren(...items.map(item => {
    const title = cars ? item.denominacion : item.descParte;
    const card = element("button", "card");
    card.type = "button";
    card.setAttribute("aria-label", `Ver ficha de ${title}`);
    card.setAttribute("aria-haspopup", "dialog");
    card.append(picture(cars ? item.imagenes?.slot : item.imagen, title, "card-image"));
    const body = element("span", "card-body");
    body.append(element("span", "badge", cars ? item.categoria : item.tipo), element("strong", "card-title", title), element("span", "card-meta", `${display(item.fabricante)} · ${display(item.codFabricante)}`));
    const bottom = element("span", "card-bottom");
    bottom.append(element("span", "", cars ? display(item.anio) : `Stock: ${display(item.stock)}`), element("span", "", "Ver ficha ↗"));
    body.append(bottom);
    card.append(body);
    card.addEventListener("click", () => showDetail(item, cars));
    return card;
  }));
}
function showDetail(item, cars) {
  const title = cars ? item.denominacion : item.descParte;
  const heading = element("h2", "", title);
  heading.id = "detail-title";
  const gallery = element("div", "gallery");
  const images = cars ? [["Modelo slot", item.imagenes?.slot], ["Coche real", item.imagenes?.real]] : [["Material", item.imagen]];
  images.forEach(([caption, path]) => {
    const figure = element("figure");
    figure.append(picture(path, `${title} · ${caption}`), element("figcaption", "", caption));
    gallery.append(figure);
  });
  const fields = cars ? [
    ["ID del coche",item.cocheID],["Fabricante",item.fabricante],["Referencia",item.codFabricante],["Decoración",item.descDeco],["Categoría",item.categoria],["Año",item.anio],
    ...[["Largo total","largoTotal"],["Ancho total","anchoTotal"],["Alto total","altoTotal"],["Entre ejes","entreEjes"],["Batalla","batalla"]].map(([label,key]) => [label, item.dimensiones?.[key] == null ? null : `${item.dimensiones[key]} mm`]),
    ["Observaciones",item.observaciones],["Notas",item.notas]
  ] : [["ID del material",item.parteID],["Tipo",item.tipo],["Descripción",item.descParte],["Fabricante",item.fabricante],["Referencia",item.codFabricante],["Cantidad",item.cantidad],["Stock",item.stock],["Usado",yesNo(item.usado)],["En lista de compra",yesNo(item.listaCompra)],["Valor 1",item.valor1],["Valor 2",item.valor2],["Peso",item.peso == null ? null : `${item.peso} g`],["Precio",item.precio == null ? null : money.format(item.precio)]];
  const list = element("dl");
  fields.forEach(([label,value]) => { const field = element("div","field"); field.append(element("dt","",label),element("dd","",display(value))); list.append(field); });
  $("#detail-content").replaceChildren(heading,gallery,list);
  $("#detail").showModal();
  $("#close-detail").focus();
}
$("#close-detail").addEventListener("click", () => $("#detail").close());
$("#detail").addEventListener("click", event => {
  if (event.target !== $("#detail")) return;
  const box = event.target.getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) event.target.close();
});
$("#search").addEventListener("input",render);
[$("#kind"),$("#manufacturer")].forEach(select => select.addEventListener("change",render));
$("#reset").addEventListener("click", () => { $("#search").value = ""; $("#kind").value = ""; $("#manufacturer").value = ""; render(); });
document.querySelectorAll("[data-section]").forEach(button => button.addEventListener("click", () => setSection(button.dataset.section)));
async function start() {
  try {
    const sections = ["coches","materiales"];
    const loaded = await Promise.all(sections.map(async section => {
      const response = await fetch(`data/${section}.json?v=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error("Formato JSON incorrecto");
      return data;
    }));
    sections.forEach((section,index) => state.data[section] = loaded[index]);
    state.ready = true;
    setSection(state.section);
  } catch (error) {
    $("#count").textContent = "Catálogo no disponible";
    $("#message").hidden = false;
    $("#message").textContent = location.protocol === "file:" ? "Abre esta página desde GitHub Pages o un servidor HTTP local para cargar los datos JSON." : "No se han podido cargar los datos. Recarga la página para volver a intentarlo.";
    console.error("Error al cargar el catálogo:", error);
  } finally { $("#results").setAttribute("aria-busy","false"); }
}
start();
