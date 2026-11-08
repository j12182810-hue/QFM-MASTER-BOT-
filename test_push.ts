import webpush from "web-push";

const vapidKeys = {
  publicKey: "BNrw3q2Gxd1gCgywzEOpDPkMfswhJ3zN5LAH4PF5bDcCgrbbfJwb08I7JdGAprx1fTk_pdabOU5ckjUFl-zrmWM",
  privateKey: "fp813cHgeAgFpC-1-w-52gZ3DFDJwcF0DWWe5ofzsPY"
};
webpush.setVapidDetails(
  'mailto:support@qfm-bot.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

const sub = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/cAs-E21Mwew:APA91bEn3-7GGDdlEeA8bpyL_Mz6jvHCHUXk81DIfcwQhpXJyJIhJ2xhWEJM7MPfUpogHgESkYNH46JHuo7GN6XWbjV2dWDEQv7K3O5Pe91NZDLHa9b8mp7UCaq2Vz2UwdcuZmmQbr9R',
  keys: {
    p256dh: 'BHzzHlnmkRWswYrw4nUAqeO8KPJSdXNxNWvjtqIdkCXex0MG3idunMJQa6hKp3iY-6_xoUctxymJCuG3vFE4nc0',
    auth: 'l-Xn9IKPRLWc6ueOiQlIbg'
  }
};

webpush.sendNotification(sub, "test")
  .then(() => console.log("Success"))
  .catch(e => {
    console.error("Error name:", e.name);
    console.error("Error message:", e.message);
    console.error("Error statusCode:", e.statusCode);
    console.error("Error body:", e.body);
  });
