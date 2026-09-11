/**
 * İSTATİSTİK EKRANI — dünya sıralamaları.
 *
 * Veri sunucudan `request_stats` ile TALEP ÜZERİNE gelir, her tick'te değil:
 * 200+ köyü dokuz ölçüde sıralamak her saniye yapılacak iş değil ve sıralama
 * saniyeler içinde anlamlı biçimde değişmiyor. Sekme açıkken periyodik
 * tazelenir.
 *
 * Savaş kalemleri (saldıran/savunan/yağmacı) kalıcı sayaçlardan gelir; oyun
 * yeniyse sıfır görünürler — bu doğru, savaş oldukça dolarlar.
 */
import { useEffect, useMemo, useState } from 'react';
import { C, FONT, panel, btn, label as lbl, num, short } from '../theme';
import Icon from './Icons';

const REFRESH_MS = 15000;

const KIND_COLOR = { self: '#c8ff8a', player: '#ff6f78', npc: C.iceSoft };

function Medal({ rank }) {
  const col = rank === 1 ? '#f2c86e' : rank === 2 ? '#cfd8e0' : rank === 3 ? '#cd8b5a' : null;
  if (!col) {
    return (
      <span style={num({
        fontSize: 10, color: C.textMute, width: 22, textAlign: 'center', flexShrink: 0,
      })}>{rank}</span>
    );
  }
  return (
    <span style={{
      width: 22, height: 22, borderRadius: 11, flexShrink: 0,
      display: 'grid', placeItems: 'center',
      background: `${col}22`, border: `1px solid ${col}88`,
    }}>
      <span style={num({ fontSize: 10, color: col, fontWeight: 600 })}>{rank}</span>
    </span>
  );
}

function Row({ r, unit, best, separated }) {
  const col = KIND_COLOR[r.kind] || C.text;
  const isSelf = r.kind === 'self';
  // Çubuk: birincinin değerine göre oran — sayılar çok farklı ölçekte olabiliyor
  const pct = best > 0 ? Math.max(2, Math.round((r.value / best) * 100)) : 0;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 9,
      padding: '6px 8px', borderRadius: 5,
      background: isSelf ? 'rgba(200,255,138,0.10)' : 'transparent',
      border: `1px solid ${isSelf ? 'rgba(200,255,138,0.35)' : 'transparent'}`,
      marginTop: separated ? 7 : 0,
      borderTop: separated ? `1px dashed ${C.lineSoft}` : undefined,
    }}>
      <Medal rank={r.rank} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: FONT.ui, fontSize: 11, color: isSelf ? '#e8ffcf' : C.text,
          fontWeight: isSelf ? 600 : 400,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {r.name}
          {/*
            ALT YAZI: oyuncu tablolarında kaç köyü olduğu, "En büyük köy"
            tablosunda köyün sahibi. Sunucu hangisi uygunsa onu yolluyor
            (bkz. server/game/istatistik.js).
          */}
          {r.sub && (
            <span style={{ color: C.textMute, fontSize: 9 }}> · {r.sub}</span>
          )}
          {isSelf && <span style={{ color: '#a8d97a', fontSize: 9 }}> · sen</span>}
        </div>
        <div style={{
          height: 3, borderRadius: 2, marginTop: 3,
          background: 'rgba(255,255,255,0.06)', overflow: 'hidden',
        }}>
          <div style={{ width: `${pct}%`, height: '100%', background: col, opacity: 0.75 }} />
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <span style={num({ fontSize: 12.5, color: isSelf ? '#e8ffcf' : C.frost })}>
          {short(r.value)}
        </span>
        <span style={{ fontFamily: FONT.ui, fontSize: 8, color: C.textMute, marginLeft: 3 }}>
          {unit}
        </span>
      </div>
    </div>
  );
}

