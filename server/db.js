/**
 * PostgreSQL bağlantı havuzu
 * Railway'de DATABASE_URL env variable otomatik set edilir.
 */

const { Pool } = require('pg');

/**
 * SSL — yalnızca UZAK veritabanında.
 *
 * Eski kontrol sadece 'localhost' arıyordu; aynı makinedeki Postgres'e
 * 127.0.0.1 ile bağlanınca SSL açılıyor, yerel Postgres varsayılan olarak
 * SSL sunmadığı için bağlantı reddediliyordu. Aynı makine = SSL'e gerek yok,
 * trafik döngü arayüzünden çıkmıyor.
 */
const DB_URL = process.env.DATABASE_URL || '';
const IS_LOCAL_DB = /@(localhost|127\.0\.0\.1|\[::1\]|::1)[:/]/.test(DB_URL);

const pool = new Pool({
  connectionString: DB_URL,
  ssl: IS_LOCAL_DB ? false : { rejectUnauthorized: false },
});

// Tabloları oluştur (ilk çalışmada)
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id           SERIAL PRIMARY KEY,
      email        VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at   TIMESTAMP DEFAULT NOW()
    );

    /**
     * ÇOKLU KÖY: user_id artık UNIQUE DEĞİL. Bir oyuncunun birden fazla köyü
     * olabiliyor; köyü benzersiz kılan şey (user_id, slot_key) çifti.
     * Yeni kurulumlarda kısıt hiç konmuyor, eski kurulumlarda aşağıdaki
     * göç adımında düşürülüyor.
     */
    CREATE TABLE IF NOT EXISTS villages (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
      state      JSONB NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Dünya haritasındaki NPC köyleri (tek ortak dünya)
    CREATE TABLE IF NOT EXISTS world_villages (
      slot_key   TEXT PRIMARY KEY,
      q          INTEGER NOT NULL,
      r          INTEGER NOT NULL,
      tier       INTEGER NOT NULL,
      name       TEXT NOT NULL,
      state      JSONB NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Oyuncu köyünün harita konumu
  await pool.query(`
    ALTER TABLE villages ADD COLUMN IF NOT EXISTS slot_key     TEXT;
    ALTER TABLE villages ADD COLUMN IF NOT EXISTS village_name TEXT;
    ALTER TABLE villages ADD COLUMN IF NOT EXISTS is_capital   BOOLEAN NOT NULL DEFAULT FALSE;
  `);

  /**
   * OYUNCU ADI.
   *
   * Eskiden herkes haritada ve raporlarda e-postasının @ öncesiyle
   * görünüyordu. `display_name` boş kaldığı sürece eski davranış sürer;
   * oyuncu adını verdiği anda her yerde o görünür.
   *
   * Benzersizlik BÜYÜK/küçük harf duyarsız: "Ilkan" ile "ilkan" aynı
   * sayılır, taklit edilemesin diye.
   */
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;
    CREATE UNIQUE INDEX IF NOT EXISTS users_display_name_idx
      ON users (lower(display_name)) WHERE display_name IS NOT NULL;
  `);

  /**
   * GÖÇ — tek köyden çoklu köye.
   *
   * Eski şemada `user_id UNIQUE` vardı; adı otomatik üretildiği için
   * (villages_user_id_key) doğrudan düşürmek yerine katalogdan bulup
   * düşürüyoruz. Kısıt yoksa hiçbir şey yapılmaz, yani bu blok her
   * açılışta güvenle çalışır.
   */
  await pool.query(`
    DO $$
    DECLARE con text;
    BEGIN
      SELECT conname INTO con FROM pg_constraint
        WHERE conrelid = 'villages'::regclass AND contype = 'u'
          AND pg_get_constraintdef(oid) = 'UNIQUE (user_id)';
      IF con IS NOT NULL THEN
        EXECUTE format('ALTER TABLE villages DROP CONSTRAINT %I', con);
        RAISE NOTICE 'villages: user_id UNIQUE kisiti dusuruldu (coklu koy)';
      END IF;
    END $$;
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS villages_slot_key_idx
      ON villages (slot_key) WHERE slot_key IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS villages_user_slot_idx
      ON villages (user_id, slot_key);
  `);

  // Merkezi olmayan oyuncularda ilk köy merkez sayılır
  await pool.query(`
    UPDATE villages v SET is_capital = TRUE
    WHERE NOT EXISTS (
      SELECT 1 FROM villages w WHERE w.user_id = v.user_id AND w.is_capital
    )
    AND v.id = (SELECT MIN(id) FROM villages x WHERE x.user_id = v.user_id);
  `);
  /**
   * MESAJLAŞMA.
   *
   * Silme İKİ TARAFLI ve YUMUŞAK: gönderenin silmesi alıcının kutusundan
   * mesajı kaldırmıyor, tersi de öyle. Tek bir `deleted` alanı olsaydı
   * biri sildiğinde diğerinin okuduğu yazı gözünün önünde kaybolurdu —
   * şikâyet gelen bir mesajı gönderen tek tıkla yok edebilirdi.
   *
   * `okundu_at` zaman damgası, boolean değil: "ne zaman okudu" ileride
   * birlik mesajlarında ve şikâyet incelemesinde gerekecek.
   */
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id             SERIAL PRIMARY KEY,
      from_user_id   INTEGER REFERENCES users(id) ON DELETE CASCADE,
      to_user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
      konu           TEXT NOT NULL,
      govde          TEXT NOT NULL,
      at             TIMESTAMP DEFAULT NOW(),
      okundu_at      TIMESTAMP,
      gonderen_sildi BOOLEAN NOT NULL DEFAULT FALSE,
      alan_sildi     BOOLEAN NOT NULL DEFAULT FALSE
    );
    CREATE INDEX IF NOT EXISTS messages_to_idx   ON messages (to_user_id, id DESC);
    CREATE INDEX IF NOT EXISTS messages_from_idx ON messages (from_user_id, id DESC);

    CREATE TABLE IF NOT EXISTS message_blocks (
      user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
      blocked_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      at         TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (user_id, blocked_id)
    );
  `);

  /*
    BİRLİK TABLOLARI.

    `alliance_members.user_id` TEKİL: bir oyuncu aynı anda tek birlikte
    olabilir. Kısıt uygulamada değil ŞEMADA — "önce sorgula, sonra ekle"
    iki eşzamanlı kabulde ikisini de geçirirdi.

    Birlik adı da tekil (küçük harfe indirilmiş): iki aynı adlı birlik
    haritada ve davet aramasında ayırt edilemezdi.

    Kurucu silinirse birlik DURUYOR (`ON DELETE SET NULL`): üyeleri olan
    bir birliği kurucunun hesap silmesiyle yok etmek geri kalan herkesi
    cezalandırırdı. Konung'suz kalan birliği yönetim devri onarıyor.
  */
  await pool.query(`
    CREATE TABLE IF NOT EXISTS alliances (
      id         SERIAL PRIMARY KEY,
      ad         TEXT NOT NULL,
      amblem     TEXT NOT NULL,
      kurucu_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS alliances_ad_idx ON alliances (lower(ad));

    CREATE TABLE IF NOT EXISTS alliance_members (
      alliance_id INTEGER NOT NULL REFERENCES alliances(id) ON DELETE CASCADE,
      user_id     INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      rutbe       TEXT NOT NULL DEFAULT 'karl',
      at          TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (alliance_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS alliance_members_a_idx ON alliance_members (alliance_id);

    CREATE TABLE IF NOT EXISTS alliance_invites (
      id          SERIAL PRIMARY KEY,
      alliance_id INTEGER NOT NULL REFERENCES alliances(id) ON DELETE CASCADE,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      davet_eden  INTEGER REFERENCES users(id) ON DELETE SET NULL,
      at          TIMESTAMP DEFAULT NOW(),
      UNIQUE (alliance_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS alliance_invites_u_idx ON alliance_invites (user_id);
  `);

  console.log('[DB] Tablolar hazır (çoklu köy şeması)');
}

