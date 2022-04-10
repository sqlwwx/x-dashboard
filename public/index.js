import './app.js'

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then(async registration => {
    if (registration.periodicSync) {
      Notification.requestPermission()
      const status = await navigator.permissions.query({name: 'periodic-background-sync'});
      if (status.state === 'granted') {
        await registration.periodicSync.register('sync-domains', {
          minInterval: 24 * 60 * 60 * 1000
        });
      }
    }
  })
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then((registration) => {
        console.log(registration)
        var serviceWorker;
        if (registration.installing) {
          serviceWorker = registration.installing;
          console.log('sw', 'installing');
        } else if (registration.waiting) {
          serviceWorker = registration.waiting;
          console.log('sw', 'waiting');
        } else if (registration.active) {
          serviceWorker = registration.active;
          console.log('sw', 'active');
        }
        if (serviceWorker) {
          console.log('sw', serviceWorker.state);
          serviceWorker.addEventListener('statechange', (e) => {
            console.log('sw', serviceWorker.state);
          });
        }
      }).catch(err => {
        console.error('sw', err)
      });
  })
}
