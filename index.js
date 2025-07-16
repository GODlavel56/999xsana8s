// AFK ÖNLEME MEKANİZMASI TAMAMEN KALDIRILMIŞ TEST KODU
const http = require('http');
const { Client } = require('discord.js-self');
require('dotenv').config();

const client = new Client({
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

client.on('ready', async () => {
  console.log(`✅ ${client.user.username} olarak giriş yapıldı!`);
  await joinChannel();
  
  // Günlük restart özelliği stabilite için kalmaya devam ediyor
  setTimeout(() => {
    console.log("♻️ 24 saatlik çalışma süresi doldu. Stabilite için otomatik yeniden başlatılıyor...");
    process.exit(0);
  }, 1000 * 60 * 60 * 24);
});

// Bu kısım, botun birisi tarafından manuel atılması veya bağlantısının anlık kopması durumunda çalışır.
// AFK nedeniyle atılmasını engellemez.
client.on('voiceStateUpdate', (oldState, newState) => {
  if (oldState.id === client.user.id && oldState.channelID && !newState.channelID) {
    console.log(`⚠️ Ses kanalından düşüldü. Olay algılandı, yeniden bağlanılıyor...`);
    voiceConnection?.destroy?.();
    voiceConnection = null;
    setTimeout(joinChannel, RECONNECT_DELAY);
  }
});

async function joinChannel() {
  if (voiceConnection && voiceConnection.channel) return;

  console.log(`🔗 Ses kanalına bağlanma deneniyor...`);
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
    console.error(`❌ Kanal bağlanma hatası:`, error.message);
    setTimeout(joinChannel, RECONNECT_DELAY);
  }
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
  res.end('Bot aktif ve seste! (AFK Koruması Kapalı)');
}).listen(3000);