/**
 * KULLANICI KAYIT — oyuncu adı AYNI INSERT'te yazılır.
 *
 * Ad kayıt anında alınıyor ve bir daha değişmiyor; iki adımda yazmak
 * (önce kullanıcı, sonra UPDATE) adsız hesap bırakma riskini ve ikinci
 * bir yarış penceresini getirirdi. Benzersizlik iki tekil dizinle
 * korunuyor (email + lower(display_name)); çakışmada 23505 atıyor ve
 * HANGİ alanın çakıştığını çağırana söylüyoruz.
 *
 * @returns {{id,email,display_name}} ya da { hata: 'email' | 'ad' }
 */
async function createUser(email, passwordHash, displayName = null) {
  try {
    const res = await pool.query(
      `INSERT INTO users (email, password_hash, display_name)
       VALUES ($1, $2, $3) RETURNING id, email, display_name`,
      [email.toLowerCase().trim(), passwordHash, displayName]
    );
    return res.rows[0];
  } catch (e) {
    if (e.code === '23505') {
      // constraint adı sürüme göre değişebiliyor; alan adına da bakıyoruz
      const d = `${e.constraint || ''} ${e.detail || ''}`.toLowerCase();
      return { hata: d.includes('display_name') ? 'ad' : 'email' };
    }
    throw e;
  }
}

