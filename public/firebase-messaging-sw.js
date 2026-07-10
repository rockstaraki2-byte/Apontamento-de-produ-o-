// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDRpewaM4RFTwZGzkOmDUyUwShMyko4RAM",
  authDomain: "gen-lang-client-0901917587.firebaseapp.com",
  projectId: "gen-lang-client-0901917587",
  storageBucket: "gen-lang-client-0901917587.firebasestorage.app",
  messagingSenderId: "369735330922",
  appId: "1:369735330922:web:6b091c6e7f3480bc6aee13"
});

const messaging = firebase.messaging();

// ATENÇÃO (Evitar Duplicidade)
// Quando o payload disparado pelo backend inclui o bloco superior "notification"
// ou "webpush.notification", o próprio SDK do Firebase compat Web Push exibe a 
// notificação garantindo integração nativa com Android / PWA.
// Se além disso nós chamarmos explicitamente showNotification() aqui dentro,
// o celular exibirá DOIS banners idênticos.
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Recebido payload no background: ', payload);
  
  // Condicional de segurança para evitar duplicidade.
  // Se o payload já trouxer dados root de notificação, o SDK já irá exibir. Não fazemos nada manualmente.
  if (!payload.notification) {
    console.log('[firebase-messaging-sw.js] Tipo de payload é "Data-only". Exibindo manualmente.');
    const notificationTitle = payload.data?.title || 'Nova Notificação';
    const notificationOptions = {
      body: payload.data?.body || 'Você tem uma nova comunicação.',
      icon: payload.data?.icon || '/icon.png',
      data: payload.data,
      requireInteraction: true 
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
  } else {
    console.log('[firebase-messaging-sw.js] Payload "Notification". Firebase SDK nativo responsável por renderizar.');
  }
});

// Remover o evento manual 'notificationclick' garante que possamos usar 'fcmOptions.link'
// no backend, que roteia a tab do app PWA / browser via lógica padrão e evita abrir abas duplicadas na home.
