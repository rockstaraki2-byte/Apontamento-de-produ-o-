self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();

      const scope = new URL(self.registration.scope);
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      await Promise.all(
        clients.map(async (client) => {
          try {
            const clientUrl = new URL(client.url);
            if (
              clientUrl.origin === scope.origin &&
              clientUrl.pathname.startsWith(scope.pathname) &&
              !clientUrl.pathname.startsWith("/api/") &&
              !clientUrl.pathname.startsWith("/firebase-cloud-messaging-push-scope")
            ) {
              await client.navigate(client.url);
            }
          } catch (error) {
            console.warn("Não foi possível atualizar uma aba antiga:", error);
          }
        }),
      );
    })(),
  );
});