// Email ile kullanıcı bul
async function findUserByEmail(email) {
  const res = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email.toLowerCase().trim()]
  );
  return res.rows[0] || null;
}

// ID ile kullanıcı bul
async function findUserById(id) {
  const res = await pool.query(
    'SELECT id, email, display_name FROM users WHERE id = $1', [id]);
  return res.rows[0] || null;
}

/**
 * OYUNCU ADINI YAZ.
 *
 * Benzersizlik veritabanındaki tekil dizinle korunuyor; çakışmada
 * PostgreSQL 23505 atıyor ve burada `null` dönüyoruz — çağıran taraf
 * bunu "bu ad alınmış" diye kullanıcıya gösterir. Yarış durumunda
 * (iki kişi aynı anda aynı adı alırsa) tek doğru koruma budur,
 * önden SELECT ile bakmak yetmez.
 */
async function setDisplayName(userId, name) {
  try {
    const res = await pool.query(
      'UPDATE users SET display_name = $2 WHERE id = $1 RETURNING id, email, display_name',
      [userId, name]
    );
    return res.rows[0] || null;
  } catch (e) {
    if (e.code === '23505') return null;   // ad alınmış
    throw e;
  }
}

/** Bütün oyuncu adları (userId -> display_name); dünya haritası için */
async function loadDisplayNames() {
  const res = await pool.query(
    'SELECT id, display_name FROM users WHERE display_name IS NOT NULL');
  return new Map(res.rows.map(r => [r.id, r.display_name]));
}

/** Tek köyün adını değiştir */
async function renameVillage(userId, slotKey, name) {
  const res = await pool.query(
    'UPDATE villages SET village_name = $3 WHERE user_id = $1 AND slot_key = $2 RETURNING slot_key',
    [userId, slotKey, name]
  );
  return res.rowCount > 0;
}

// Köy state'ini yükle
/**
 * "BOŞ" STATE = KÖY YOK.
 *
 * setPlayerSlot köy satırını state'ten ÖNCE oluşturuyor ve NOT NULL kolonu
 * '{}' yer tutucusuyla dolduruyor. Bu yer tutucu JS'te truthy olduğu için
 * çağıran taraf onu gerçek bir kayıt sanıyor, hydrateVillage boş nesneyi köy
 * diye döndürüyor ve ilk payload'da productionTiles bulunmadığı için sunucu
 * ÇÖKÜYORDU — üretimde ilk oyuncu bağlantısında. Dev deposunda slot ayrı bir
 * tabloda durduğu için bu yol hiç görünmedi.
 */
function realState(st) {
  return (st && typeof st === 'object' && st.productionTiles && st.resources)
    ? st : null;
}

/**
 * Bir oyuncunun BÜTÜN köyleri. Merkez köy önce gelir, sonrası slot
 * anahtarına göre sıralı — arayüzdeki köy listesi böylece hep aynı sırada.
 * Yer tutucu satırlar (slot alınmış ama köy kurulmamış) `state: null` döner.
 */