function Board({ b }) {
  const best = b.rows[0]?.value || 0;
  const empty = b.rows.every(r => !r.value);

  return (
    /* Izgara düzeninde kart bölünmüyor; marginBottom da ızgara boşluğuyla
       çakışmasın diye kalktı (bkz. aşağıda gridTemplateColumns). */
    <div style={panel({ padding: 12 })}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
        <Icon name={b.icon} size={15} color={C.iceDeep} />
        <span style={{
          fontFamily: FONT.head, fontSize: 15, fontWeight: 600, letterSpacing: 0.6, color: C.frost,
        }}>{b.label}</span>
      </div>
      <div style={{
        fontFamily: FONT.ui, fontSize: 9, color: C.textMute, marginBottom: 9,
      }}>{b.desc}</div>

      {empty ? (
        <div style={{
          fontFamily: FONT.ui, fontSize: 10, color: C.textFaint,
          padding: '4px 2px 2px', lineHeight: 1.5,
        }}>
          Henüz kayıt yok — savaşlar oldukça dolar.
        </div>
      ) : (
        <div>
          {b.rows.map(r => <Row key={r.key} r={r} unit={b.unit} best={best} />)}
          {/* Oyuncu ilk ona giremediyse kendi satırı ayrıca, çizgiyle ayrılmış */}
          {!b.inTop && b.me && (
            <Row r={b.me} unit={b.unit} best={best} separated />
          )}
        </div>
      )}
    </div>
  );
}

