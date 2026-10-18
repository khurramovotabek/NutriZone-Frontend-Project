/** Opens a notification's link: site paths in the app, absolute links (another Telegram bot…) in a new tab. */
export function openNotificationLink(link: string, push: (href: string) => void): void {
  if (/^https?:\/\//i.test(link)) window.open(link, "_blank", "noopener,noreferrer");
  else push(link);
}