async function loadVillages(userId) {
  const res = await pool.query(
    `SELECT slot_key, village_name, is_capital, state, updated_at
     FROM villages WHERE user_id = $1
     ORDER BY is_capital DESC, slot_key ASC`,
    [userId]
  );
  return res.rows.map(r => ({
    slotKey: r.slot_key,
    name: r.village_name,
    isCapital: !!r.is_capital,
    state: realState(r.state),
    updatedAt: r.updated_at,
  }));
}

/** Geriye dönük: tek köy bekleyen çağrı yerleri için merkez/ilk köy */
async function loadVillage(userId) {
  const list = await loadVillages(userId);
  return list.find(x => x.state)?.state || null;
}

// ─── Dünya haritası ────────────────────────────────────────────────

async function loadNpcVillages() {
  const res = await pool.query('SELECT slot_key, q, r, tier, name, state, updated_at FROM world_villages');
  return res.rows.map(row => ({
    slotKey: row.slot_key, q: row.q, r: row.r,
    tier: row.tier, name: row.name, state: row.state,
    updatedAt: row.updated_at,     // offline telafi bunu kullanır
  }));
}

async function saveNpcVillages(list) {
  if (!list.length) return;
  // Tek sorguda toplu upsert
  const values = [];
  const params = [];
  list.forEach((n, i) => {
    const o = i * 6;
    values.push(`($${o + 1}, $${o + 2}, $${o + 3}, $${o + 4}, $${o + 5}, $${o + 6}, NOW())`);
    const serializable = {
      ...n.state,
      TOWER_SLOTS: [...n.state.TOWER_SLOTS],
      PRODUCTION_RING_1: [...n.state.PRODUCTION_RING_1],
    };
    params.push(n.slotKey, n.q, n.r, n.tier, n.name, JSON.stringify(serializable));
  });
  await pool.query(
    `INSERT INTO world_villages (slot_key, q, r, tier, name, state, updated_at)
     VALUES ${values.join(', ')}
     ON CONFLICT (slot_key) DO UPDATE
     SET state = EXCLUDED.state, updated_at = NOW()`,
    params
  );
}

/** Oyuncu köylerinin harita konumları */
async function loadPlayerSlots() {
  const res = await pool.query(
    `SELECT v.user_id, v.slot_key, v.village_name, u.email, u.display_name
     FROM villages v JOIN users u ON u.id = v.user_id
     WHERE v.slot_key IS NOT NULL`
  );
  return res.rows.map(r => ({
    userId: r.user_id, slotKey: r.slot_key,
    name: r.village_name, email: r.email,
    displayName: r.display_name || null,
  }));
}

/**
 * Oyuncuya bir slot yaz. Çoklu köyde çakışma anahtarı (user_id, slot_key):
 * aynı slot yeniden yazılırsa adı güncellenir, yeni slot ise YENİ SATIR
 * açılır. `isCapital` verilirse o köy merkez olur ve oyuncunun diğer
 * köylerinin merkezliği düşürülür (merkez tek olabilir).
 */
async function setPlayerSlot(userId, slotKey, name, isCapital = false) {
  await pool.query(
    `INSERT INTO villages (user_id, state, slot_key, village_name, is_capital, updated_at)
     VALUES ($1, '{}'::jsonb, $2, $3, $4, NOW())
     ON CONFLICT (user_id, slot_key) DO UPDATE
     SET village_name = EXCLUDED.village_name`,
    [userId, slotKey, name, !!isCapital]
  );
  if (isCapital) await setCapital(userId, slotKey);
}

/** Merkez köyü taşı — oyuncunun yalnız BİR merkezi olabilir */
async function setCapital(userId, slotKey) {
  await pool.query(
    `UPDATE villages SET is_capital = (slot_key = $2) WHERE user_id = $1`,
    [userId, slotKey]
  );
}

/** Oyuncunun bir köyünü sil (fethedilme / terk) */
async function deleteVillage(userId, slotKey) {
  await pool.query(
    'DELETE FROM villages WHERE user_id = $1 AND slot_key = $2',
    [userId, slotKey]
  );
}