export default function StatsScreen({ socket }) {
  const [data, setData] = useState(null);
  const [pending, setPending] = useState(true);
  /**
   * Sunucu `stats_snapshot` döndürmezse ekran sonsuza kadar "hesaplanıyor"
   * diyordu. Eski sunucu çalışıyorsa `request_stats` olayını kimse dinlemez;
   * bunu sessizce beklemek yerine söylemek gerekiyor.
   */
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!socket) return;
    let timer = null;
    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setTimedOut(true), 4000);
    };
    const onSnap = (d) => {
      clearTimeout(timer);
      setData(d); setPending(false); setTimedOut(false);
    };
    socket.on('stats_snapshot', onSnap);
    socket.emit('request_stats'); arm();
    const iv = setInterval(() => { socket.emit('request_stats'); arm(); }, REFRESH_MS);
    return () => {
      socket.off('stats_snapshot', onSnap);
      clearInterval(iv); clearTimeout(timer);
    };
  }, [socket]);

  const boards = data?.boards || [];

  /**
   * Verisi OLMAYAN tablo hiç gösterilmez. Savaş kalemleri ilk savaşa kadar
   * boş; "henüz kayıt yok" yazan üç kart sayfanın altında yer kaplamaktan
   * başka bir iş görmüyordu. Hangileri beklediğini tek satırlık bir not
   * söylüyor, veri gelince tablo kendiliğinden listeye giriyor.
   */
  const { ordered, hidden } = useMemo(() => {
    const has = (b) => b.rows.some(r => r.value > 0);
    return { ordered: boards.filter(has), hidden: boards.filter(b => !has(b)) };
  }, [boards]);

  /**
   * "En iyi derecen" rozeti yalnızca VERİSİ OLAN tablolara bakar. Boş bir
   * tabloda herkes sıfır olduğu için sıra rastgele oluşuyor ve rozet
   * anlamsız bir derece gösterebiliyordu.
   */
  const myRanks = useMemo(
    () => ordered.filter(b => b.me).map(b => ({ label: b.label, rank: b.me.rank })),
    [ordered]);
  const bestRank = myRanks.length ? Math.min(...myRanks.map(r => r.rank)) : null;
  const bestBoard = myRanks.find(r => r.rank === bestRank);

  if (pending && !data) {
    return (
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '40px 0' }}>
        <div style={panel({
          padding: 22, textAlign: 'center',
          border: timedOut ? `1px solid ${C.dangerDim}` : undefined,
          background: timedOut ? 'rgba(255,111,120,0.10)' : undefined,
        })}>
          {timedOut ? (
            <>
              <Icon name="uyari" size={20} color={C.danger} />
              <div style={{
                fontFamily: FONT.head, fontSize: 16, color: '#ffb8bd', marginTop: 8,
              }}>Sunucu yanıt vermedi</div>
              <div style={{
                fontFamily: FONT.ui, fontSize: 11, color: C.textDim,
                marginTop: 7, lineHeight: 1.7,
              }}>
                Sıralamalar sunucu tarafında hesaplanıyor; çalışan sürüm bu özelliği
                tanımıyor olabilir. <b>stop-tranord.bat</b> → <b>start-tranord-dev.bat</b>
                ile sunucuyu yeniden başlat, sonra sayfayı yenile (Ctrl+F5).
                <div style={{ marginTop: 6, color: C.textMute }}>
                  Kontrol: <code>http://localhost:3311/</code> adresinde
                  {' '}<code>"stats":true</code> yazıyorsa sunucu güncel.
                </div>
              </div>
              <button onClick={() => { setTimedOut(false); socket?.emit('request_stats'); }}
                style={btn('ghost', { marginTop: 12, padding: '6px 14px', fontSize: 9.5, letterSpacing: 1.2 })}>
                TEKRAR DENE
              </button>
            </>
          ) : (
            <span style={{ fontFamily: FONT.ui, fontSize: 11, color: C.textMute }}>
              sıralamalar hesaplanıyor…
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', paddingTop: 12, paddingBottom: 18 }}>
      {/* Üst şerit */}
      <div style={panel({
        padding: '11px 13px', marginBottom: 11,
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      })}>
        <Icon name="bonus" size={17} color={C.ice} />
        <span style={{
          fontFamily: FONT.head, fontSize: 17, fontWeight: 600, letterSpacing: 0.8, color: C.frost,
        }}>Dünya sıralamaları</span>
        <span style={{ fontFamily: FONT.ui, fontSize: 10, color: C.textMute }}>
          {data?.villageCount ?? 0} köy
        </span>
        {bestBoard && (
          <span style={{
            marginLeft: 'auto', padding: '3px 10px', borderRadius: 5,
            background: 'rgba(200,255,138,0.10)', border: '1px solid rgba(200,255,138,0.35)',
            fontFamily: FONT.ui, fontSize: 10, color: '#e8ffcf',
          }}>
            en iyi derecen: <b>{bestBoard.rank}.</b> — {bestBoard.label}
          </span>
        )}
        <button onClick={() => socket?.emit('request_stats')}
          style={btn('ghost', { padding: '4px 10px', fontSize: 9, letterSpacing: 1.1 })}>
          TAZELE
        </button>
      </div>

      {/**
        * SÜTUN düzeni (grid değil): grid'de satırın yüksekliği en uzun karta
        * göre belirleniyor ve "henüz kayıt yok" diyen tek satırlık kartlar
        * komşusunun boyuna uzayıp kocaman boşluk bırakıyordu. Sütun düzeninde
        * her kart kendi boyunda kalır ve bir sonraki kart hemen altına yapışır.
        */}
      {/*
        IZGARA, SÜTUN DEĞİL.

        `columnWidth` CSS sütunları kullanıyordu: kartlar önce SOL sütunu
        doldurup sağa geçiyor, yani 1-2-3 solda, 4-5-6 sağda diziliyordu.
        Tablolar sıralı (1 nüfus … 6 en büyük köy) ve oyuncu soldan sağa
        okuyor; sütun düzeninde 2. sırada gördüğü kart aslında 4. tabloydu.
        Izgara satır satır dolduğu için okuma sırası tablo sırasıyla aynı.
      */}
      <div style={{
        display: 'grid', gap: 11,
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        alignItems: 'start',
      }}>
        {ordered.map(b => <Board key={b.key} b={b} />)}
      </div>

      {hidden.length > 0 && (
        <div style={{
          marginTop: 4, padding: '8px 11px', borderRadius: 6,
          background: 'rgba(8,17,28,0.4)', border: `1px dashed ${C.lineSoft}`,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Icon name="savas" size={13} color={C.textMute} />
          <span style={{ fontFamily: FONT.ui, fontSize: 10, color: C.textMute }}>
            {hidden.map(b => b.label).join(' · ')} — ilk savaştan sonra listeye girer.
          </span>
        </div>
      )}
    </div>
  );
}
