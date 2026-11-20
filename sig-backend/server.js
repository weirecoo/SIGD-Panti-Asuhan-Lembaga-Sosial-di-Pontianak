const express = require("express");
const fs = require("fs/promises");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");

const LAYER = {
  sosial: "sosial_west",
  jalan: "jalan_utama",
  zona: "zona_sosial",
};

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const lokasi = (alias) => path.join(DATA_DIR, `${LAYER[alias]}.geojson`);
const bacaGeoJSON = async (alias) => JSON.parse(await fs.readFile(lokasi(alias), "utf-8"));

function kirimError(err, res) {
  if (err.code === "ENOENT") return res.status(404).json({ error: "File data tidak ditemukan" });
  if (err instanceof SyntaxError) return res.status(500).json({ error: "File GeoJSON rusak" });
  console.error(err);
  res.status(500).json({ error: "Kesalahan server" });
}

app.get("/api/data/:layer", async (req, res) => {
  const alias = req.params.layer;
  if (!Object.hasOwn(LAYER, alias)) return res.status(404).json({ error: "Layer tidak dikenal", tersedia: Object.keys(LAYER) });
  try { res.json(await bacaGeoJSON(alias)); }
  catch (err) { kirimError(err, res); }
});

app.get("/api/stats/jenis", async (req, res) => {
  try {
    const { features } = await bacaGeoJSON("sosial");
    const jenis = {};
    for (const f of features) {
      const k = f.properties?.jenis_lembaga ?? "tidak_tercatat";
      jenis[k] = (jenis[k] || 0) + 1;
    }
    res.json({ total: features.length, jenis });
  } catch (err) { kirimError(err, res); }
});

let antrean = Promise.resolve();
app.post("/api/feature/zona", (req, res) => {
  const feature = req.body?.feature;
  const tipe = feature?.geometry?.type;
  if (feature?.type !== "Feature" || !["Polygon", "MultiPolygon"].includes(tipe)) {
    return res.status(400).json({ error: "Body harus { feature: <GeoJSON Feature bertipe Polygon> }" });
  }
  antrean = antrean.then(async () => {
    try {
      const data = await bacaGeoJSON("zona");
      data.features.push(feature);
      const sementara = lokasi("zona") + ".tmp";
      await fs.writeFile(sementara, JSON.stringify(data, null, 1));
      await fs.rename(sementara, lokasi("zona"));
      res.status(201).json({ ok: true, total: data.features.length });
    } catch (err) { kirimError(err, res); }
  });
});

app.put("/api/feature/zona", (req, res) => {
  const features = Array.isArray(req.body?.features)
    ? req.body.features
    : (req.body?.type === "FeatureCollection" && Array.isArray(req.body.features) ? req.body.features : null);

  if (!features) {
    return res.status(400).json({ error: "Body harus { features: [...] } atau FeatureCollection zona" });
  }

  const valid = features.every((f) => f && f.type === "Feature" && ["Polygon", "MultiPolygon"].includes(f.geometry?.type));
  if (!valid) {
    return res.status(400).json({ error: "Semua fitur harus GeoJSON Feature Polygon/MultiPolygon" });
  }

  antrean = antrean.then(async () => {
    try {
      const data = await bacaGeoJSON("zona");
      data.features = features;
      const sementara = lokasi("zona") + ".tmp";
      await fs.writeFile(sementara, JSON.stringify(data, null, 1));
      await fs.rename(sementara, lokasi("zona"));
      res.json({ ok: true, total: data.features.length });
    } catch (err) { kirimError(err, res); }
  });
});

app.listen(PORT, () => console.log(`Server berjalan di http://localhost:${PORT}`));
