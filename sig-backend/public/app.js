// SK-3: Leaflet dasar — memuat data dari API Express, menampilkan, dan digitasi zona

const WARNA_JENIS = {
  panti_asuhan: '#c62828',
  panti_jompo: '#1565c0',
  rumah_singgah: '#ef6c00',
};

const map = L.map('map').setView([-0.03, 109.32], 12);
let layerZona; // di luar fungsi supaya bisa dipakai handler digitasi

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors',
}).addTo(map);

// Ambil JSON dari API; lempar error jika server menjawab bukan 2xx
async function ambil(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

// Amankan teks dari data sebelum masuk ke HTML popup
const esc = (t) => String(t).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// null = tidak tercatat (berbeda dari 0 yang memang tercatat dari dinas)
const nilai = (v) => (v === null || v === undefined ? 'Tidak tercatat' : esc(v));

function buatLayerSosial(data) {
  return L.geoJSON(data, {
    pointToLayer: (f, latlng) => L.circleMarker(latlng, {
      radius: 8,
      fillColor: WARNA_JENIS[f.properties.jenis_lembaga] || '#616161',
      fillOpacity: 0.9,
      color: '#fff',
      weight: 2,
    }),
    onEachFeature: (f, layer) => {
      const p = f.properties;
      layer.bindTooltip(esc(p.nama));
      layer.bindPopup(
        `<div class="popup"><b>${esc(p.nama)}</b>` +
        `Jenis: ${esc(p.jenis_lembaga)}<br>` +
        `Jumlah anak: ${nilai(p.jumlah_anak)}<br>` +
        `Izin: ${nilai(p.izin)}<br>` +
        `Kontak: ${nilai(p.kontak)}</div>`
      );
    },
  });
}

function buatLayerJalan(data) {
  return L.geoJSON(data, {
    style: { color: '#6d4c41', weight: 3 },
    onEachFeature: (f, layer) => {
      if (f.properties.name) layer.bindTooltip(esc(f.properties.name), { sticky: true });
    },
  });
}

function buatLayerZona(data) {
  return L.geoJSON(data, {
    style: { color: '#6a1b9a', weight: 2, fillOpacity: 0.25 },
    onEachFeature: (f, layer) => {
      if (f.properties && f.properties.nama_zona) {
        layer.bindTooltip(esc(f.properties.nama_zona), { sticky: true });
      }
    },
  });
}

// Digitasi web: gambar poligon -> toGeoJSON() -> POST ke server
function aktifkanDigitasi() {
  map.addControl(new L.Control.Draw({
    draw: {
      polygon: true,
      polyline: false, rectangle: false, circle: false,
      marker: false, circlemarker: false,
    },
    edit: false,
  }));

  map.on(L.Draw.Event.CREATED, async (e) => {
    const nama = prompt('Nama zona sosial:');
    if (!nama || !nama.trim()) return;       // dibatalkan, tidak disimpan

    const geojson = e.layer.toGeoJSON();     // layer gambar -> GeoJSON Feature
    geojson.properties = { nama_zona: nama.trim() };

    try {
      const res = await fetch('/api/feature/zona', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature: geojson }),
      });
      if (!res.ok) throw new Error('Server menjawab ' + res.status);
      layerZona.addData(geojson);            // tampilkan langsung di peta
    } catch (err) {
      alert('Gagal menyimpan zona: ' + err.message);
    }
  });
}

async function mulai() {
  try {
    // tiga request berjalan paralel
    const [sosial, jalan, zona] = await Promise.all([
      ambil('/api/data/sosial'),
      ambil('/api/data/jalan'),
      ambil('/api/data/zona'),
    ]);

    const layerSosial = buatLayerSosial(sosial).addTo(map);
    const layerJalan = buatLayerJalan(jalan).addTo(map);
    layerZona = buatLayerZona(zona).addTo(map);
    layerSosial.bringToFront();              // titik di atas poligon agar bisa diklik

    L.control.layers(null, {
      'Lembaga sosial': layerSosial,
      'Jalan utama': layerJalan,
      'Zona sosial': layerZona,
    }, { collapsed: false }).addTo(map);

    map.fitBounds(layerSosial.getBounds(), { padding: [30, 30] });

    aktifkanDigitasi();
  } catch (err) {
    console.error(err);
    const pesan = document.getElementById('pesan');
    pesan.textContent = 'Gagal memuat data: ' + err.message;
    pesan.hidden = false;
  }
}

mulai();