// NİHAİ STABİL KOD - 30 DAKİKADA BİR AFK ÖNLEME
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
// --- SÜRE DEĞİŞİKLİĞİ: GÜVENLİ MAKSİMUM SÜRE OLAN 30 DAKİKAYA AYARLANDI ---
const STAY_ALIVE_INTERVAL = 1800000; // 30 dakika (30 * 60 * 1000)

function getRandomDelay(min = 2000, max = 5000) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

client.on('ready', async () => {
  console.log(`✅ ${client.user.username} olarak giriş yapıldı!`);
  await joinChannel();
  setTimeout(stayActive, STAY_ALIVE_INTERVAL);
  
  // 24 saat sonra stabilite için yeniden başlat
  setTimeout(() => {
    console.log("♻️ 24 saatlik çalışma süresi doldu. Stabilite için otomatik yeniden başlatılıyor...");
    process.exit(0);
  }, 1000 * 60 * 60 * 24);
});

client.on('voiceStateUpdate', (oldState, newState) => {
  if (oldState.id === client.user.id && oldState.channelID && !newState.channelID) {
    console.log(`⚠️ Ses kanalından düşüldü. Olay algılandı, yeniden bağlanılıyor...`);
    if(voiceConnection) voiceConnection.destroy?.();
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
    if (channel && channel.type === 'voice') {
      voiceConnection = await channel.join();
      console.log(`🎧 "${channel.name}" kanalına başarıyla bağlandı!`);
    } else {
      console.error(`❌ HATA: Kanal bulunamadı veya bu bir ses kanalı değil.`);
    }
  } catch (error) {
    console.error(`❌ Bağlanma hatası:`, error.message);
    setTimeout(joinChannel, RECONNECT_DELAY);
  }
}

async function stayActive() {
  const isConnected = voiceConnection && voiceConnection.channel && voiceConnection.channel.members.has(client.user.id);
  console.log(`📢 Aktif Kalma Kontrolü: Gerçek bağlantı durumu: ${isConnected ? 'Bağlı' : 'Kopuk'}`);

  if (!isConnected) {
    console.log(`📢 Bağlantı kopuk görünüyor. Yeniden bağlanma tetikleniyor.`);
    await joinChannel();
  } else {
    console.log(`📢 AFK önleme: "${voiceConnection.channel.name}" kanalından çıkıp tekrar giriliyor...`);
    try {
      const currentChannel = voiceConnection.channel;
      await currentChannel.leave();
      voiceConnection.destroy?.(); 
      voiceConnection = null;
      console.log(`📢 Başarıyla kanaldan ayrıldı. Kısa bir süre bekleniyor...`);
      await new Promise(resolve => setTimeout(resolve, getRandomDelay()));
      voiceConnection = await currentChannel.join();
      console.log(`📢 Başarıyla kanala tekrar girildi.`);
    } catch(error) {
        console.error(`📢 AFK önleme (çık-gir) hatası:`, error.message);
    }
  }
  
  setTimeout(stayActive, STAY_ALIVE_INTERVAL);
}

const token = process.env.TOKEN;
if (!token) {
  console.error("❌ HATA: TOKEN bulunamadı!");
} else {
  client.login(token).catch(err => {
    console.error("❌ Giriş yapılamadı! Token geçersiz olabilir:", err.message);
  });
}

process.on('unhandledRejection', error => console.error('❌ YAKALANAMAYAN HATA:', error));
process.on('uncaughtException', error => console.error('❌ YAKALANAMAYAN HATA:', error));

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot aktif ve seste!');
}).listen(3000);