/**
 * HESABI TAMAMEN SİL — son köyü de düşen oyuncu oyundan çıkar.
 *
 * İlkan'ın kararı: *"köyleri haritadan silinen oyuncu oyundan tamamen
 * silinir"*. Yumuşatmak (boş kabuk köy bırakmak) düşünülmüştü ama
 * reddedildi: kuşatmanın nihai bedeli olmadan köy yıkımı yarım bir
 * mekanik olurdu.
 *
 * KÖYLER ÖNCE siliniyor: villages.user_id yabancı anahtar; ters sırada
 * silme kısıtlamaya takılırdı. Mesajlar da öyle.
 */
async function deleteUser(userId) {
  await pool.query('DELETE FROM villages WHERE user_id = $1', [userId]);
  /*
    Mesajlar SESSİZCE geçiliyor: tablo şemaya sonradan eklendi ve eski
    kurulumlarda olmayabilir. Hesabın silinmesi, mesaj tablosu yok diye
    yarıda kalmamalı.
  */
  try {
    await pool.query(
      'DELETE FROM messages WHERE from_user_id = $1 OR to_user_id = $1', [userId]);
  } catch (err) {
    console.error('[HESAP SİL] mesajlar silinemedi:', err.message);
  }
  await pool.query('DELETE FROM users WHERE id = $1', [userId]);
}

// Köy state'ini kaydet / güncelle
/**
 * Bir köyü kaydet. Çoklu köyde `slotKey` ZORUNLU: hangi köy olduğunu o
 * belirliyor. TOWER_SLOTS ve PRODUCTION_RING_1 Set/Array olduğu için
 * JSON'a yazarken diziye çevrilir.
 */
async function saveVillage(userId, slotKey, state) {
  if (!slotKey) throw new Error('saveVillage: slotKey zorunlu (çoklu köy)');
  const serializable = {
    ...state,
    TOWER_SLOTS: [...state.TOWER_SLOTS],
    PRODUCTION_RING_1: [...state.PRODUCTION_RING_1],
  };
  await pool.query(
    `INSERT INTO villages (user_id, slot_key, state, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_id, slot_key) DO UPDATE
     SET state = $3, updated_at = NOW()`,
    [userId, slotKey, JSON.stringify(serializable)]
  );
}

// Tüm köyleri yükle (sunucu başlangıcında offline catch-up için)
/** Tüm oyuncu köyleri (açılışta offline telafi için) — köy başına bir satır */
async function loadAllVillages() {
  const res = await pool.query(
    'SELECT user_id, slot_key, village_name, is_capital, state, updated_at FROM villages'
  );
  // Yer tutucu satırlar (slot alınmış ama köy henüz kaydedilmemiş) atlanır
  return res.rows
    .filter(row => realState(row.state))
    .map(row => ({
      userId: row.user_id,
      slotKey: row.slot_key,
      name: row.village_name,
      isCapital: !!row.is_capital,
      state: row.state,
      updatedAt: row.updated_at,
    }));
}

// ═══════════════════════════════════════════════════════════════════
//  MESAJLAŞMA
// ═══════════════════════════════════════════════════════════════════

/** Oyuncu adıyla kullanıcı bul — mesaj alıcısı adla seçiliyor */
async function findUserByDisplayName(name) {
  const res = await pool.query(
    'SELECT id, email, display_name FROM users WHERE lower(display_name) = lower($1)',
    [String(name || '').trim()]
  );
  return res.rows[0] || null;
}

async function mesajYaz({ fromUserId, toUserId, konu, govde }) {
  const res = await pool.query(
    `INSERT INTO messages (from_user_id, to_user_id, konu, govde)
     VALUES ($1, $2, $3, $4) RETURNING id, at`,
    [fromUserId, toUserId, konu, govde]
  );
  return res.rows[0];
}

