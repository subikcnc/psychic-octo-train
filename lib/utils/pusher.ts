import Pusher from "pusher";

// Instantiate the pusher
export const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!, // Pusher app identifier (server side only)
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!, // Public key, used by browser to connect
  secret: process.env.PUSHER_SECRET!, // secret key, server side only, used to authenticate events
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true, // Ensures communication is encrypted over HTTPS/WSS
});
