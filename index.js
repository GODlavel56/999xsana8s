// SON VERSİYON - Mesaj Çökmesi ve Yeniden Bağlanma Hataları Düzeltildi
const http = require('http');
// YENİ: Intents modülünü dahil ediyoruz
const { Client, Intents } = require('discord.js-self');
require('dotenv').config();

// YENİ: İstemciyi sadece gerekli İZİNLERLE (Intents) başlatıyoruz.
// Bu, mesajları görmesini ve çökmesini engeller.
const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_VOICE_STATES],
  ws: {
    properties: {
      os: "iOS",
      browser: "Discord iOS",
      device: "iPhone",
    }
  },
  checkUpdate: false
});

let voiceConnection = null;
const RECONNECT_DELAY = 15000;
const STAY_ALIVE_INTERVAL = 180000; // 3 dakika

function getRandomDelay(min = 2000, max = 5000) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

client.on('ready', async () => {
  console.log(`✅ ${client.user.username} olarak giriş yapıldı!`);
  await joinChannel();
  setTimeout(stayActive, STAY_ALIVE_INTERVAL);
  
  setTimeout(() => {
    console.log("♻️ 24 saatlik çalışma süresi doldu. Stabilite için yeniden başlatılıyor...");
    process.exit(0);
  }, 1000 * 60 * 60 * 24);
});

client.on('voiceStateUpdate', (oldState, newState) => {
  if (oldState.id === client.user.id && oldState.channelID && !newState.channelID) {
    console.log(`⚠️ Ses kanalından düşüldü. Olay algılandı, yeniden bağlanılıyor...`);
    voiceConnection?.destroy?.();
    voiceConnection = null;
    setTimeout(joinChannel, RECONNECT_DELAY);
  }
});

async function joinChannel(retryCount = 3) {
  if (voiceConnection && voiceConnection.channel) return;
  
  console.log(`🔗 Ses kanalına bağlanma deneniyor... (Kalan deneme: ${retryCount})`);
  const voiceChannelId = process.env.VOICE_CHANNEL_ID;
  if (!voiceChannelId) return console.error("❌ HATA: VOICE_CHANNEL_ID bulunamadı!");
  
  try {
    const channel = await client.channels.fetch(voiceChannelId);
    if (channel?.type === 'voice') {
      voiceConnection = await channel.join();
      console.log(`🎧 "${channel.name}" kanalına başarıyla bağlandı.`);
    } else {
      console.error("❌ HATA: Kanal bulunamadı veya bu bir ses kanalı değil.");
    }
  } catch (error) {
    console.error(`❌ Bağlanma hatası:`, error.message);
    // YENİ: Başarısız olursa ve deneme hakkı varsa, tekrar dener.
    if (retryCount > 0) {
      console.log(`${retryCount - 1} deneme hakkı kaldı. ${RECONNECT_DELAY / 1000} saniye sonra tekrar denenecek.`);
      setTimeout(() => joinChannel(retryCount - 1), RECONNECT_DELAY);
    }
  }
}

async function stayActive() {
  const isConnected = voiceConnection?.channel?.members?.has(client.user.id);
  console.log(`📢 Aktif Kalma Kontrolü: Gerçek bağlantı durumu: ${isConnected ? 'Bağlı' : 'Kopuk'}`);

  if (!isConnected) {
    console.log("📢 Bağlantı kopuk görünüyor. Yeniden bağlanma tetikleniyor.");
    await joinChannel();
  } else {
    try {
      const currentChannel = voiceConnection.channel;
      console.log(`📢 AFK önleme: "${currentChannel.name}" kanalından çıkılıyor...`);
      await currentChannel.leave();
      voiceConnection?.destroy?.();
      voiceConnection = null;
      console.log(`📢 Başarıyla ayrıldı. Geri girmek için bekleniyor...`);
      await new Promise(resolve => setTimeout(resolve, getRandomDelay()));
      // YENİ: Yeniden bağlanmayı inatçı bir şekilde dene
      await joinChannel();
    } catch (error) {
        console.error("📢 AFK önleme (çık-gir) hatası:", error.message);
    }
  }
  
  setTimeout(stayActive, STAY_ALIVE_INTERVAL);
}

const token = process.env.TOKEN;
if (token) {
  client.login(token).catch(err => console.error("❌ Giriş yapılamadı! Token geçersiz olabilir:", err.message));
} else {
  console.error("❌ HATA: TOKEN ortam değişkeni bulunamadı!");
}

process.on('unhandledRejection', error => console.error('❌ YAKALANAMAYAN HATA (Promise):', error));
process.on('uncaughtException', error => {
  console.error('❌ YAKALANAMAYAN HATA (Genel):', error);
  process.exit(1);
});

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot aktif ve seste!');
}).listen(3000);