/**
 * YAZIŞMA LİSTESİ — gelen VE giden, tek sorguda.
 *
 * Arayüz mesajları karşı oyuncuya göre grupluyor (sohbet görünümü), yani
 * iki ayrı kutu değil tek bir akış gerekiyor. Gelen/giden ayrımı
 * satırdaki `benden` bayrağıyla yapılıyor.
 *
 * SİLME TEK TARAFLI olduğu için süzgeç de yöne göre: benim sildiğim
 * mesaj benden gizlenir, karşı tarafta durmaya devam eder.
 *
 * Karşı tarafın ADI sorguda birleştiriliyor; istemciye userId göndermek
 * hem işe yaramıyor hem de oyuncuları numaralarıyla eşleştirmeye yarardı.
 */
async function mesajKutusu(userId, { limit = 300 } = {}) {
  const res = await pool.query(
    `SELECT m.id, m.konu, m.govde, m.at, m.okundu_at,
            m.from_user_id, m.to_user_id,
            gf.display_name AS gonderen_ad, gt.display_name AS alan_ad
       FROM messages m
       JOIN users gf ON gf.id = m.from_user_id
       JOIN users gt ON gt.id = m.to_user_id
      WHERE (m.to_user_id   = $1 AND m.alan_sildi     = FALSE)
         OR (m.from_user_id = $1 AND m.gonderen_sildi = FALSE)
      ORDER BY m.id DESC
      LIMIT $2`,
    [userId, Math.min(500, Math.max(1, limit))]
  );
  return res.rows.map(r => {
    const benden = r.from_user_id === userId;
    return {
      id: r.id, konu: r.konu, govde: r.govde,
      at: r.at, okundu: !!r.okundu_at, benden,
      karsiAd: benden ? r.alan_ad : r.gonderen_ad,
    };
  });
}

async function mesajOkunmamisSayisi(userId) {
  const res = await pool.query(
    `SELECT COUNT(*)::int AS n FROM messages
      WHERE to_user_id = $1 AND okundu_at IS NULL AND alan_sildi = FALSE`,
    [userId]
  );
  return res.rows[0]?.n || 0;
}

/** Okundu işaretle — YALNIZ alıcı. Gönderen kendi mesajını okutamaz. */
async function mesajOkundu(userId, id) {
  const res = await pool.query(
    `UPDATE messages SET okundu_at = NOW()
      WHERE id = $1 AND to_user_id = $2 AND okundu_at IS NULL RETURNING id`,
    [id, userId]
  );
  return !!res.rows[0];
}

/** Yumuşak silme — yalnız SİLENİN kutusundan kalkar */
async function mesajSil(userId, id) {
  const res = await pool.query(
    `UPDATE messages
        SET alan_sildi     = CASE WHEN to_user_id   = $2 THEN TRUE ELSE alan_sildi END,
            gonderen_sildi = CASE WHEN from_user_id = $2 THEN TRUE ELSE gonderen_sildi END
      WHERE id = $1 AND (to_user_id = $2 OR from_user_id = $2) RETURNING id`,
    [id, userId]
  );
  return !!res.rows[0];
}

async function engelEkle(userId, blockedId) {
  await pool.query(
    `INSERT INTO message_blocks (user_id, blocked_id) VALUES ($1, $2)
     ON CONFLICT DO NOTHING`, [userId, blockedId]);
}
async function engelKaldir(userId, blockedId) {
  await pool.query(
    'DELETE FROM message_blocks WHERE user_id = $1 AND blocked_id = $2',
    [userId, blockedId]);
}
async function engelListesi(userId) {
  const res = await pool.query(
    `SELECT b.blocked_id, u.display_name FROM message_blocks b
       JOIN users u ON u.id = b.blocked_id WHERE b.user_id = $1`, [userId]);
  return res.rows.map(r => ({ userId: r.blocked_id, ad: r.display_name }));
}
/** A, B'yi engellemiş mi? (gönderim denetiminde alıcı tarafa bakılır) */
async function engelliMi(userId, otherId) {
  const res = await pool.query(
    'SELECT 1 FROM message_blocks WHERE user_id = $1 AND blocked_id = $2',
    [userId, otherId]);
  return res.rowCount > 0;
}

// ── Birlik ─────────────────────────────────────────────────────────

