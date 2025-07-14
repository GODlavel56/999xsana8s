// UZUN SÜRELİ STABİLİTE İÇİN GELİŞTİRİLMİŞ KOD
const http = require('http');
const { Client } = require('discord.js-self');
require('dotenv').config();

const client = new Client();
let voiceConnection = null;
const RECONNECT_DELAY = 15000; // Yeniden bağlanma bekleme süresini 15 saniyeye çıkardık

// --- YENİ: Daha "insansı" zamanlama için ---
// Her 3 ila 5 dakika arasında rastgele bir zamanda "aktif kalma" sinyali gönderir.
function getRandomStayAliveInterval() {
  const min = 3 * 60 * 1000; // 3 dakika
  const max = 5 * 60 * 1000; // 5 dakika
  return Math.floor(Math.random() * (max - min + 1) + min);
}

client.on('ready', async () => {
  console.log(`✅ ${client.user.username} olarak giriş yapıldı!`);
  await joinChannel();
  // İlk "aktif kalma" kontrolünü rastgele bir süre sonra başlat
  setTimeout(stayActive, getRandomStayAliveInterval());
});

client.on('voiceStateUpdate', (oldState, newState) => {
  if (oldState.id === client.user.id && oldState.channelID && !newState.channelID) {
    console.log(`⚠️ Ses kanalından bağlantı koptu. Olay algılandı, yeniden bağlanılıyor...`);
    voiceConnection = null;
    setTimeout(joinChannel, RECONNECT_DELAY);
  }
});

async function joinChannel() {
  // Eğer zaten bağlıysak tekrar denemeye gerek yok
  if (voiceConnection && voiceConnection.channel) {
    console.log(`ℹ️ Zaten bir kanalda. Yeniden bağlanma işlemi atlandı.`);
    return;
  }
  
  console.log(`🔗 Ses kanalına bağlanma deneniyor...`);
  const voiceChannelId = process.env.VOICE_CHANNEL_ID;
  if (!voiceChannelId) return console.error("❌ HATA: VOICE_CHANNEL_ID ortam değişkeni bulunamadı!");
  
  try {
    const channel = await client.channels.fetch(voiceChannelId);
    if (channel && channel.type === 'voice') {
      voiceConnection = await channel.join();
      console.log(`🎧 "${channel.name}" kanalına başarıyla bağlandı!`);
    } else {
      console.error(`❌ HATA: Kanal bulunamadı veya bu bir ses kanalı değil.`);
    }
  } catch (error) {
    console.error(`❌ Bağlanma hatası:`, error.message);
    // Başarısız olursa bir süre sonra tekrar dene
    setTimeout(joinChannel, RECONNECT_DELAY);
  }
}

// --- YENİ: Kendi kendini kontrol eden ve iyileştiren "Aktif Kalma" fonksiyonu ---
async function stayActive() {
  // 1. Bağlantı var mı diye kontrol et
  if (!voiceConnection || !voiceConnection.channel) {
    console.log(`📢 Aktif Kalma Kontrolü: Bağlantı kopuk görünüyor. Yeniden bağlanma tetikleniyor.`);
    await joinChannel();
  } else {
    // 2. Bağlantı varsa, "konuşuyor" sinyali gönder
    try {
      console.log(`📢 Aktif Kalma Kontrolü: Bağlantı yerinde. "Konuşuyor" sinyali gönderiliyor.`);
      voiceConnection.setSpeaking(true);
      setTimeout(() => {
        if (voiceConnection) voiceConnection.setSpeaking(false);
      }, 500);
    } catch (error) {
      console.error(`📢 'Aktif Kalma' sinyali hatası:`, error.message);
    }
  }
  
  // 3. Bir sonraki kontrol için tekrar rastgele bir zamanlayıcı kur
  setTimeout(stayActive, getRandomStayAliveInterval());
}

const token = process.env.TOKEN;
if (!token) {
  console.error("❌ HATA: TOKEN ortam değişkeni bulunamadı!");
} else {
  client.login(token).catch(err => {
    console.error("❌ Giriş yapılamadı! Token geçersiz olabilir. Hata:", err.message);
  });
}

// Olası çökmeleri yakalamak için eklenen güvenlik önlemleri
process.on('unhandledRejection', error => {
  console.error('❌ YAKALANAMAYAN HATA (unhandledRejection):', error);
});
process.on('uncaughtException', error => {
  console.error('❌ YAKALANAMAYAN HATA (uncaughtException):', error);
});

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot aktif ve seste!');
}).listen(3000);