/** Bütün birlikler + üyelikleri — açılışta belleğe alınır */
async function loadAlliances() {
  const a = await pool.query(
    'SELECT id, ad, amblem, kurucu_id FROM alliances ORDER BY id');
  const m = await pool.query(
    'SELECT alliance_id, user_id, rutbe FROM alliance_members');
  const inv = await pool.query(
    'SELECT id, alliance_id, user_id, davet_eden FROM alliance_invites');
  return {
    birlikler: a.rows,
    uyeler: m.rows,
    davetler: inv.rows,
  };
}

/** Birliği kur ve kurucusunu Konung olarak yaz — TEK İŞLEMDE */
async function birlikKur({ ad, amblem, kurucuId }) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const r = await c.query(
      'INSERT INTO alliances (ad, amblem, kurucu_id) VALUES ($1,$2,$3) RETURNING id',
      [ad, amblem, kurucuId]);
    const id = r.rows[0].id;
    await c.query(
      `INSERT INTO alliance_members (alliance_id, user_id, rutbe)
       VALUES ($1,$2,'konung')`, [id, kurucuId]);
    await c.query('COMMIT');
    return { id };
  } catch (err) {
    await c.query('ROLLBACK');
    if (err.code === '23505') return { hata: 'ad_alinmis' };
    throw err;
  } finally {
    c.release();
  }
}

async function birlikSil(allianceId) {
  await pool.query('DELETE FROM alliances WHERE id = $1', [allianceId]);
}

async function birlikAdDegistir(allianceId, ad, amblem) {
  try {
    await pool.query('UPDATE alliances SET ad = $2, amblem = $3 WHERE id = $1',
      [allianceId, ad, amblem]);
    return {};
  } catch (err) {
    if (err.code === '23505') return { hata: 'ad_alinmis' };
    throw err;
  }
}

async function uyeEkle(allianceId, userId, rutbe = 'karl') {
  try {
    await pool.query(
      'INSERT INTO alliance_members (alliance_id, user_id, rutbe) VALUES ($1,$2,$3)',
      [allianceId, userId, rutbe]);
    return {};
  } catch (err) {
    if (err.code === '23505') return { hata: 'zaten_birlikte' };
    throw err;
  }
}

async function uyeCikar(userId) {
  await pool.query('DELETE FROM alliance_members WHERE user_id = $1', [userId]);
}

async function uyeRutbe(userId, rutbe) {
  await pool.query('UPDATE alliance_members SET rutbe = $2 WHERE user_id = $1',
    [userId, rutbe]);
}

async function davetYaz(allianceId, userId, davetEden) {
  try {
    await pool.query(
      'INSERT INTO alliance_invites (alliance_id, user_id, davet_eden) VALUES ($1,$2,$3)',
      [allianceId, userId, davetEden]);
    return {};
  } catch (err) {
    if (err.code === '23505') return { hata: 'zaten_davetli' };
    throw err;
  }
}

async function davetSil(allianceId, userId) {
  await pool.query(
    'DELETE FROM alliance_invites WHERE alliance_id = $1 AND user_id = $2',
    [allianceId, userId]);
}

/** Oyuncu birliğe girince ya da reddedince bütün davetleri düşer */
async function davetleriTemizle(userId) {
  await pool.query('DELETE FROM alliance_invites WHERE user_id = $1', [userId]);
}

module.exports = {
  pool, initDB, createUser, findUserByEmail, findUserById,
  loadAlliances, birlikKur, birlikSil, birlikAdDegistir,
  uyeEkle, uyeCikar, uyeRutbe, davetYaz, davetSil, davetleriTemizle,
  findUserByDisplayName, mesajYaz, mesajKutusu, mesajOkunmamisSayisi,
  mesajOkundu, mesajSil, engelEkle, engelKaldir, engelListesi, engelliMi,
  setDisplayName, loadDisplayNames, renameVillage,
  loadVillage, loadVillages, saveVillage, loadAllVillages,
  setCapital, deleteVillage, deleteUser,
  loadNpcVillages, saveNpcVillages, loadPlayerSlots, setPlayerSlot,
};
